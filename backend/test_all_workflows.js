const http = require("http");
const app = require("./app");
const pool = require("./config/db");

let server;

async function runEndToEndTests() {
  console.log("==================================================");
  console.log("🚀 STARTING FULL E2E WORKFLOW VERIFICATION SUITE");
  console.log("==================================================\n");

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  async function req(path, method = "GET", body = null, token = null) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${baseUrl}${path}`, opts);
    const data = await res.json();
    return { status: res.status, data };
  }

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = "") {
    if (condition) {
      console.log(`  ✅ [PASS] ${name} ${details}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${details}`);
      failed++;
    }
  }

  try {
    // -----------------------------------------------------------------
    // 1. PUBLIC DISCOVERY & SEARCH FILTERS
    // -----------------------------------------------------------------
    console.log("--- 1. Testing Discovery & Search API ---");
    const health = await req("/health");
    assert("Health check returns 200", health.status === 200 && health.data.success);

    const categoriesRes = await req("/categories");
    assert("Categories returned", categoriesRes.status === 200 && categoriesRes.data.categories?.length >= 5, `(${categoriesRes.data.categories?.length} categories)`);

    const skillsRes = await req("/skills");
    assert("Skills returned", skillsRes.status === 200 && skillsRes.data.skills?.length >= 10, `(${skillsRes.data.skills?.length} skills)`);

    const servicesFilter = await req("/services?city=Mumbai&min_price=100&max_price=5000");
    assert("Services filter by city & price range", servicesFilter.status === 200 && Array.isArray(servicesFilter.data.services));

    const productsFilter = await req("/products?min_price=50&max_price=10000");
    assert("Products filter by price range", productsFilter.status === 200 && Array.isArray(productsFilter.data.products));

    // Get an entrepreneur by ID
    const sampleEpRes = await pool.query("SELECT id FROM entrepreneur_profiles LIMIT 1");
    const sampleEpId = sampleEpRes.rows[0].id;

    const epProfileRes = await req(`/entrepreneurs/${sampleEpId}`);
    assert(
      "Entrepreneur profile returns complete details with skills & availability",
      epProfileRes.status === 200 &&
      Array.isArray(epProfileRes.data.entrepreneur?.skills) &&
      Array.isArray(epProfileRes.data.entrepreneur?.availability) &&
      Array.isArray(epProfileRes.data.entrepreneur?.services) &&
      Array.isArray(epProfileRes.data.entrepreneur?.products)
    );

    // -----------------------------------------------------------------
    // 2. AUTHENTICATION (ALL 3 ROLES)
    // -----------------------------------------------------------------
    console.log("\n--- 2. Testing Authentication ---");
    const adminLogin = await req("/auth/login", "POST", { email: "admin@hunarhub.com", password: "admin123" });
    assert("Admin login succeeds", adminLogin.status === 200 && !!adminLogin.data.token);
    const adminToken = adminLogin.data.token;

    const epLogin = await req("/auth/login", "POST", { email: "ramesh@hunarhub.com", password: "password123" });
    assert("Entrepreneur login succeeds", epLogin.status === 200 && !!epLogin.data.token);
    const epToken = epLogin.data.token;

    const custLogin = await req("/auth/login", "POST", { email: "ananya@hunarhub.com", password: "password123" });
    assert("Customer login succeeds", custLogin.status === 200 && !!custLogin.data.token);
    const custToken = custLogin.data.token;

    // -----------------------------------------------------------------
    // 3. ENTREPRENEUR WORKFLOWS (SKILLS, REVIEWS, SCHEDULE)
    // -----------------------------------------------------------------
    console.log("\n--- 3. Testing Entrepreneur Features & Skills Management ---");
    const mySkillsRes = await req("/entrepreneurs/skills", "GET", null, epToken);
    assert("Entrepreneur fetches own skills", mySkillsRes.status === 200 && Array.isArray(mySkillsRes.data.skills));

    // Find a skill not yet added
    const testSkill = skillsRes.data.skills[0];
    const addSkillRes = await req("/entrepreneurs/skills", "POST", { skill_id: testSkill.id }, epToken);
    assert("Entrepreneur adds skill to profile", addSkillRes.status === 201 && addSkillRes.data.success);

    const mySkillsAfterAdd = await req("/entrepreneurs/skills", "GET", null, epToken);
    const hasAddedSkill = mySkillsAfterAdd.data.skills?.some(s => Number(s.id) === Number(testSkill.id));
    assert("Added skill appears in entrepreneur skills list", hasAddedSkill);

    const deleteSkillRes = await req(`/entrepreneurs/skills/${testSkill.id}`, "DELETE", null, epToken);
    assert("Entrepreneur removes skill from profile", deleteSkillRes.status === 200 && deleteSkillRes.data.success);

    const myReviewsRes = await req("/entrepreneurs/my/reviews", "GET", null, epToken);
    assert("Entrepreneur fetches own verified customer reviews", myReviewsRes.status === 200 && Array.isArray(myReviewsRes.data.reviews));

    // -----------------------------------------------------------------
    // 4. CUSTOMER ORDER & DIRECT PAYMENT SETTLEMENT WORKFLOW
    // -----------------------------------------------------------------
    console.log("\n--- 4. Testing Customer Order & Direct Payment Settlement ---");
    const productList = await req("/products");
    const productToBuy = productList.data.products[0];

    const createOrderRes = await req("/orders", "POST", {
      items: [{ product_id: productToBuy.id, quantity: 1 }],
      shipping_address: "123 Marine Drive, Nariman Point, Mumbai 400021"
    }, custToken);
    assert("Customer creates product order", createOrderRes.status === 201 && createOrderRes.data.order?.id);
    const testOrderId = createOrderRes.data.order?.id;

    const paymentOrderRes = await req("/payments/create-order", "POST", { order_id: testOrderId }, custToken);
    assert("Create payment order responds cleanly", paymentOrderRes.status === 201 && paymentOrderRes.data.success);

    const verifyPaymentRes = await req("/payments/verify", "POST", {
      order_id: testOrderId,
      payment_method: "DIRECT_UPI"
    }, custToken);
    assert("Verify direct payment completes and returns success", verifyPaymentRes.status === 200 && verifyPaymentRes.data.success);

    const checkOrderDb = await pool.query("SELECT payment_status, status FROM orders WHERE id = $1", [testOrderId]);
    assert(
      "Order status updated in database to PAID & CONFIRMED",
      checkOrderDb.rows[0].payment_status === "PAID" && checkOrderDb.rows[0].status === "CONFIRMED",
      `(${checkOrderDb.rows[0].payment_status}, ${checkOrderDb.rows[0].status})`
    );

    // -----------------------------------------------------------------
    // 5. SERVICE REQUEST WORKFLOW & SETTLEMENT
    // -----------------------------------------------------------------
    console.log("\n--- 5. Testing Service Booking & Quote Lifecycle ---");
    const servicesList = await req("/services");
    const serviceToBook = servicesList.data.services[0];

    const createServiceReq = await req("/service-requests", "POST", {
      service_id: serviceToBook.id,
      title: "Urgent Handcrafted Restoration Request",
      description: "Need prompt inspection and repair at doorstep",
      address: "Bandra West, Mumbai",
      requested_date: new Date(Date.now() + 86400000).toISOString()
    }, custToken);
    const testSrId = createServiceReq.data.request?.id || createServiceReq.data.service_request?.id;
    assert("Customer creates service request", createServiceReq.status === 201 && !!testSrId, `(Service Request ID: ${testSrId})`);

    // Direct status update or acceptance
    await pool.query("UPDATE service_requests SET status = 'ACCEPTED', estimated_price = 450 WHERE id = $1", [testSrId]);

    const payServiceRes = await req("/payments/verify", "POST", {
      service_request_id: testSrId,
      payment_method: "DIRECT_UPI"
    }, custToken);
    assert("Service request payment verified via Direct UPI", payServiceRes.status === 200 && payServiceRes.data.success);

    const checkSrDb = await pool.query("SELECT status FROM service_requests WHERE id = $1", [testSrId]);
    assert("Service request transitioned to IN_PROGRESS upon payment", checkSrDb.rows[0].status === "IN_PROGRESS");

    // -----------------------------------------------------------------
    // 6. ADMIN GOVERNANCE & TAXONOMY MANAGEMENT
    // -----------------------------------------------------------------
    console.log("\n--- 6. Testing Admin Governance & Taxonomy CRUD ---");
    // Create new Category
    const createCatRes = await req("/categories", "POST", {
      name: "Test Artisan Guild",
      description: "Traditional guild for rare trades",
      icon_url: "Award"
    }, adminToken);
    assert("Admin creates new category", createCatRes.status === 201 && createCatRes.data.category?.id);
    const testCatId = createCatRes.data.category?.id;

    // Update Category
    const updateCatRes = await req(`/categories/${testCatId}`, "PUT", {
      name: "Updated Artisan Guild",
      description: "Updated description for test guild",
      icon_url: "Award"
    }, adminToken);
    assert("Admin updates category", updateCatRes.status === 200 && updateCatRes.data.category?.name === "Updated Artisan Guild");

    // Create new Skill
    const createSkillRes = await req("/skills", "POST", {
      category_id: testCatId,
      name: "Hand Loom Weaving",
      description: "Traditional manual loom craftsmanship"
    }, adminToken);
    assert("Admin creates skill under category", createSkillRes.status === 201 && createSkillRes.data.skill?.id);
    const testCreatedSkillId = createSkillRes.data.skill?.id;

    // Delete Skill
    const delSkillRes = await req(`/skills/${testCreatedSkillId}`, "DELETE", null, adminToken);
    assert("Admin deletes skill", delSkillRes.status === 200 && delSkillRes.data.success);

    // Delete Category
    const delCatRes = await req(`/categories/${testCatId}`, "DELETE", null, adminToken);
    assert("Admin deletes category", delCatRes.status === 200 && delCatRes.data.success);

    // Toggle Trust Badges
    const badgeRes = await req(`/admin/entrepreneurs/${sampleEpId}/verification`, "PUT", {
      is_identity_verified: true,
      is_phone_verified: true,
      is_artisan_verified: true,
      is_business_verified: true
    }, adminToken);
    assert("Admin updates artisan trust badges", badgeRes.status === 200 && badgeRes.data.success);

    // Admin Reports & Analytics
    const reportsRes = await req("/admin/analytics", "GET", null, adminToken);
    assert("Admin reports & analytics data returned", reportsRes.status === 200 && Array.isArray(reportsRes.data.analytics?.monthly_sales));

    // -----------------------------------------------------------------
    // SUMMARY
    // -----------------------------------------------------------------
    console.log("\n==================================================");
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");
    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("💥 Unhandled Test Suite Exception:", err);
    process.exitCode = 1;
  } finally {
    server.close();
    await pool.end();
  }
}

runEndToEndTests();
