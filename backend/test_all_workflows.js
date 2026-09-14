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
  const baseUrl = `http://localhost:${port}/api`;
  const rawBaseUrl = `http://localhost:${port}`;

  async function req(path, method = "GET", body = null, token = null) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const fullUrl = path.startsWith("http") ? path : `${baseUrl}${path}`;
    const res = await fetch(fullUrl, opts);
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
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
    // 1. API PREFIX STANDARDIZATION
    // -----------------------------------------------------------------
    console.log("--- 1. Testing API Prefix Standardization ---");
    const rootRes = await fetch(`${rawBaseUrl}/`);
    const rootData = await rootRes.json();
    assert("Root returns welcome message", rootRes.status === 200 && rootData.message === "Welcome to HunarHub API");

    const nonPrefixed = await fetch(`${rawBaseUrl}/categories`);
    assert("Non-prefixed /categories returns 404", nonPrefixed.status === 404);

    const prefixedCat = await req("/categories");
    assert("Canonical /api/categories returns 200", prefixedCat.status === 200 && Array.isArray(prefixedCat.data.categories));

    const health = await req("/health");
    assert("Health check /api/health returns 200", health.status === 200 && health.data.success);

    // -----------------------------------------------------------------
    // 2. PUBLIC DISCOVERY & SEARCH FILTERS
    // -----------------------------------------------------------------
    console.log("\n--- 2. Testing Discovery & Search API ---");
    const categoriesRes = await req("/categories");
    assert("Categories returned", categoriesRes.status === 200 && categoriesRes.data.categories?.length >= 5, `(${categoriesRes.data.categories?.length} categories)`);

    const skillsRes = await req("/skills");
    assert("Skills returned", skillsRes.status === 200 && skillsRes.data.skills?.length >= 10, `(${skillsRes.data.skills?.length} skills)`);

    const servicesFilter = await req("/services?city=Mumbai&min_price=100&max_price=5000");
    assert("Services filter by city & price range", servicesFilter.status === 200 && Array.isArray(servicesFilter.data.services));

    const productsFilter = await req("/products?min_price=50&max_price=10000");
    assert("Products filter by price range", productsFilter.status === 200 && Array.isArray(productsFilter.data.products));

    // Get an entrepreneur by ID
    const sampleEpRes = await pool.query("SELECT id FROM entrepreneur_profiles WHERE verification_status = 'APPROVED' LIMIT 1");
    const sampleEpId = sampleEpRes.rows[0]?.id || 1;

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
    // 3. AUTHENTICATION (ALL 3 ROLES) & ADMIN PROTECTION
    // -----------------------------------------------------------------
    console.log("\n--- 3. Testing Authentication & Role Guard ---");
    const adminLogin = await req("/auth/login", "POST", { email: "admin@hunarhub.com", password: "admin123" });
    assert("Admin login succeeds", adminLogin.status === 200 && !!adminLogin.data.token);
    const adminToken = adminLogin.data.token;

    const epLogin = await req("/auth/login", "POST", { email: "ramesh@hunarhub.com", password: "password123" });
    assert("Entrepreneur login succeeds", epLogin.status === 200 && !!epLogin.data.token);
    const epToken = epLogin.data.token;

    const custLogin = await req("/auth/login", "POST", { email: "ananya@hunarhub.com", password: "password123" });
    assert("Customer login succeeds", custLogin.status === 200 && !!custLogin.data.token);
    const custToken = custLogin.data.token;

    // Public registration attempting to claim ADMIN role must be rejected
    const badAdminReg = await req("/auth/register", "POST", {
      full_name: "Attacker Admin",
      email: `evil_admin_${Date.now()}@test.com`,
      phone: "99" + String(Date.now()).slice(-8),
      password: "password123",
      role: "ADMIN"
    });
    assert("Public registration cannot claim ADMIN role", badAdminReg.status === 400);

    // -----------------------------------------------------------------
    // 4. ENTREPRENEUR VERIFICATION GATE (PENDING -> APPROVED)
    // -----------------------------------------------------------------
    console.log("\n--- 4. Testing Entrepreneur Verification Gate ---");
    const uniqueTs = Date.now();
    const newEntPhone = "98" + String(uniqueTs).slice(-8);
    const entReg = await req("/auth/register", "POST", {
      full_name: "Unverified Potter",
      email: `potter_${uniqueTs}@test.com`,
      phone: newEntPhone,
      password: "password123",
      role: "ENTREPRENEUR",
      business_name: `Potter Studio ${uniqueTs}`,
      city: "Jaipur",
      address: "Clay Lane 5"
    });
    assert("New entrepreneur registers with PENDING status", entReg.status === 201 && entReg.data.entrepreneur?.verification_status === "PENDING");
    const newEpId = entReg.data.entrepreneur?.id;
    const newEpToken = entReg.data.token;

    // Must NOT be visible in public discoverable list
    const publicEpsBefore = await req("/entrepreneurs?city=Jaipur");
    const isFoundBefore = publicEpsBefore.data.entrepreneurs?.some(e => Number(e.id) === Number(newEpId));
    assert("PENDING entrepreneur is NOT publicly discoverable", !isFoundBefore);

    // Admin approves entrepreneur
    const approveRes = await req(`/admin/entrepreneurs/${newEpId}/approve`, "PUT", null, adminToken);
    assert("Admin approves entrepreneur profile", approveRes.status === 200 && approveRes.data.entrepreneur?.verification_status === "APPROVED");

    // Must now be visible in public list
    const publicEpsAfter = await req("/entrepreneurs?city=Jaipur");
    const isFoundAfter = publicEpsAfter.data.entrepreneurs?.some(e => Number(e.id) === Number(newEpId));
    assert("APPROVED entrepreneur IS now publicly discoverable", isFoundAfter);

    // -----------------------------------------------------------------
    // 5. ENTREPRENEUR SKILLS & REVIEWS MANAGEMENT
    // -----------------------------------------------------------------
    console.log("\n--- 5. Testing Entrepreneur Features & Skills Management ---");
    const mySkillsRes = await req("/entrepreneurs/skills", "GET", null, epToken);
    assert("Entrepreneur fetches own skills", mySkillsRes.status === 200 && Array.isArray(mySkillsRes.data.skills));

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
    // 6. PRODUCT ORDER & STOCK CONCURRENCY WORKFLOW
    // -----------------------------------------------------------------
    console.log("\n--- 6. Testing Product Order & Stock Safety ---");
    const productList = await req("/products");
    const productToBuy = productList.data.products[0];

    // Check initial stock
    const stockBefore = await pool.query("SELECT stock_quantity FROM products WHERE id = $1", [productToBuy.id]);
    const initialStock = stockBefore.rows[0].stock_quantity;

    // Over-stock order must fail with 409
    const overStockRes = await req("/orders", "POST", {
      items: [{ product_id: productToBuy.id, quantity: initialStock + 9999 }],
      shipping_address: "123 Marine Drive, Mumbai"
    }, custToken);
    assert("Order exceeding stock quantity is rejected (409)", overStockRes.status === 409);

    // Valid order
    const createOrderRes = await req("/orders", "POST", {
      items: [{ product_id: productToBuy.id, quantity: 1 }],
      shipping_address: "123 Marine Drive, Nariman Point, Mumbai 400021"
    }, custToken);
    assert("Customer creates product order with atomicity", createOrderRes.status === 201 && createOrderRes.data.order?.id);
    const testOrderId = createOrderRes.data.order?.id;

    // Stock must be reduced by exactly 1
    const stockAfter = await pool.query("SELECT stock_quantity FROM products WHERE id = $1", [productToBuy.id]);
    assert("Stock reduced atomically in database", stockAfter.rows[0].stock_quantity === initialStock - 1);

    const paymentOrderRes = await req("/payments/create-order", "POST", { order_id: testOrderId }, custToken);
    assert("Create payment order responds cleanly", paymentOrderRes.status === 201 && paymentOrderRes.data.success);

    const verifyPaymentRes = await req("/payments/verify", "POST", {
      order_id: testOrderId,
      payment_method: "DIRECT_UPI"
    }, custToken);
    assert("Verify direct payment completes and returns success", verifyPaymentRes.status === 200 && verifyPaymentRes.data.success);

    // Order state transitions: CONFIRMED -> PROCESSING -> READY -> COMPLETED
    const processOrderRes = await req(`/orders/${testOrderId}/process`, "PUT", null, epToken);
    assert("Entrepreneur marks order processing", processOrderRes.status === 200 && processOrderRes.data.order?.status === "PROCESSING");

    const readyRes = await req(`/orders/${testOrderId}/ready`, "PUT", null, epToken);
    assert("Entrepreneur marks order ready", readyRes.status === 200 && readyRes.data.order?.status === "READY");

    const completeOrderRes = await req(`/orders/${testOrderId}/complete`, "PUT", null, epToken);
    assert("Entrepreneur marks order completed", completeOrderRes.status === 200 && completeOrderRes.data.order?.status === "COMPLETED");

    // Invalid transition: cannot complete an already completed order again
    const invalidOrderTrans = await req(`/orders/${testOrderId}/confirm`, "PUT", null, epToken);
    assert("Invalid order transition from COMPLETED is rejected (409)", invalidOrderTrans.status === 409);

    // -----------------------------------------------------------------
    // 7. SERVICE BOOKING & STATE MACHINE TRANSITIONS
    // -----------------------------------------------------------------
    console.log("\n--- 7. Testing Service Booking & State Machine ---");
    const servicesList = await req("/services");
    const serviceToBook = servicesList.data.services[0];

    const createServiceReq = await req("/service-requests", "POST", {
      service_id: serviceToBook.id,
      title: "Handcrafted Leather Boot Restoration",
      description: "Need prompt sole repair and polish",
      address: "Bandra West, Mumbai",
      requested_date: new Date(Date.now() + 86400000).toISOString()
    }, custToken);
    const testSrId = createServiceReq.data.request?.id || createServiceReq.data.service_request?.id;
    assert("Customer creates service request (PENDING)", createServiceReq.status === 201 && !!testSrId);

    // Customer can cancel while in PENDING
    const cancelReq = await req("/service-requests", "POST", {
      service_id: serviceToBook.id,
      title: "Service to Cancel",
      description: "Cancelling this test booking",
      address: "Andheri East, Mumbai",
      requested_date: new Date(Date.now() + 86400000).toISOString()
    }, custToken);
    const cancelSrId = cancelReq.data.request?.id;
    const cancelResult = await req(`/service-requests/${cancelSrId}/cancel`, "PUT", null, custToken);
    assert("Customer cancels PENDING request successfully", cancelResult.status === 200 && cancelResult.data.request?.status === "CANCELLED");

    // Entrepreneur accepts primary request
    const acceptReqRes = await req(`/service-requests/${testSrId}/accept`, "PUT", null, epToken);
    assert("Entrepreneur accepts service request (ACCEPTED)", acceptReqRes.status === 200 && acceptReqRes.data.request?.status === "ACCEPTED");

    // Start service
    const startReqRes = await req(`/service-requests/${testSrId}/start`, "PUT", null, epToken);
    assert("Entrepreneur starts service request (IN_PROGRESS)", startReqRes.status === 200 && startReqRes.data.request?.status === "IN_PROGRESS");

    // Customer CANNOT cancel when IN_PROGRESS
    const invalidCancel = await req(`/service-requests/${testSrId}/cancel`, "PUT", null, custToken);
    assert("Customer cannot cancel request when IN_PROGRESS (409)", invalidCancel.status === 409);

    // Complete service
    const completeReqRes = await req(`/service-requests/${testSrId}/complete`, "PUT", null, epToken);
    assert("Entrepreneur completes service request (COMPLETED)", completeReqRes.status === 200 && completeReqRes.data.request?.status === "COMPLETED");

    // Invalid transition: cannot accept a completed request
    const invalidSrTrans = await req(`/service-requests/${testSrId}/accept`, "PUT", null, epToken);
    assert("Invalid transition from COMPLETED is rejected (409)", invalidSrTrans.status === 409);

    // -----------------------------------------------------------------
    // 8. REVIEWS & RATING DERIVATION
    // -----------------------------------------------------------------
    console.log("\n--- 8. Testing Reviews & Derived Average Ratings ---");
    // Customer submits review for completed service request
    const reviewRes = await req("/reviews", "POST", {
      entrepreneur_id: serviceToBook.entrepreneur_id,
      service_request_id: testSrId,
      rating: 5,
      comment: "Exceptional craftsmanship and punctual doorstep service!"
    }, custToken);
    assert("Customer submits verified review for completed job", reviewRes.status === 201 && reviewRes.data.review?.id);

    // Duplicate review for same request must fail
    const dupReviewRes = await req("/reviews", "POST", {
      entrepreneur_id: serviceToBook.entrepreneur_id,
      service_request_id: testSrId,
      rating: 4,
      comment: "Trying to submit second review"
    }, custToken);
    assert("Duplicate review for same service request is rejected (409)", dupReviewRes.status === 409);

    // Check entrepreneur average rating recalculated in DB
    const epDb = await pool.query("SELECT average_rating, total_reviews FROM entrepreneur_profiles WHERE id = $1", [serviceToBook.entrepreneur_id]);
    assert("Entrepreneur average rating updated in database", Number(epDb.rows[0].average_rating) > 0 && epDb.rows[0].total_reviews > 0);

    // -----------------------------------------------------------------
    // 9. COMPLAINTS & DISPUTE RESOLUTION
    // -----------------------------------------------------------------
    console.log("\n--- 9. Testing Complaints & Admin Dispute Resolution ---");
    const complaintRes = await req("/complaints", "POST", {
      order_id: testOrderId,
      subject: "Minor packaging defect",
      description: "The outer artisan wrap had a small tear upon delivery."
    }, custToken);
    assert("Customer raises complaint against order", complaintRes.status === 201 && complaintRes.data.complaint?.id);
    const testComplaintId = complaintRes.data.complaint?.id;

    const resolveRes = await req(`/admin/complaints/${testComplaintId}/resolve`, "PUT", {
      status: "RESOLVED",
      admin_response: "Artisan reached out and issue has been addressed."
    }, adminToken);
    assert("Admin resolves complaint", resolveRes.status === 200 && resolveRes.data.complaint?.status === "RESOLVED");

    // -----------------------------------------------------------------
    // 10. ADMIN GOVERNANCE & TAXONOMY MANAGEMENT
    // -----------------------------------------------------------------
    console.log("\n--- 10. Testing Admin Governance & Analytics ---");
    const createCatRes = await req("/categories", "POST", {
      name: `Artisan Guild ${uniqueTs}`,
      description: "Traditional guild for rare trades",
      icon_url: "Award"
    }, adminToken);
    assert("Admin creates new category", createCatRes.status === 201 && createCatRes.data.category?.id);
    const testCatId = createCatRes.data.category?.id;

    const delCatRes = await req(`/categories/${testCatId}`, "DELETE", null, adminToken);
    assert("Admin deletes category", delCatRes.status === 200 && delCatRes.data.success);

    const reportsRes = await req("/admin/analytics", "GET", null, adminToken);
    assert("Admin analytics data returned from database", reportsRes.status === 200 && Array.isArray(reportsRes.data.analytics?.monthly_sales));

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
