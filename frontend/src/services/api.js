// Canonical API Service Layer for HunarHub
let rawBase = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
if (!rawBase) {
  rawBase = "/api";
} else if (!rawBase.endsWith("/api")) {
  rawBase += "/api";
}
const API_BASE = rawBase;

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

  const res = await fetch(`${API_BASE}${endpoint}`, config);

  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned non-JSON response (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}: ${res.statusText}`);
  }
  return data;
}

export const api = {
  // Authentication
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  register: (userData) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(userData) }),

  getMe: () => request("/auth/me"),

  updateProfile: (userData) =>
    request("/auth/profile", { method: "PUT", body: JSON.stringify(userData) }),

  // Categories & Skills
  getCategories: () => request("/categories"),
  getCategoryById: (id) => request(`/categories/${id}`),
  createCategory: (data) =>
    request("/categories", { method: "POST", body: JSON.stringify(data) }),
  updateCategory: (id, data) =>
    request(`/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCategory: (id) =>
    request(`/categories/${id}`, { method: "DELETE" }),
  getSkills: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/skills${query ? `?${query}` : ""}`);
  },
  createSkill: (data) =>
    request("/skills", { method: "POST", body: JSON.stringify(data) }),
  updateSkill: (id, data) =>
    request(`/skills/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSkill: (id) =>
    request(`/skills/${id}`, { method: "DELETE" }),

  // Entrepreneurs
  getEntrepreneurs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/entrepreneurs${query ? `?${query}` : ""}`);
  },
  getNearbyEntrepreneurs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/entrepreneurs/nearby${query ? `?${query}` : ""}`);
  },
  getEntrepreneurById: (id) => request(`/entrepreneurs/${id}`),
  getMyEntrepreneurProfile: () => request("/entrepreneurs/profile"),
  getEntrepreneurDashboard: () => request("/entrepreneurs/dashboard"),
  createEntrepreneurProfile: (data) =>
    request("/entrepreneurs/profile", { method: "POST", body: JSON.stringify(data) }),
  updateEntrepreneurProfile: (data) =>
    request("/entrepreneurs/profile", { method: "PUT", body: JSON.stringify(data) }),
  deleteEntrepreneurProfile: () =>
    request("/entrepreneurs/profile", { method: "DELETE" }),
  getMyEntrepreneurSkills: () => request("/entrepreneurs/skills"),
  addEntrepreneurSkill: (skill_id) =>
    request("/entrepreneurs/skills", { method: "POST", body: JSON.stringify({ skill_id }) }),
  removeEntrepreneurSkill: (skillId) =>
    request(`/entrepreneurs/skills/${skillId}`, { method: "DELETE" }),
  getMyEntrepreneurReviews: () => request("/entrepreneurs/my/reviews"),

  // Services
  getServices: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/services${query ? `?${query}` : ""}`);
  },
  getServiceById: (id) => request(`/services/${id}`),
  getMyServices: () => request("/services/my"),
  createService: (data) =>
    request("/services", { method: "POST", body: JSON.stringify(data) }),
  updateService: (id, data) =>
    request(`/services/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteService: (id) =>
    request(`/services/${id}`, { method: "DELETE" }),

  // Products
  getProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/products${query ? `?${query}` : ""}`);
  },
  getProductById: (id) => request(`/products/${id}`),
  getMyProducts: () => request("/products/my"),
  createProduct: (data) =>
    request("/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id, data) =>
    request(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProduct: (id) =>
    request(`/products/${id}`, { method: "DELETE" }),

  // Service Requests
  createServiceRequest: (data) =>
    request("/service-requests", { method: "POST", body: JSON.stringify(data) }),
  getMyServiceRequests: () => request("/service-requests/my"),
  getReceivedServiceRequests: () => request("/service-requests/received"),
  getRequestById: (id) => request(`/service-requests/${id}`),
  cancelServiceRequest: (id) =>
    request(`/service-requests/${id}/cancel`, { method: "PUT" }),
  acceptServiceRequest: (id) =>
    request(`/service-requests/${id}/accept`, { method: "PUT" }),
  rejectServiceRequest: (id) =>
    request(`/service-requests/${id}/reject`, { method: "PUT" }),
  startServiceRequest: (id) =>
    request(`/service-requests/${id}/start`, { method: "PUT" }),
  completeServiceRequest: (id) =>
    request(`/service-requests/${id}/complete`, { method: "PUT" }),

  // Orders
  createOrder: (orderData) =>
    request("/orders", { method: "POST", body: JSON.stringify(orderData) }),
  getMyOrders: () => request("/orders/my"),
  getReceivedOrders: () => request("/orders/received"),
  getOrderById: (id) => request(`/orders/${id}`),
  cancelOrder: (id) =>
    request(`/orders/${id}/cancel`, { method: "PUT" }),
  confirmOrder: (id) =>
    request(`/orders/${id}/confirm`, { method: "PUT" }),
  processOrder: (id) =>
    request(`/orders/${id}/process`, { method: "PUT" }),
  markOrderReady: (id) =>
    request(`/orders/${id}/ready`, { method: "PUT" }),
  completeOrder: (id) =>
    request(`/orders/${id}/complete`, { method: "PUT" }),

  // Payments
  createPaymentOrder: (data) =>
    request("/payments/create-order", { method: "POST", body: JSON.stringify(data) }),
  verifyPayment: (data) =>
    request("/payments/verify", { method: "POST", body: JSON.stringify(data) }),

  // Portfolio
  getPortfolio: (epId) => request(`/portfolio/entrepreneur/${epId}`),
  createPortfolioItem: (data) =>
    request("/portfolio", { method: "POST", body: JSON.stringify(data) }),
  updatePortfolioItem: (id, data) =>
    request(`/portfolio/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePortfolioItem: (id) =>
    request(`/portfolio/${id}`, { method: "DELETE" }),

  // Quotes
  createQuote: (data) =>
    request("/quotes", { method: "POST", body: JSON.stringify(data) }),
  getQuotesForRequest: (srId) =>
    request(`/quotes/request/${srId}`),
  acceptQuote: (quoteId) =>
    request(`/quotes/${quoteId}/accept`, { method: "PUT" }),
  rejectQuote: (quoteId) =>
    request(`/quotes/${quoteId}/reject`, { method: "PUT" }),

  // Messages / In-App Chat
  getConversations: () => request("/messages/conversations"),
  getMessages: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/messages${query ? `?${query}` : ""}`);
  },
  sendMessage: (data) =>
    request("/messages", { method: "POST", body: JSON.stringify(data) }),

  // Favorites
  getFavorites: () => request("/favorites"),
  addFavorite: (data) =>
    request("/favorites", { method: "POST", body: JSON.stringify(data) }),
  removeFavorite: (id) =>
    request(`/favorites/${id}`, { method: "DELETE" }),

  // Availability
  getAvailability: (epId) => request(`/availability/entrepreneur/${epId}`),
  getMyAvailability: () => request("/availability"),
  addAvailability: (data) =>
    request("/availability", { method: "POST", body: JSON.stringify(data) }),
  updateAvailabilitySlot: (id, data) =>
    request(`/availability/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteAvailability: (id) =>
    request(`/availability/${id}`, { method: "DELETE" }),

  // Complaints / Disputes
  createComplaint: (data) =>
    request("/complaints", { method: "POST", body: JSON.stringify(data) }),
  getMyComplaints: () => request("/complaints/my"),

  // Reviews
  getRecentReviews: () => request("/reviews"),
  getReviewsByEntrepreneur: (id) => request(`/reviews/entrepreneur/${id}`),
  getReviewsByProduct: (id) => request(`/reviews/product/${id}`),
  createReview: (reviewData) =>
    request("/reviews", { method: "POST", body: JSON.stringify(reviewData) }),

  // Admin
  getAdminDashboard: () => request("/admin/dashboard"),
  getAdminEntrepreneurs: () => request("/admin/entrepreneurs"),
  getAdminUsers: () => request("/admin/users"),
  deactivateUser: (id) => request(`/admin/users/${id}/deactivate`, { method: "PUT" }),
  approveEntrepreneur: (id) =>
    request(`/admin/entrepreneurs/${id}/approve`, { method: "PUT" }),
  rejectEntrepreneur: (id) =>
    request(`/admin/entrepreneurs/${id}/reject`, { method: "PUT" }),
  updateVerificationBadges: (id, data) =>
    request(`/admin/entrepreneurs/${id}/verification`, { method: "PUT", body: JSON.stringify(data) }),
  getAdminOrders: () => request("/admin/orders"),
  getAdminServiceRequests: () => request("/admin/service-requests"),
  getAdminComplaints: () => request("/admin/complaints"),
  resolveComplaint: (id, status, admin_response) =>
    request(`/admin/complaints/${id}/resolve`, { method: "PUT", body: JSON.stringify({ status, admin_response }) }),
  getAdminAnalytics: () => request("/admin/analytics")
};
