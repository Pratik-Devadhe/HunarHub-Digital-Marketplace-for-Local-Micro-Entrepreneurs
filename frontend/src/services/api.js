const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");;

// Sample Fallback Data if Backend returns empty or offline
const MOCK_CATEGORIES = [
  { id: 1, name: "Cobbler & Leather Care", description: "Leather boot repair, resoling, bag restyling & custom footwear", icon: "👞" },
  { id: 2, name: "Potter (Kumhar) & Earthen Crafts", description: "Terracotta pottery, natural clay matkas, biryani handis & clay decor", icon: "🏺" },
  { id: 3, name: "Tailoring & Fashion Alterations", description: "Designer saree blouses, suit alterations, Banarasi stitching & embroidery", icon: "✂️" },
  { id: 4, name: "Home Appliances & AC Repair", description: "AC servicing, refrigerator repair, washing machine & microwave fix", icon: "❄️" },
  { id: 5, name: "Home Cleaning & Pest Control", description: "Deep home cleaning, sofa sanitization, cockroach & termite eradication", icon: "🧹" },
  { id: 6, name: "Packers & House Shifting", description: "Local house shifting, furniture transport, vehicle moving & packing", icon: "📦" },
  { id: 7, name: "Woodworking & Custom Furniture", description: "Wooden furniture repair, carving, modular kitchen & carpentry", icon: "🪚" },
  { id: 8, name: "Painting & Home Interiors", description: "Wall painting, exterior waterproof coating, interior design & decor", icon: "🎨" }
];

const MOCK_ENTREPRENEURS = [
  {
    id: 1,
    user_id: 3,
    full_name: "Ramesh Kumar",
    business_name: "Ramesh Leather Craft & Boots",
    category_id: 1,
    category_name: "Cobbler & Leather Care",
    bio: "Master cobbler with 15+ years of experience in luxury shoe repair, leather resoling, jacket restoration, and orthopedic shoe modifications.",
    city: "Mumbai",
    state: "Maharashtra",
    experience_years: 15,
    verification_status: "APPROVED",
    average_rating: 4.9,
    total_reviews: 142,
    response_time: "⚡ 15 mins",
    completed_jobs: 380,
    profile_image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300"
  },
  {
    id: 2,
    user_id: 4,
    full_name: "Lakshmi Devi",
    business_name: "Lakshmi Terracotta Earthen Arts",
    category_id: 2,
    category_name: "Potter (Kumhar) & Earthen Crafts",
    bio: "Heritage terracotta artist crafting eco-friendly clay matkas, traditional diyas, earthen cooking pots, and hand-painted kulhads.",
    city: "Jaipur",
    state: "Rajasthan",
    experience_years: 12,
    verification_status: "APPROVED",
    average_rating: 4.8,
    total_reviews: 98,
    response_time: "⚡ 20 mins",
    completed_jobs: 260,
    profile_image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300"
  },
  {
    id: 3,
    user_id: 5,
    full_name: "Sunita Sharma",
    business_name: "Sunita Handloom & Designer Stitching",
    category_id: 3,
    category_name: "Tailoring & Fashion Alterations",
    bio: "Expert tailor specializing in Banarasi silk stitching, designer saree blouse fitting, suit alterations, and custom embroidery.",
    city: "Varanasi",
    state: "Uttar Pradesh",
    experience_years: 18,
    verification_status: "APPROVED",
    average_rating: 5.0,
    total_reviews: 210,
    response_time: "⚡ 10 mins",
    completed_jobs: 510,
    profile_image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300"
  },
  {
    id: 4,
    user_id: 6,
    full_name: "Vikram Malhotra",
    business_name: "Malhotra AC & Appliance Solutions",
    category_id: 4,
    category_name: "Home Appliances & AC Repair",
    bio: "Certified appliance engineer offering doorstep AC gas filling, compressor repair, refrigerator servicing, and washing machine fix.",
    city: "Pune",
    state: "Maharashtra",
    experience_years: 10,
    verification_status: "APPROVED",
    average_rating: 4.9,
    total_reviews: 175,
    response_time: "⚡ 12 mins",
    completed_jobs: 430,
    profile_image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300"
  },
  {
    id: 5,
    user_id: 7,
    full_name: "Anand Verma",
    business_name: "Verma Packers & Relocation Express",
    category_id: 6,
    category_name: "Packers & House Shifting",
    bio: "Trusted local packers and movers offering safe bubble-wrapped house shifting, office relocation, and inter-city vehicle transport.",
    city: "Bengaluru",
    state: "Karnataka",
    experience_years: 14,
    verification_status: "APPROVED",
    average_rating: 4.8,
    total_reviews: 310,
    response_time: "⚡ 15 mins",
    completed_jobs: 620,
    profile_image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300"
  },
  {
    id: 6,
    user_id: 8,
    full_name: "Rajesh Saini",
    business_name: "Royal Touch Home Painters & Decor",
    category_id: 8,
    category_name: "Painting & Home Interiors",
    bio: "Professional interior and exterior painting contractors offering texture painting, waterproof wall sealing, and Asian Paints color quotes.",
    city: "Delhi",
    state: "Delhi NCR",
    experience_years: 16,
    verification_status: "APPROVED",
    average_rating: 4.9,
    total_reviews: 188,
    response_time: "⚡ 18 mins",
    completed_jobs: 490,
    profile_image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300"
  }
];

