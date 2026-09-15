import React, { useState, useEffect } from "react";
import {
  Wrench,
  Package,
  DollarSign,
  CheckCircle2,
  Plus,
  RefreshCw,
  MessageSquareQuote,
  ShieldCheck,
  FileText,
  Trash2,
  Send,
  MessageSquare,
  Clock,
  MapPin,
  Check,
  Truck,
  ToggleLeft,
  ToggleRight,
  Star,
  Tag,
  AlertTriangle
} from "lucide-react";
import { api } from "../services/api";
import ChatModal from "./ChatModal";
import "./EntrepreneurPortal.css";

export default function EntrepreneurPortal({ user, showToast, onRefreshUser }) {
  const [activeTab, setActiveTab] = useState("leads"); // "leads" | "requests" | "orders" | "services" | "products" | "portfolio" | "availability" | "earnings" | "skills" | "reviews"
  const [dashboard, setDashboard] = useState(null);
  const [requests, setRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [myServices, setMyServices] = useState([]);
  const [myProducts, setMyProducts] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [openLeads, setOpenLeads] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [newSlot, setNewSlot] = useState({ day_of_week: "1", start_time: "09:00", end_time: "18:00" });
  const [mySkills, setMySkills] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [selectedSkillToAdd, setSelectedSkillToAdd] = useState("");
  const [myReviews, setMyReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Business Profile Onboarding State
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [onboardingData, setOnboardingData] = useState({
    business_name: "",
    phone: user?.phone || "",
    city: "Mumbai",
    experience_years: "3",
    address: "",
    bio: ""
  });

  const handleRegisterBusinessProfile = async (e) => {
    e.preventDefault();
    if (!onboardingData.business_name.trim()) {
      showToast("error", "Please enter your business or craft name");
      return;
    }
    setSubmittingProfile(true);
    try {
      await api.createEntrepreneurProfile(onboardingData);
      showToast("success", "Congratulations! Your Micro-Entrepreneur Business profile has been created!");
      if (onRefreshUser) await onRefreshUser();
      fetchData();
    } catch (err) {
      showToast("error", err.message || "Failed to register business profile");
    } finally {
      setSubmittingProfile(false);
    }
  };

  const handleUpdateBusinessProfile = async (e) => {
    e.preventDefault();
    if (!onboardingData.business_name.trim()) {
      showToast("error", "Please enter your business or craft name");
      return;
    }
    setSubmittingProfile(true);
    try {
      await api.updateEntrepreneurProfile({
        ...onboardingData,
        experience_years: Number(onboardingData.experience_years) || 0
      });
      showToast("success", "Business profile updated successfully!");
      if (onRefreshUser) await onRefreshUser();
      fetchData();
    } catch (err) {
      showToast("error", err.message || "Failed to update business profile");
    } finally {
      setSubmittingProfile(false);
    }
  };

  // Quote Submission Modal
  const [quotingLead, setQuotingLead] = useState(null);
  const [quoteData, setQuoteData] = useState({
    proposed_price: "",
    estimated_completion: "2 Days",
    message: ""
  });

  // Portfolio Item Modal
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [newPortfolio, setNewPortfolio] = useState({
    title: "",
    description: "",
    image_url: "",
    price: ""
  });

  // Modals for adding/editing product/service
  const [showAddService, setShowAddService] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [chatPartner, setChatPartner] = useState(null);

  const [newService, setNewService] = useState({
    category_id: "1",
    skill_id: "1",
    title: "",
    description: "",
    price: "",
    price_type: "FIXED",
    estimated_duration: "60"
  });

  const [newProduct, setNewProduct] = useState({
    category_id: "1",
    name: "",
    description: "",
    price: "",
    stock_quantity: "10"
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, reqRes, ordRes, svcsRes, prodsRes, availRes, mySkillsRes, allSkillsRes, reviewsRes] = await Promise.all([
        api.getEntrepreneurDashboard(),
        api.getReceivedServiceRequests(),
        api.getReceivedOrders(),
        api.getMyServices(),
        api.getMyProducts(),
        api.getMyAvailability(),
        api.getMyEntrepreneurSkills(),
        api.getSkills(),
        api.getMyEntrepreneurReviews()
      ]);

      const ep = dashRes.dashboard?.entrepreneur || {};
      setDashboard(dashRes.dashboard || {});

      const allReceived = reqRes.requests || [];
      const bookedJobs = allReceived.filter((r) => ep.id && Number(r.entrepreneur_id) === Number(ep.id));
      const quoteLeads = allReceived.filter((r) => !r.entrepreneur_id || Number(r.entrepreneur_id) !== Number(ep.id));

      setRequests(bookedJobs);
      setOpenLeads(quoteLeads);
      setOrders(ordRes.orders || []);
      setMyServices(svcsRes.services || []);
      setMyProducts(prodsRes.products || []);
      setAvailability(availRes.availability || []);
      setMySkills(mySkillsRes.skills || []);
      setAllSkills(allSkillsRes.skills || []);
      setMyReviews(reviewsRes.reviews || []);

      if (ep.id) {
        setOnboardingData({
          business_name: ep.business_name || "",
          phone: ep.phone || user?.phone || "",
          city: ep.city || "",
          experience_years: String(ep.experience_years ?? ""),
          address: ep.address || "",
          bio: ep.bio || ""
        });
        api.getPortfolio(ep.id)
          .then((res) => setPortfolio(res.portfolio || []))
          .catch(() => {});
      }
    } catch (err) {
      console.error("Failed to refresh entrepreneur data:", err);
      setError(err.message || "Failed to load entrepreneur dashboard");
      showToast("error", err.message || "Failed to refresh entrepreneur data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (!selectedSkillToAdd) return;
    try {
      await api.addEntrepreneurSkill(Number(selectedSkillToAdd));
      showToast("success", "Craftsmanship skill added to your profile!");
      setSelectedSkillToAdd("");
      const res = await api.getMyEntrepreneurSkills();
      setMySkills(res.skills || []);
    } catch (err) {
      showToast("error", err.message || "Failed to add skill");
    }
  };

  const handleRemoveSkill = async (skillId, skillName) => {
    try {
      await api.removeEntrepreneurSkill(skillId);
      showToast("info", `Removed skill "${skillName}"`);
      setMySkills((prev) => prev.filter((s) => s.id !== skillId));
    } catch (err) {
      showToast("error", err.message || "Failed to remove skill");
    }
  };

  const handleOrderAction = async (id, action) => {
    try {
      if (action === "confirm") await api.confirmOrder(id);
      if (action === "process") await api.processOrder(id);
      if (action === "ready") await api.markOrderReady(id);
      if (action === "complete") await api.completeOrder(id);
      showToast("success", `Order updated: ${action}`);
      fetchData();
    } catch (err) {
      showToast("error", err.message || `Failed to update order: ${action}`);
    }
  };

  const handleToggleAvailability = async () => {
    try {
      const ep = dashboard?.entrepreneur || {};
      const newStatus = !ep.is_available;
      await api.updateEntrepreneurProfile({ is_available: newStatus });
      showToast("success", newStatus ? "You are now ONLINE and accepting new customer leads!" : "You are now set to OFFLINE.");
      fetchData();
    } catch (err) {
      showToast("error", err.message || "Failed to update availability status");
    }
  };

  const handleAddAvailabilitySlot = async (e) => {
    e.preventDefault();
    try {
      await api.addAvailability({
        day_of_week: Number(newSlot.day_of_week),
        start_time: newSlot.start_time,
        end_time: newSlot.end_time
      });
      showToast("success", "Working hour slot added!");
      const res = await api.getMyAvailability();
      setAvailability(res.availability || []);
    } catch (err) {
      showToast("error", err.message || "Failed to add availability slot");
    }
  };

  const handleDeleteAvailabilitySlot = async (slotId) => {
    try {
      await api.deleteAvailability(slotId);
      showToast("info", "Availability slot removed");
      const res = await api.getMyAvailability();
      setAvailability(res.availability || []);
    } catch (err) {
      showToast("error", err.message || "Failed to delete slot");
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitQuote = async (e) => {
    e.preventDefault();
    if (!quotingLead) return;
    try {
      await api.createQuote({
        service_request_id: quotingLead.id,
        proposed_price: quoteData.proposed_price,
        estimated_completion: quoteData.estimated_completion,
        message: quoteData.message
      });
      showToast("success", "Quote proposal submitted to customer!");
      setQuotingLead(null);
      setQuoteData({ proposed_price: "", estimated_completion: "2 Days", message: "" });
      fetchData();
    } catch (err) {
      showToast("error", err.message || "Failed to submit quote");
    }
  };

  const handleCreatePortfolio = async (e) => {
    e.preventDefault();
    try {
      await api.createPortfolioItem(newPortfolio);
      showToast("success", "Portfolio work example added!");
      setShowAddPortfolio(false);
      setNewPortfolio({ title: "", description: "", image_url: "", price: "" });
      fetchData();
    } catch (err) {
      showToast("error", err.message || "Failed to add portfolio item");
    }
  };

  const handleDeletePortfolio = async (id) => {
    try {
      await api.deletePortfolioItem(id);
      showToast("info", "Portfolio item deleted");
      fetchData();
    } catch (err) {
      showToast("error", err.message || "Failed to delete portfolio item");
    }
  };

  // Request actions
  const handleServiceAction = async (id, action) => {
    try {
      if (action === "accept") await api.acceptServiceRequest(id);
      if (action === "reject") await api.rejectServiceRequest(id);
      if (action === "start") await api.startServiceRequest(id);
      if (action === "complete") await api.completeServiceRequest(id);
      if (action === "cancel") await api.cancelServiceRequest(id);
      showToast("success", `Service request updated: ${action}`);
      fetchData();
    } catch (err) {
      showToast("error", err.message || `Action ${action} failed`);
    }
  };

  // Add Service submit
  const handleCreateService = async (e) => {
    e.preventDefault();
    try {
      if (editingService) {
        await api.updateService(editingService.id, newService);
        showToast("success", "Service updated successfully!");
        setEditingService(null);
      } else {
        await api.createService(newService);
        showToast("success", "New service added to listing!");
        setShowAddService(false);
      }
      fetchData();
    } catch (err) {
      showToast("error", err.message || "Failed to save service");
    }
  };

  // Add Product submit
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, newProduct);
        showToast("success", "Product updated successfully!");
        setEditingProduct(null);
      } else {
        await api.createProduct(newProduct);
        showToast("success", "New handmade product added!");
        setShowAddProduct(false);
      }
      fetchData();
    } catch (err) {
      showToast("error", err.message || "Failed to save product");
    }
  };

  const counts = dashboard?.counts || {};
  const ep = dashboard?.entrepreneur || {};

  if (!loading && !ep.id && user?.role !== "ADMIN") {
    return (
      <div className="entrepreneur-portal-container" style={{ maxWidth: "700px", margin: "2rem auto" }}>
        <div className="glass-panel" style={{ padding: "2.5rem", borderRadius: "1.25rem", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ width: "3.5rem", height: "3.5rem", borderRadius: "1rem", background: "linear-gradient(135deg, #e05638, #f59e0b)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
              <Wrench size={28} />
            </div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#ffffff", marginBottom: "0.5rem" }}>
              List Your Business on HunarHub FREE
            </h2>
            <p style={{ color: "#cbd5e1", fontSize: "0.95rem" }}>
              Connect directly with local customers searching for verified artisans, repair experts & handcrafted products. Zero commission fees!
            </p>
          </div>

          <form onSubmit={handleRegisterBusinessProfile} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <label className="field-label">Business / Trade Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Handcrafted Leather & Shoe Care"
                value={onboardingData.business_name}
                onChange={(e) => setOnboardingData({ ...onboardingData, business_name: e.target.value })}
                style={{ width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", color: "#fff" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="field-label">Primary City *</label>
                <select
                  value={onboardingData.city}
                  onChange={(e) => setOnboardingData({ ...onboardingData, city: e.target.value })}
                  style={{ width: "100%", padding: "0.75rem", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", color: "#fff" }}
                >
                  <option value="Mumbai">Mumbai</option>
                  <option value="Pune">Pune</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Bengaluru">Bengaluru</option>
                  <option value="Jaipur">Jaipur</option>
                  <option value="Varanasi">Varanasi</option>
                  <option value="Kolkata">Kolkata</option>
                  <option value="Chennai">Chennai</option>
                </select>
              </div>

              <div>
                <label className="field-label">Years of Experience *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={onboardingData.experience_years}
                  onChange={(e) => setOnboardingData({ ...onboardingData, experience_years: e.target.value })}
                  style={{ width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", color: "#fff" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="field-label">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={onboardingData.phone}
                  onChange={(e) => setOnboardingData({ ...onboardingData, phone: e.target.value })}
                  style={{ width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", color: "#fff" }}
                />
              </div>

              <div>
                <label className="field-label">Workshop / Shop Address</label>
                <input
                  type="text"
                  placeholder="e.g. Shop 12, Main Craft Market, Bandra"
                  value={onboardingData.address}
                  onChange={(e) => setOnboardingData({ ...onboardingData, address: e.target.value })}
                  style={{ width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", color: "#fff" }}
                />
              </div>
            </div>

            <div>
              <label className="field-label">About Your Work & Craft Specializations</label>
              <textarea
                rows="3"
                placeholder="Describe your craft expertise, services offered, repair guarantees or handmade items..."
                value={onboardingData.bio}
                onChange={(e) => setOnboardingData({ ...onboardingData, bio: e.target.value })}
                style={{ width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", color: "#fff" }}
              />
            </div>

            <button
              type="submit"
              disabled={submittingProfile}
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "0.85rem", fontSize: "1rem", marginTop: "0.5rem" }}
            >
              <CheckCircle2 size={18} />
              <span>{submittingProfile ? "Creating Profile..." : "Create Free Business Profile"}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="entrepreneur-portal-container">
      {/* Header & Verification Banner */}
      <div className="glass-panel portal-header-card">
        <div>
          <h1 className="portal-title">Artisan & Entrepreneur Workspace</h1>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.25rem", flexWrap: "wrap" }}>
            <span className="business-name">{ep.business_name || user?.full_name}</span>
            {dashboard?.entrepreneur?.verification_status === "APPROVED" ? (
              <span className="badge badge-accepted" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                <ShieldCheck size={14} /> Verified Artisan
              </span>
            ) : dashboard?.entrepreneur?.verification_status === "REJECTED" ? (
              <span className="badge badge-rejected" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#f87171", borderColor: "#ef4444" }}>
                Verification Rejected
              </span>
            ) : (
              <span className="badge badge-pending" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                Verification Pending
              </span>
            )}
          </div>
        </div>
        <button onClick={fetchData} className="btn-secondary">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Leads</span>
        </button>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: "1.2rem", margin: "1rem 0", border: "1px solid #ef4444", borderRadius: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#f87171" }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={fetchData} className="btn-secondary" style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}>
            Retry
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="glass-panel metric-card">
          <span className="metric-label">Total Revenue</span>
          <div className="metric-value-box">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span className="metric-number emerald">₹{counts.earnings || 0}</span>
          </div>
        </div>

        <div className="glass-panel metric-card">
          <span className="metric-label">Open Marketplace Leads</span>
          <div className="metric-value-box">
            <MessageSquareQuote className="w-5 h-5 text-amber-400" />
            <span className="metric-number amber">{openLeads.length}</span>
          </div>
        </div>

        <div className="glass-panel metric-card">
          <span className="metric-label">Active Orders</span>
          <div className="metric-value-box">
            <Package className="w-5 h-5 text-cyan-400" />
            <span className="metric-number cyan">{requests.length + orders.length}</span>
          </div>
        </div>

        <div className="glass-panel metric-card">
          <span className="metric-label">Portfolio Items</span>
          <div className="metric-value-box">
            <FileText className="w-5 h-5 text-purple-400" />
            <span className="metric-number purple">{portfolio.length}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="ep-tabs-bar">
        <div className="ep-tab-group">
          <button
            onClick={() => setActiveTab("leads")}
            className={`ep-tab-btn ${activeTab === "leads" ? "active" : ""}`}
          >
            🎯 Open Leads ({openLeads.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`ep-tab-btn ${activeTab === "requests" ? "active" : ""}`}
          >
            📥 Booked Jobs ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`ep-tab-btn ${activeTab === "orders" ? "active" : ""}`}
          >
            📦 Product Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("services")}
            className={`ep-tab-btn ${activeTab === "services" ? "active" : ""}`}
          >
            🛠️ My Services ({myServices.length})
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`ep-tab-btn ${activeTab === "products" ? "active" : ""}`}
          >
            🛍️ Products ({myProducts.length})
          </button>
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`ep-tab-btn ${activeTab === "portfolio" ? "active" : ""}`}
          >
            🎨 Work Portfolio ({portfolio.length})
          </button>
          <button
            onClick={() => setActiveTab("availability")}
            className={`ep-tab-btn ${activeTab === "availability" ? "active" : ""}`}
          >
            ⏰ Availability & Schedule
          </button>
          <button
            onClick={() => setActiveTab("skills")}
            className={`ep-tab-btn ${activeTab === "skills" ? "active" : ""}`}
          >
            🏷️ Skills ({mySkills.length})
          </button>
          <button
            onClick={() => setActiveTab("earnings")}
            className={`ep-tab-btn ${activeTab === "earnings" ? "active" : ""}`}
          >
            💰 Earnings Overview
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={`ep-tab-btn ${activeTab === "reviews" ? "active" : ""}`}
          >
            ⭐ Reviews ({myReviews.length})
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`ep-tab-btn ${activeTab === "profile" ? "active" : ""}`}
          >
            🏢 Business Profile
          </button>
        </div>

        {activeTab === "portfolio" && (
          <button onClick={() => setShowAddPortfolio(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span>Add Portfolio Work</span>
          </button>
        )}
        {activeTab === "services" && (
          <button onClick={() => { setEditingService(null); setShowAddService(true); }} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span>Add New Service</span>
          </button>
        )}
        {activeTab === "products" && (
          <button onClick={() => { setEditingProduct(null); setShowAddProduct(true); }} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        )}
      </div>

      {/* OPEN LEADS & QUOTE BIDDING BOARD */}
      {activeTab === "leads" && (
        <div className="items-list">
          {openLeads.map((lead) => (
            <div key={lead.id} className="glass-panel request-card">
              <div className="request-card-header">
                <div>
                  <h3 className="request-title">{lead.title || lead.service_title || "Custom Service Requirement"}</h3>
                  <p className="request-customer">Customer: <span className="customer-name">{lead.customer_name || "Verified Local Customer"}</span></p>
                </div>
                <span className="badge badge-accepted">
                  Target Budget: ₹{lead.budget_max || lead.estimated_price || "Open"}
                </span>
              </div>

              <div className="request-details-box">
                <p>📍 Location: {lead.city || lead.address || "Local Region"}</p>
                <p>📅 Date Required: {lead.requested_date ? new Date(lead.requested_date).toLocaleDateString() : "Flexible"}</p>
                {lead.description && <p className="request-note">Requirement: "{lead.description}"</p>}
              </div>

              <div className="request-action-row">
                <button
                  className="btn-sec-outline"
                  onClick={() => setChatPartner({ user_id: lead.customer_id, full_name: lead.customer_name })}
                >
                  <MessageSquare size={14} /> Message Customer
                </button>
                <button
                  className="btn-primary-amber"
                  onClick={() => {
                    setQuotingLead(lead);
                    setQuoteData({ proposed_price: lead.estimated_price || "", estimated_completion: "2 Days", message: "" });
                  }}
                >
                  <Send size={14} /> Submit Price Quote
                </button>
              </div>
            </div>
          ))}

          {openLeads.length === 0 && <p className="empty-msg">No active customer request leads available right now.</p>}
        </div>
      )}

      {/* BOOKED JOBS TAB */}
      {activeTab === "requests" && (
        <div className="items-list">
          {requests.map((sr) => (
            <div key={sr.id} className="glass-panel request-card">
              <div className="request-card-header">
                <div>
                  <h3 className="request-title">{sr.service_title}</h3>
                  <p className="request-customer">Customer: <span className="customer-name">{sr.customer_name}</span></p>
                </div>
                <span className={`badge badge-${(sr.status || "pending").toLowerCase()}`}>{sr.status}</span>
              </div>

              <div className="request-details-box">
                <p>📍 Address: {sr.address}</p>
                <p>📅 Scheduled: {new Date(sr.requested_date).toLocaleDateString()} at {sr.requested_time}</p>
                {sr.customer_note && <p className="request-note">Note: "{sr.customer_note}"</p>}
              </div>

              <div className="request-action-row">
                <span className="request-price">₹{sr.final_price || sr.estimated_price}</span>
                <div className="action-btn-group">
                  {sr.status === "PENDING" && (
                    <>
                      <button onClick={() => handleServiceAction(sr.id, "accept")} className="btn-success btn-sm">Accept</button>
                      <button onClick={() => handleServiceAction(sr.id, "reject")} className="btn-danger btn-sm">Reject</button>
                    </>
                  )}
                  {sr.status === "ACCEPTED" && (
                    <button onClick={() => handleServiceAction(sr.id, "start")} className="btn-primary btn-sm">Start Work</button>
                  )}
                  {sr.status === "IN_PROGRESS" && (
                    <button onClick={() => handleServiceAction(sr.id, "complete")} className="btn-success btn-sm">Mark Completed</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {requests.length === 0 && <p className="empty-msg">No booked jobs in your schedule.</p>}
        </div>
      )}

      {/* PRODUCT ORDERS MANAGEMENT TAB */}
      {activeTab === "orders" && (
        <div className="items-list">
          {orders.map((ord) => (
            <div key={ord.id} className="glass-panel request-card">
              <div className="request-card-header">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <h3 className="request-title">Order #{ord.id}</h3>
                    <span className={`badge ${
                      ord.status === "COMPLETED"
                        ? "badge-completed"
                        : ord.status === "CANCELLED"
                        ? "badge-rejected"
                        : "badge-accepted"
                    }`}>
                      {ord.status}
                    </span>
                    <span className={`badge ${ord.payment_status === "PAID" ? "badge-completed" : "badge-pending"}`}>
                      Payment: {ord.payment_status}
                    </span>
                  </div>
                  <p className="request-customer" style={{ marginTop: "0.25rem" }}>
                    Customer: <span className="customer-name">{ord.customer_name || "Verified Customer"}</span>
                    {" • Placed: "}{new Date(ord.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>Order Value</span>
                  <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#10b981" }}>₹{ord.total_amount}</span>
                </div>
              </div>

              {/* Order Items Table / List */}
              <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "0.85rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.5rem" }}>
                  Ordered Products
                </span>
                {ord.items && ord.items.map((it, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0", borderBottom: idx < ord.items.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", fontSize: "0.9rem" }}>
                    <span style={{ color: "#f8fafc", fontWeight: 500 }}>
                      {it.product_name} <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>× {it.quantity}</span>
                    </span>
                    <span style={{ color: "#e2e8f0", fontWeight: 700 }}>₹{it.subtotal}</span>
                  </div>
                ))}
              </div>

              {ord.shipping_address && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#cbd5e1", fontSize: "0.85rem" }}>
                  <MapPin size={14} color="#f59e0b" />
                  <span><strong>Delivery Address:</strong> {ord.shipping_address}</span>
                </div>
              )}

              {/* Order Action Buttons */}
              <div className="request-action-row" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.75rem" }}>
                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                  Current Status: <strong style={{ color: "#f59e0b" }}>{ord.status}</strong>
                </span>
                <div className="action-btn-group" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {ord.status === "PENDING" && (
                    <button onClick={() => handleOrderAction(ord.id, "confirm")} className="btn-success btn-sm">
                      <Check size={14} /> Accept & Confirm
                    </button>
                  )}
                  {ord.status === "CONFIRMED" && (
                    <button onClick={() => handleOrderAction(ord.id, "process")} className="btn-primary btn-sm">
                      <Package size={14} /> Start Packing / Processing
                    </button>
                  )}
                  {ord.status === "PROCESSING" && (
                    <button onClick={() => handleOrderAction(ord.id, "ready")} className="btn-success btn-sm" style={{ background: "#06b6d4", borderColor: "#06b6d4" }}>
                      <Truck size={14} /> Mark Ready for Delivery
                    </button>
                  )}
                  {ord.status === "READY" && (
                    <button onClick={() => handleOrderAction(ord.id, "complete")} className="btn-success btn-sm">
                      <CheckCircle2 size={14} /> Mark Delivered & Completed
                    </button>
                  )}
                  {ord.status === "COMPLETED" && (
                    <span style={{ color: "#10b981", fontWeight: 700, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <CheckCircle2 size={16} /> Order Completed
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {orders.length === 0 && (
            <p className="empty-msg">No customer product orders received yet. Your listed handmade products are active on the marketplace!</p>
          )}
        </div>
      )}

      {/* PORTFOLIO MANAGER TAB */}
      {activeTab === "portfolio" && (
        <div className="catalog-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {portfolio.map((item) => (
            <div key={item.id} className="glass-panel catalog-item-card" style={{ padding: 0, overflow: "hidden" }}>
              <img
                src={item.image_url || "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400"}
                alt={item.title}
                style={{ width: "100%", height: "180px", objectFit: "cover" }}
              />
              <div style={{ padding: "1rem" }}>
                <h4 className="catalog-title">{item.title}</h4>
                <p className="catalog-desc">{item.description}</p>
                <div className="catalog-footer">
                  <span className="catalog-price">{item.price ? `₹${item.price}` : "Custom Work"}</span>
                  <button
                    onClick={() => handleDeletePortfolio(item.id)}
                    className="btn-danger btn-xs"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {portfolio.length === 0 && <p className="empty-msg">No portfolio work examples uploaded. Add work samples to wow clients!</p>}
        </div>
      )}

      {/* MY SERVICES LIST TAB */}
      {activeTab === "services" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Offered Services</h3>
            <button
              onClick={() => setShowAddService(!showAddService)}
              className="btn-primary"
              style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <Plus size={16} /> {showAddService ? "Cancel" : "Add New Service"}
            </button>
          </div>

          {showAddService && (
            <form onSubmit={handleCreateService} className="glass-panel" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
              <h4 style={{ marginBottom: "1rem", fontWeight: 700 }}>Add a Service Listing</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label className="field-label">Service Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Leather Shoe Resoling"
                    value={newService.title}
                    onChange={(e) => setNewService({ ...newService, title: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="field-label">Price (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 350"
                    value={newService.price}
                    onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label className="field-label">Description</label>
                <textarea
                  placeholder="Describe your craftsmanship, materials, and service scope..."
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  className="form-input"
                  rows={3}
                />
              </div>
              <button type="submit" className="btn-primary">Save Service</button>
            </form>
          )}

          <div className="catalog-grid">
            {myServices.map((svc) => (
              <div key={svc.id} className="glass-panel catalog-item-card">
                <h4 className="catalog-title">{svc.title}</h4>
                <p className="catalog-desc">{svc.description}</p>
                <div className="catalog-footer">
                  <span className="catalog-price">₹{svc.price}</span>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button onClick={() => api.deleteService(svc.id).then(() => fetchData())} className="btn-danger btn-xs">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {myServices.length === 0 && !showAddService && (
            <p className="empty-msg">No services listed yet. Click "Add New Service" above to list your first service!</p>
          )}
        </div>
      )}

      {/* MY PRODUCTS LIST TAB */}
      {activeTab === "products" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Handcrafted Products</h3>
            <button
              onClick={() => setShowAddProduct(!showAddProduct)}
              className="btn-primary"
              style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <Plus size={16} /> {showAddProduct ? "Cancel" : "Add New Product"}
            </button>
          </div>

          {showAddProduct && (
            <form onSubmit={handleCreateProduct} className="glass-panel" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
              <h4 style={{ marginBottom: "1rem", fontWeight: 700 }}>Add a Handmade Product</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label className="field-label">Product Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Terracotta Water Matka"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="field-label">Price (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 500"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label className="field-label">Description</label>
                <textarea
                  placeholder="Describe your handmade craft, materials used, dimensions..."
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="form-input"
                  rows={3}
                />
              </div>
              <button type="submit" className="btn-primary">Save Product</button>
            </form>
          )}

          <div className="catalog-grid">
            {myProducts.map((prod) => (
              <div key={prod.id} className="glass-panel catalog-item-card">
                <h4 className="catalog-title">{prod.name}</h4>
                <p className="catalog-desc">{prod.description}</p>
                <div className="catalog-footer">
                  <span className="catalog-price">₹{prod.price}</span>
                  <button onClick={() => api.deleteProduct(prod.id).then(() => fetchData())} className="btn-danger btn-xs">Delete</button>
                </div>
              </div>
            ))}
          </div>
          {myProducts.length === 0 && !showAddProduct && (
            <p className="empty-msg">No products listed yet. Click "Add New Product" above to list your crafts!</p>
          )}
        </div>
      )}

      {/* AVAILABILITY & SCHEDULE TAB */}
      {activeTab === "availability" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Online / Offline Status Card */}
          <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#f8fafc", margin: 0 }}>
                Availability & Lead Status
              </h3>
              <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.25rem", margin: 0 }}>
                {ep.is_available
                  ? "🟢 ONLINE — Your profile is active and customers can book services and send quote requests."
                  : "🔴 OFFLINE — Temporarily paused. Your profile will show as unavailable for new bookings."}
              </p>
            </div>
            <button
              onClick={handleToggleAvailability}
              className={ep.is_available ? "btn-success" : "btn-secondary"}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1.2rem", fontWeight: 700 }}
            >
              {ep.is_available ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              <span>{ep.is_available ? "Currently Online" : "Currently Offline"}</span>
            </button>
          </div>

          {/* Add Working Hours Slot */}
          <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "1rem" }}>
            <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#f8fafc", marginBottom: "1rem" }}>
              Add Weekly Operating Hours
            </h4>
            <form onSubmit={handleAddAvailabilitySlot} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "1rem", alignItems: "flex-end" }}>
              <div>
                <label className="field-label">Day of Week</label>
                <select
                  value={newSlot.day_of_week}
                  onChange={(e) => setNewSlot({ ...newSlot, day_of_week: e.target.value })}
                  className="form-input"
                  style={{ background: "#0f172a" }}
                >
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                  <option value="0">Sunday</option>
                </select>
              </div>

              <div>
                <label className="field-label">Start Time</label>
                <input
                  type="time"
                  required
                  value={newSlot.start_time}
                  onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="field-label">End Time</label>
                <input
                  type="time"
                  required
                  value={newSlot.end_time}
                  onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                  className="form-input"
                />
              </div>

              <button type="submit" className="btn-primary" style={{ height: "42px" }}>
                <Plus size={16} />
                <span>Save Slot</span>
              </button>
            </form>
          </div>

          {/* Configured Slots List */}
          <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "1rem" }}>
            <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#f8fafc", marginBottom: "1rem" }}>
              Active Operating Slots ({availability.length})
            </h4>

            {availability.length === 0 ? (
              <p className="empty-msg">No customized schedule slots configured. By default you are open during standard business hours.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
                {availability.map((slot) => {
                  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                  return (
                    <div
                      key={slot.id}
                      style={{
                        background: "rgba(15, 23, 42, 0.7)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "10px",
                        padding: "1rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <strong style={{ color: "#f59e0b", fontSize: "0.95rem" }}>
                          {dayNames[slot.day_of_week] || "Day"}
                        </strong>
                        <div style={{ color: "#cbd5e1", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                          <Clock size={12} style={{ display: "inline", marginRight: "4px" }} />
                          {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAvailabilitySlot(slot.id)}
                        className="btn-danger btn-xs"
                        title="Delete slot"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EARNINGS OVERVIEW TAB */}
      {activeTab === "earnings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Top Revenue Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "1rem" }}>
              <span className="metric-label">Total Gross Earnings</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#10b981", marginTop: "0.35rem" }}>
                ₹{counts.earnings || 0}
              </div>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>100% direct to you</span>
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "1rem" }}>
              <span className="metric-label">Service Booking Earnings</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f59e0b", marginTop: "0.35rem" }}>
                ₹{counts.service_earnings || 0}
              </div>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{counts.completed_bookings || 0} delivered service jobs</span>
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "1rem" }}>
              <span className="metric-label">Product Sales Revenue</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#06b6d4", marginTop: "0.35rem" }}>
                ₹{counts.product_earnings || 0}
              </div>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{counts.completed_orders || 0} fulfilled product orders</span>
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "1rem" }}>
              <span className="metric-label">Platform Commission</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#c084fc", marginTop: "0.35rem" }}>
                0% FREE
              </div>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Zero middleman deductions</span>
            </div>
          </div>

          {/* Recent Completed Transactions */}
          <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "1rem" }}>
            <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#f8fafc", marginBottom: "1rem" }}>
              Completed Earning Transactions
            </h4>

            {(!dashboard?.recent_transactions || dashboard.recent_transactions.length === 0) ? (
              <p className="empty-msg">No completed transactions recorded yet. Delivered services and fulfilled orders will appear here automatically.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", fontSize: "0.8rem", textTransform: "uppercase" }}>
                      <th style={{ padding: "0.75rem 0.5rem" }}>Type</th>
                      <th style={{ padding: "0.75rem 0.5rem" }}>Item / Service</th>
                      <th style={{ padding: "0.75rem 0.5rem" }}>Customer</th>
                      <th style={{ padding: "0.75rem 0.5rem" }}>Date</th>
                      <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recent_transactions.map((tx, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "0.75rem 0.5rem" }}>
                          <span className={`badge ${tx.type === "PRODUCT" ? "badge-completed" : "badge-accepted"}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600, color: "#f8fafc" }}>
                          {tx.title}
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem", color: "#cbd5e1" }}>
                          {tx.customer_name || "Verified Customer"}
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem", color: "#94a3b8", fontSize: "0.85rem" }}>
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", fontWeight: 700, color: "#10b981" }}>
                          +₹{tx.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB SKILLS & SPECIALTIES */}
      {activeTab === "skills" && (
        <div className="ep-section-stack">
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <h3 className="section-title">My Craftsmanship Skills & Specialties</h3>
                <p className="section-subtitle">
                  Tag specific techniques and skills to help local customers match with your services.
                </p>
              </div>

              {/* Add Skill Form */}
              <form onSubmit={handleAddSkill} style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <select
                  value={selectedSkillToAdd}
                  onChange={(e) => setSelectedSkillToAdd(e.target.value)}
                  style={{
                    padding: "0.6rem 0.85rem",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    minWidth: "200px"
                  }}
                >
                  <option value="">Select skill to add...</option>
                  {allSkills
                    .filter((s) => !mySkills.some((ms) => ms.id === s.id))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category_name || "General"})
                      </option>
                    ))}
                </select>
                <button
                  type="submit"
                  disabled={!selectedSkillToAdd}
                  className="btn-primary"
                  style={{ padding: "0.6rem 1rem" }}
                >
                  <Plus size={15} />
                  <span>Add Skill</span>
                </button>
              </form>
            </div>

            {mySkills.length === 0 ? (
              <div className="empty-panel-box">
                <Tag size={32} style={{ margin: "0 auto 0.75rem", opacity: 0.4 }} />
                <h4>No Skills Added Yet</h4>
                <p>Select skills from the dropdown above to showcase your capabilities to customers.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                {mySkills.map((skill) => (
                  <div
                    key={skill.id}
                    style={{
                      padding: "1rem 1.25rem",
                      background: "rgba(15, 23, 42, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "var(--radius-md)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "0.75rem"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#f8fafc" }}>
                          {skill.name}
                        </h4>
                        <span className="badge badge-accepted" style={{ fontSize: "0.68rem" }}>
                          {skill.category_name || "Trade"}
                        </span>
                      </div>
                      <p style={{ margin: "0.4rem 0 0", fontSize: "0.78rem", color: "#94a3b8", lineHeight: 1.4 }}>
                        {skill.description || "Specialized craftsmanship skill"}
                      </p>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill.id, skill.name)}
                        className="btn-danger"
                        style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
                        title="Remove Skill"
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CUSTOMER REVIEWS */}
      {activeTab === "reviews" && (
        <div className="ep-section-stack">
          {/* Top Metric Overview */}
          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h3 className="section-title">Verified Customer Reviews</h3>
              <p className="section-subtitle">
                Authentic feedback from verified customers who booked your services or ordered handmade goods.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "#f59e0b", display: "flex", alignItems: "center", gap: "0.4rem", justifyContent: "flex-end" }}>
                  <Star size={24} fill="#f59e0b" />
                  <span>{ep.average_rating || "5.0"}</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  Average Rating Across {myReviews.length} Reviews
                </div>
              </div>
            </div>
          </div>

          {/* Reviews List */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            {myReviews.length === 0 ? (
              <div className="empty-panel-box">
                <Star size={32} style={{ margin: "0 auto 0.75rem", opacity: 0.4, color: "#f59e0b" }} />
                <h4>No Reviews Received Yet</h4>
                <p>Complete bookings and orders to receive verified customer reviews and build your local reputation.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {myReviews.map((rev) => (
                  <div
                    key={rev.id}
                    style={{
                      padding: "1.25rem",
                      background: "rgba(15, 23, 42, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "var(--radius-md)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.6rem"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <img
                          src={rev.customer_image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                          alt={rev.customer_name}
                          style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }}
                        />
                        <div>
                          <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "#f8fafc" }}>
                            {rev.customer_name || "Verified Customer"}
                          </h4>
                          <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                            {new Date(rev.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                            {rev.product_name ? ` • Product: ${rev.product_name}` : rev.service_title ? ` • Service: ${rev.service_title}` : ""}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            fill={s <= Number(rev.rating) ? "#f59e0b" : "none"}
                            color={s <= Number(rev.rating) ? "#f59e0b" : "#64748b"}
                          />
                        ))}
                      </div>
                    </div>

                    <p style={{ margin: "0.25rem 0 0", color: "#cbd5e1", fontSize: "0.85rem", lineHeight: 1.5 }}>
                      "{rev.comment}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB BUSINESS PROFILE */}
      {activeTab === "profile" && (
        <div className="ep-section-stack">
          <div className="glass-panel" style={{ padding: "2rem", borderRadius: "var(--radius-lg)" }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <h3 className="section-title">Micro-Entrepreneur Business Profile</h3>
              <p className="section-subtitle">
                Manage your public trade information, location, and craft bio so local customers can easily discover and connect with you.
              </p>
            </div>

            <form onSubmit={handleUpdateBusinessProfile} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "800px" }}>
              <div>
                <label className="field-label" style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", color: "#cbd5e1" }}>
                  Business / Trade Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Handcrafted Leather & Shoe Care"
                  value={onboardingData.business_name}
                  onChange={(e) => setOnboardingData({ ...onboardingData, business_name: e.target.value })}
                  style={{ width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", color: "#fff" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label className="field-label" style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", color: "#cbd5e1" }}>
                    Primary City *
                  </label>
                  <select
                    value={onboardingData.city}
                    onChange={(e) => setOnboardingData({ ...onboardingData, city: e.target.value })}
                    style={{ width: "100%", padding: "0.75rem", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", color: "#fff" }}
                  >
                    <option value="Mumbai">Mumbai</option>
                    <option value="Pune">Pune</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Bengaluru">Bengaluru</option>
                    <option value="Jaipur">Jaipur</option>
                    <option value="Varanasi">Varanasi</option>
                    <option value="Kolkata">Kolkata</option>
                    <option value="Chennai">Chennai</option>
                  </select>
                </div>

                <div>
                  <label className="field-label" style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", color: "#cbd5e1" }}>
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={onboardingData.experience_years}
                    onChange={(e) => setOnboardingData({ ...onboardingData, experience_years: e.target.value })}
                    style={{ width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", color: "#fff" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label className="field-label" style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", color: "#cbd5e1" }}>
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={onboardingData.phone}
                    onChange={(e) => setOnboardingData({ ...onboardingData, phone: e.target.value })}
                    style={{ width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", color: "#fff" }}
                  />
                </div>

                <div>
                  <label className="field-label" style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", color: "#cbd5e1" }}>
                    Workshop / Shop Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shop 12, Main Craft Market, Bandra"
                    value={onboardingData.address}
                    onChange={(e) => setOnboardingData({ ...onboardingData, address: e.target.value })}
                    style={{ width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", color: "#fff" }}
                  />
                </div>
              </div>

              <div>
                <label className="field-label" style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", color: "#cbd5e1" }}>
                  About Your Work & Craft Specializations
                </label>
                <textarea
                  rows="4"
                  placeholder="Describe your craft expertise, services offered, repair guarantees or handmade items..."
                  value={onboardingData.bio}
                  onChange={(e) => setOnboardingData({ ...onboardingData, bio: e.target.value })}
                  style={{ width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", color: "#fff" }}
                />
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                <button
                  type="submit"
                  disabled={submittingProfile}
                  className="btn-primary"
                  style={{ padding: "0.75rem 1.5rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <CheckCircle2 size={16} />
                  <span>{submittingProfile ? "Saving Profile..." : "Save Business Profile"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUBMIT QUOTE */}
      {quotingLead && (
        <div className="modal-overlay-backdrop animate-fade-in">
          <div className="glass-panel modal-dialog-card">
            <h3 className="modal-title mb-lg">Submit Price Proposal Quote</h3>
            <p style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "1rem" }}>
              Requirement: {quotingLead.title || quotingLead.service_title}
            </p>
            <form onSubmit={handleSubmitQuote} className="form-group-stack">
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Proposed Total Price (₹)</label>
              <input
                type="number"
                required
                placeholder="e.g. 750"
                value={quoteData.proposed_price}
                onChange={(e) => setQuoteData({ ...quoteData, proposed_price: e.target.value })}
                className="form-input"
              />

              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Estimated Completion Time</label>
              <input
                type="text"
                required
                placeholder="e.g. 2 Days / 24 Hours"
                value={quoteData.estimated_completion}
                onChange={(e) => setQuoteData({ ...quoteData, estimated_completion: e.target.value })}
                className="form-input"
              />

              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Message to Customer</label>
              <textarea
                placeholder="Describe your craft expertise, material quality, or approach..."
                value={quoteData.message}
                onChange={(e) => setQuoteData({ ...quoteData, message: e.target.value })}
                className="form-input"
                rows={3}
              />

              <div className="modal-action-row">
                <button type="button" onClick={() => setQuotingLead(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary-amber">Submit Quote</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADD PORTFOLIO */}
      {showAddPortfolio && (
        <div className="modal-overlay-backdrop animate-fade-in">
          <div className="glass-panel modal-dialog-card">
            <h3 className="modal-title mb-lg">Add Work Showcase Portfolio</h3>
            <form onSubmit={handleCreatePortfolio} className="form-group-stack">
              <input type="text" required placeholder="Project / Work Title" value={newPortfolio.title} onChange={e => setNewPortfolio({...newPortfolio, title: e.target.value})} className="form-input" />
              <textarea required placeholder="Description of materials used, craft process..." value={newPortfolio.description} onChange={e => setNewPortfolio({...newPortfolio, description: e.target.value})} className="form-input" />
              <input type="url" placeholder="Image URL (e.g. Unsplash or photo link)" value={newPortfolio.image_url} onChange={e => setNewPortfolio({...newPortfolio, image_url: e.target.value})} className="form-input" />
              <input type="number" placeholder="Approx Price (₹)" value={newPortfolio.price} onChange={e => setNewPortfolio({...newPortfolio, price: e.target.value})} className="form-input" />
              <div className="modal-action-row">
                <button type="button" onClick={() => setShowAddPortfolio(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary-amber">Save Portfolio Work</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHAT MODAL */}
      {chatPartner && (
        <ChatModal
          partner={chatPartner}
          currentUser={user}
          onClose={() => setChatPartner(null)}
        />
      )}
    </div>
  );
}
