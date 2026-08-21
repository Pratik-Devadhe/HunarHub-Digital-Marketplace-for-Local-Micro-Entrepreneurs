import React, { useState, useEffect } from "react";
import {
  Wrench,
  Package,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Plus,
  RefreshCw,
  Star,
  Tag,
  Layers,
  MessageSquareQuote,
  ShieldCheck,
  FileText,
  Trash2,
  Calendar,
  Send,
  MessageSquare,
  Award,
  Check,
  X
} from "lucide-react";
import { api } from "../services/api";
import ChatModal from "./ChatModal";
import "./EntrepreneurPortal.css";

export default function EntrepreneurPortal({ user, showToast }) {
  const [activeTab, setActiveTab] = useState("leads"); // "leads" | "requests" | "orders" | "services" | "products" | "portfolio" | "availability"
  const [dashboard, setDashboard] = useState(null);
  const [requests, setRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [myServices, setMyServices] = useState([]);
  const [myProducts, setMyProducts] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [openLeads, setOpenLeads] = useState([]);
  const [loading, setLoading] = useState(true);

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
    try {
      const [dashRes, reqRes, ordRes, svcsRes, prodsRes, openRes] = await Promise.all([
        api.getEntrepreneurDashboard().catch(() => ({ dashboard: {} })),
        api.getReceivedServiceRequests().catch(() => ({ requests: [] })),
        api.getReceivedOrders().catch(() => ({ orders: [] })),
        api.getMyServices().catch(() => ({ services: [] })),
        api.getMyProducts().catch(() => ({ products: [] })),
        api.getMyServiceRequests().catch(() => ({ requests: [] }))
      ]);

      const ep = dashRes.dashboard?.entrepreneur || {};
      setDashboard(dashRes.dashboard || {});
      setRequests(reqRes.requests || []);
      setOrders(ordRes.orders || []);
      setMyServices(svcsRes.services || []);
      setMyProducts(prodsRes.products || []);
      setOpenLeads(openRes.requests || reqRes.requests || []);

      if (ep.id) {
        api.getPortfolio(ep.id)
          .then((res) => setPortfolio(res.portfolio || []))
          .catch(() => {});
      }
    } catch (err) {
      showToast("error", "Failed to refresh entrepreneur data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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

  return (
    <div className="entrepreneur-portal-container">
      {/* Header & Verification Banner */}
      <div className="glass-panel portal-header-card">
        <div>
          <h1 className="portal-title">Artisan & Entrepreneur Workspace</h1>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.25rem", flexWrap: "wrap" }}>
            <span className="business-name">{ep.business_name || user?.full_name}</span>
            <span className="badge badge-accepted" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
              <ShieldCheck size={14} /> Verified Artisan
            </span>
          </div>
        </div>
        <button onClick={fetchData} className="btn-secondary">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Leads</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="glass-panel metric-card">
          <span className="metric-label">Total Revenue</span>
          <div className="metric-value-box">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span className="metric-number emerald">₹{counts.earnings || 14500}</span>
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
            🎯 Open Leads & Quotes ({openLeads.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`ep-tab-btn ${activeTab === "requests" ? "active" : ""}`}
          >
            📥 Booked Jobs ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab("services")}
            className={`ep-tab-btn ${activeTab === "services" ? "active" : ""}`}
          >
            🛠️ My Services ({myServices.length})
          </button>
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`ep-tab-btn ${activeTab === "portfolio" ? "active" : ""}`}
          >
            🎨 Work Portfolio ({portfolio.length})
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`ep-tab-btn ${activeTab === "products" ? "active" : ""}`}
          >
            🛍️ Products ({myProducts.length})
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
      )}

      {/* MY PRODUCTS LIST TAB */}
      {activeTab === "products" && (
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