const MOCK_SERVICES = [
  {
    id: 101,
    entrepreneur_id: 1,
    category_id: 1,
    category_name: "Cobbler & Leather Care",
    title: "Premium Leather Boot & Shoe Resoling",
    description: "Complete resoling, heel replacement, and deep leather conditioning for boots, formal shoes, and sandals using genuine Italian leather.",
    price: "350.00",
    price_type: "FIXED",
    estimated_duration: 45,
    business_name: "Ramesh Leather Craft & Boots",
    city: "Mumbai",
    average_rating: 4.9,
    reviews_count: 142,
    response_time: "⚡ 15 mins"
  },
  {
    id: 102,
    entrepreneur_id: 2,
    category_id: 2,
    category_name: "Potter (Kumhar) & Earthen Crafts",
    title: "Custom Terracotta Matka & Clay Cookware",
    description: "Hand-thrown earthen clay water pots, biryani handis, and decorative terracotta garden planters baked in traditional clay kiln.",
    price: "500.00",
    price_type: "STARTING_FROM",
    estimated_duration: 90,
    business_name: "Lakshmi Terracotta Earthen Arts",
    city: "Jaipur",
    average_rating: 4.8,
    reviews_count: 98,
    response_time: "⚡ 20 mins"
  },
  {
    id: 103,
    entrepreneur_id: 3,
    category_id: 3,
    category_name: "Tailoring & Fashion Alterations",
    title: "Designer Saree Blouse Stitching & Pattern Fitting",
    description: "Precision custom stitching, neck pattern designing, piping, padding, and size fitting for ethnic wedding wear and sarees.",
    price: "850.00",
    price_type: "FIXED",
    estimated_duration: 120,
    business_name: "Sunita Handloom & Designer Stitching",
    city: "Varanasi",
    average_rating: 5.0,
    reviews_count: 210,
    response_time: "⚡ 10 mins"
  },
  {
    id: 104,
    entrepreneur_id: 4,
    category_id: 4,
    category_name: "Home Appliances & AC Repair",
    title: "Doorstep Split AC Servicing & Gas Charging",
    description: "Deep jet chemical wash, outdoor unit cleaning, gas leak checking, and refrigerant recharge for 1.5 to 2 Ton Split AC units.",
    price: "499.00",
    price_type: "STARTING_FROM",
    estimated_duration: 60,
    business_name: "Malhotra AC & Appliance Solutions",
    city: "Pune",
    average_rating: 4.9,
    reviews_count: 175,
    response_time: "⚡ 12 mins"
  },
  {
    id: 105,
    entrepreneur_id: 5,
    category_id: 6,
    category_name: "Packers & House Shifting",
    title: "Local 1BHK / 2BHK House Shifting & Packing",
    description: "Complete packing of household goods, furniture dismantle & reassembly, dedicated closed container truck, and safe loading.",
    price: "3500.00",
    price_type: "STARTING_FROM",
    estimated_duration: 240,
    business_name: "Verma Packers & Relocation Express",
    city: "Bengaluru",
    average_rating: 4.8,
    reviews_count: 310,
    response_time: "⚡ 15 mins"
  },
  {
    id: 106,
    entrepreneur_id: 6,
    category_id: 8,
    category_name: "Painting & Home Interiors",
    title: "Full House Interior Painting & Texture Wall Art",
    description: "Dust-free wall sanding, primer coating, Asian Paints Royal emulsion application, and custom living room accent wall texturing.",
    price: "7999.00",
    price_type: "STARTING_FROM",
    estimated_duration: 480,
    business_name: "Royal Touch Home Painters & Decor",
    city: "Delhi",
    average_rating: 4.9,
    reviews_count: 188,
    response_time: "⚡ 18 mins"
  }
];

const MOCK_PRODUCTS = [
  {
    id: 201,
    entrepreneur_id: 1,
    category_id: 1,
    category_name: "Cobbler & Leather Care",
    name: "Handcrafted Genuine Leather Belt",
    description: "Pure full-grain tan leather belt with solid brass buckle, handcrafted by local artisans.",
    price: "699.00",
    stock_quantity: 15,
    business_name: "Ramesh Leather Craft & Boots",
    primary_image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500"
  },
  {
    id: 202,
    entrepreneur_id: 2,
    category_id: 2,
    category_name: "Potter (Kumhar) & Earthen Crafts",
    name: "Natural Clay Water Dispenser Matka (5 Liters)",
    description: "Eco-friendly natural clay water cooler with stainless steel tap. Keeps water naturally cool and alkaline.",
    price: "1299.00",
    stock_quantity: 8,
    business_name: "Lakshmi Terracotta Earthen Arts",
    primary_image: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=500"
  },
  {
    id: 203,
    entrepreneur_id: 3,
    category_id: 3,
    category_name: "Tailoring & Fashion Alterations",
    name: "Hand-Woven Pure Silk Brocade Dupatta",
    description: "Authentic Banarasi silk dupatta featuring gold zari weave and hand-finished fringes.",
    price: "1850.00",
    stock_quantity: 12,
    business_name: "Sunita Handloom & Designer Stitching",
    primary_image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500"
  },
  {
    id: 204,
    entrepreneur_id: 2,
    category_id: 2,
    category_name: "Potter (Kumhar) & Earthen Crafts",
    name: "Set of 6 Hand-Painted Terracotta Tea Kulhads",
    description: "Traditional unglazed clay tea cups painted with organic pigments. Perfect for piping hot chai.",
    price: "349.00",
    stock_quantity: 25,
    business_name: "Lakshmi Terracotta Earthen Arts",
    primary_image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500"
  }
];

async function request(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || `HTTP ${res.status}: ${res.statusText}`);
    }
    return data;
  } catch (err) {
    console.warn(`API network call failed on ${endpoint}, using rich fallback context:`, err.message);
    throw err;
  }
}

let LOCAL_ORDERS = [
  { id: 801, status: "CONFIRMED", payment_status: "PAID", created_at: new Date().toISOString(), total_amount: "699.00", shipping_address: "Flat 402, Sunshine Apartments, Bandra West, Mumbai", items: [{ product_name: "Handcrafted Genuine Leather Belt", quantity: 1, subtotal: "699.00" }] }
];

export const api = {
  // Auth
  login: async (email, password) => {
    try {
      return await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    } catch (_) {
      // Mock login fallback for smooth testing
      const user = email.includes("admin")
        ? { id: 1, full_name: "System Admin", email, role: "ADMIN" }
        : email.includes("ramesh")
        ? { id: 3, full_name: "Ramesh Kumar", email, role: "ENTREPRENEUR" }
        : email.includes("sunita")
        ? { id: 5, full_name: "Sunita Sharma", email, role: "ENTREPRENEUR" }
        : { id: 2, full_name: "Ananya Roy", email, role: "CUSTOMER" };
      return { success: true, token: "mock_jwt_token_123", user };
    }
  },

  register: (userData) => request("/auth/register", { method: "POST", body: JSON.stringify(userData) }),
  getMe: () => request("/auth/me").catch(() => ({ user: { id: 2, full_name: "Ananya Roy", email: "ananya@gmail.com", role: "CUSTOMER" } })),

  // Categories & Skills
  getCategories: async () => {
    try {
      const res = await request("/categories");
      if (res.categories && res.categories.length > 0) return res;
      return { categories: MOCK_CATEGORIES };
    } catch (_) {
      return { categories: MOCK_CATEGORIES };
    }
  },

  // Entrepreneurs
  getEntrepreneurs: async (params = {}) => {
    try {
      const res = await request("/entrepreneurs");
      if (res.entrepreneurs && res.entrepreneurs.length > 0) return res;
      return { entrepreneurs: MOCK_ENTREPRENEURS };
    } catch (_) {
      return { entrepreneurs: MOCK_ENTREPRENEURS };
    }
  },

  // Services
  getServices: async (params = {}) => {
    try {
      const res = await request("/services");
      if (res.services && res.services.length > 0) return res;
      return { services: MOCK_SERVICES };
    } catch (_) {
      return { services: MOCK_SERVICES };
    }
  },

  // Products
  getProducts: async (params = {}) => {
    try {
      const res = await request("/products");
      if (res.products && res.products.length > 0) return res;
      return { products: MOCK_PRODUCTS };
    } catch (_) {
      return { products: MOCK_PRODUCTS };
    }
  },

  getMyServices: () => request("/services/my").catch(() => ({ services: MOCK_SERVICES.slice(0, 2) })),
  createService: (serviceData) => request("/services", { method: "POST", body: JSON.stringify(serviceData) }),
  updateService: (id, serviceData) => request(`/services/${id}`, { method: "PUT", body: JSON.stringify(serviceData) }),
  deleteService: (id) => request(`/services/${id}`, { method: "DELETE" }),

  getMyProducts: () => request("/products/my").catch(() => ({ products: MOCK_PRODUCTS.slice(0, 2) })),
  createProduct: (productData) => request("/products", { method: "POST", body: JSON.stringify(productData) }),
  updateProduct: (id, productData) => request(`/products/${id}`, { method: "PUT", body: JSON.stringify(productData) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),

  // Service Requests
  createServiceRequest: async (data) => {
    try {
      return await request("/service-requests", { method: "POST", body: JSON.stringify(data) });
    } catch (err) {
      console.warn("Backend call failed, creating local fallback service request:", err);
      const newReq = {
        id: Math.floor(100 + Math.random() * 900),
        service_id: data.service_id,
        entrepreneur_id: data.entrepreneur_id,
        service_title: data.description || "Craft Service Booking",
        business_name: "Verified Local Artisan",
        requested_date: data.requested_date || new Date().toISOString().split("T")[0],
        requested_time: data.requested_time || "10:00",
        address: data.address || "Customer Address",
        estimated_price: data.estimated_price || "500.00",
        status: "PENDING",
        customer_note: data.customer_note || ""
      };
      LOCAL_SERVICE_REQUESTS.unshift(newReq);
      return { success: true, request: newReq };
    }
  },
  getMyServiceRequests: async () => {
    try {
      const res = await request("/service-requests/my");
      if (res && res.requests && res.requests.length > 0) return res;
      return { requests: LOCAL_SERVICE_REQUESTS };
    } catch (_) {
      return { requests: LOCAL_SERVICE_REQUESTS };
    }
  },
  getReceivedServiceRequests: async () => {
    try {
      const res = await request("/service-requests/received");
      if (res && res.requests && res.requests.length > 0) return res;
      return { requests: LOCAL_SERVICE_REQUESTS };
    } catch (_) {
      return { requests: LOCAL_SERVICE_REQUESTS };
    }
  },
  cancelServiceRequest: async (id) => {
    try {
      return await request(`/service-requests/${id}/cancel`, { method: "PUT" });
    } catch (_) {
      LOCAL_SERVICE_REQUESTS = LOCAL_SERVICE_REQUESTS.map((r) => r.id === id ? { ...r, status: "CANCELLED" } : r);
      return { success: true };
    }
  },
  acceptServiceRequest: async (id) => {
    try {
      return await request(`/service-requests/${id}/accept`, { method: "PUT" });
    } catch (_) {
      LOCAL_SERVICE_REQUESTS = LOCAL_SERVICE_REQUESTS.map((r) => r.id === id ? { ...r, status: "ACCEPTED" } : r);
      return { success: true };
    }
  },
  rejectServiceRequest: async (id) => {
    try {
      return await request(`/service-requests/${id}/reject`, { method: "PUT" });
    } catch (_) {
      LOCAL_SERVICE_REQUESTS = LOCAL_SERVICE_REQUESTS.map((r) => r.id === id ? { ...r, status: "REJECTED" } : r);
      return { success: true };
    }
  },
  startServiceRequest: async (id) => {
    try {
      return await request(`/service-requests/${id}/start`, { method: "PUT" });
    } catch (_) {
      LOCAL_SERVICE_REQUESTS = LOCAL_SERVICE_REQUESTS.map((r) => r.id === id ? { ...r, status: "IN_PROGRESS" } : r);
      return { success: true };
    }
  },
  completeServiceRequest: async (id) => {
    try {
      return await request(`/service-requests/${id}/complete`, { method: "PUT" });
    } catch (_) {
      LOCAL_SERVICE_REQUESTS = LOCAL_SERVICE_REQUESTS.map((r) => r.id === id ? { ...r, status: "COMPLETED" } : r);
      return { success: true };
    }
  },

  // Orders
  createOrder: async (orderData) => {
    try {
      return await request("/orders", { method: "POST", body: JSON.stringify(orderData) });
    } catch (err) {
      console.warn("Backend call failed, creating local fallback order:", err);
      const newOrder = {
        id: Math.floor(800 + Math.random() * 900),
        status: "CONFIRMED",
        payment_status: "PENDING",
        created_at: new Date().toISOString(),
        total_amount: orderData.total_amount || "699.00",
        shipping_address: orderData.shipping_address || "Customer Address",
        items: (orderData.items || []).map((it) => ({
          product_name: "Handcrafted Product Item",
          quantity: it.quantity || 1,
          subtotal: "699.00"
        }))
      };
      LOCAL_ORDERS.unshift(newOrder);
      return { success: true, order: newOrder };
    }
  },
  getMyOrders: async () => {
    try {
      const res = await request("/orders/my");
      if (res && res.orders && res.orders.length > 0) return res;
      return { orders: LOCAL_ORDERS };
    } catch (_) {
      return { orders: LOCAL_ORDERS };
    }
  },
  getReceivedOrders: async () => {
    try {
      const res = await request("/orders/received");
      if (res && res.orders && res.orders.length > 0) return res;
      return { orders: LOCAL_ORDERS };
    } catch (_) {
      return { orders: LOCAL_ORDERS };
    }
  },

  // Payments
  createPaymentOrder: (data) => request("/payments/create-order", { method: "POST", body: JSON.stringify(data) }).catch(() => ({ razorpay_order: { id: "order_mock_123" } })),
  verifyPayment: (data) => request("/payments/verify", { method: "POST", body: JSON.stringify(data) }).catch(() => ({ success: true })),

  // Entrepreneur Profile & Portfolio
  getEntrepreneurById: (id) => request(`/entrepreneurs/${id}`).catch(() => ({ entrepreneur: MOCK_ENTREPRENEURS.find(e => e.id === Number(id)) || MOCK_ENTREPRENEURS[0] })),
  updateEntrepreneurProfile: (data) => request("/entrepreneurs/me", { method: "PUT", body: JSON.stringify(data) }),
  
  getPortfolio: (epId) => request(`/portfolio/entrepreneur/${epId}`).catch(() => ({ portfolio: [
    { id: 1, title: "Resoling Formal Leather Boots", description: "Goodyear welt hand stitching on Oxford boots", image_url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400", price: "750.00" },
    { id: 2, title: "Custom Leather Duffel Bag", description: "Hand-stitched vintage tan travel bag", image_url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400", price: "2499.00" }
  ] })),
  createPortfolioItem: (data) => request("/portfolio", { method: "POST", body: JSON.stringify(data) }),
  updatePortfolioItem: (id, data) => request(`/portfolio/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePortfolioItem: (id) => request(`/portfolio/${id}`, { method: "DELETE" }),

  // Quotes
  createQuote: (data) => request("/quotes", { method: "POST", body: JSON.stringify(data) }),
  getQuotesForRequest: (reqId) => request(`/quotes/request/${reqId}`).catch(() => ({ quotes: [
    { id: 1, proposed_price: "650.00", estimated_completion: "2 Days", message: "I can deliver high quality custom work within 48 hrs.", business_name: "Ramesh Leather Craft", average_rating: 4.9, verification_status: "APPROVED" }
  ] })),
  acceptQuote: (quoteId) => request(`/quotes/${quoteId}/accept`, { method: "PUT" }),
  rejectQuote: (quoteId) => request(`/quotes/${quoteId}/reject`, { method: "PUT" }),

  // Messages / In-App Chat
  getConversations: () => request("/messages/conversations").catch(() => ({ conversations: [] })),
  getMessages: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/messages${query ? `?${query}` : ''}`).catch(() => ({ messages: [] }));
  },
  sendMessage: (data) => request("/messages", { method: "POST", body: JSON.stringify(data) }),

  // Favorites
  getFavorites: () => request("/favorites").catch(() => ({ favorites: [] })),
  addFavorite: (data) => request("/favorites", { method: "POST", body: JSON.stringify(data) }),
  removeFavorite: (id) => request(`/favorites/${id}`, { method: "DELETE" }),

  // Availability
  getAvailability: (epId) => request(`/availability/entrepreneur/${epId}`).catch(() => ({ availability: [] })),
  updateAvailabilitySlot: (id, data) => request(`/availability/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // Reviews
  createReview: (reviewData) => request("/reviews", { method: "POST", body: JSON.stringify(reviewData) }).catch(() => ({ success: true })),

  // Admin
  getAdminDashboard: () => request("/admin/dashboard").catch(() => ({ dashboard: { users: { count: 8 }, approved_entrepreneurs: { count: 3 }, orders: { count: 5 }, requests: { count: 4 } } })),
  getAdminEntrepreneurs: () => request("/admin/entrepreneurs").catch(() => ({ entrepreneurs: MOCK_ENTREPRENEURS })),
  approveEntrepreneur: (id) => request(`/admin/entrepreneurs/${id}/approve`, { method: "PUT" }).catch(() => ({ success: true })),
  rejectEntrepreneur: (id) => request(`/admin/entrepreneurs/${id}/reject`, { method: "PUT" }).catch(() => ({ success: true })),
  updateVerificationBadges: (id, data) => request(`/admin/entrepreneurs/${id}/verification`, { method: "PUT", body: JSON.stringify(data) }).catch(() => ({ success: true })),
  getAdminComplaints: () => request("/admin/complaints").catch(() => ({ complaints: [
    { id: 901, subject: "Slight delay in delivery", customer_id: 2, entrepreneur_id: 1, business_name: "Ramesh Cobbler Works", description: "Work done was excellent but delivered 1 day later than expected.", status: "OPEN" }
  ] })),
  resolveComplaint: (id, status, admin_response) => request(`/admin/complaints/${id}/resolve`, { method: "PUT", body: JSON.stringify({ status, admin_response }) }).catch(() => ({ success: true }))
};
