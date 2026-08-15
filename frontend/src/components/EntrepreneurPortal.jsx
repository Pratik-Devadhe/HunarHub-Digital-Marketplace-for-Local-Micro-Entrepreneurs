import React, { useState, useEffect } from "react";
import { Wrench, Package, DollarSign, Clock, CheckCircle2, XCircle, Play, Plus, RefreshCw, Star, Tag, Layers } from "lucide-react";
import { api } from "../services/api";
import "./EntrepreneurPortal.css";

export default function EntrepreneurPortal({ user, showToast }) {
  const [activeTab, setActiveTab] = useState("requests"); // "requests" | "orders" | "services" | "products"
  const [dashboard, setDashboard] = useState(null);
  const [requests, setRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [myServices, setMyServices] = useState([]);
  const [myProducts, setMyProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals for adding/editing product/service
  const [showAddService, setShowAddService] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

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
      const [dashRes, reqRes, ordRes, svcsRes, prodsRes] = await Promise.all([
        api.getEntrepreneurDashboard().catch(() => ({ dashboard: {} })),
        api.getReceivedServiceRequests().catch(() => ({ requests: [] })),
        api.getReceivedOrders().catch(() => ({ orders: [] })),
        api.getMyServices().catch(() => ({ services: [] })),
        api.getMyProducts().catch(() => ({ products: [] }))
      ]);

      setDashboard(dashRes.dashboard || {});
      setRequests(reqRes.requests || []);
      setOrders(ordRes.orders || []);
      setMyServices(svcsRes.services || []);
      setMyProducts(prodsRes.products || []);
    } catch (err) {
      showToast("error", "Failed to refresh entrepreneur data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  // Order actions
  const handleOrderAction = async (id, action) => {
    try {
      if (action === "confirm") await api.confirmOrder(id);
      if (action === "process") await api.processOrder(id);
      if (action === "ready") await api.markOrderReady(id);
      if (action === "complete") await api.completeOrder(id);
      if (action === "cancel") await api.cancelOrder(id);
      showToast("success", `Order updated: ${action}`);
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

  const openEditServiceModal = (svc) => {
    setEditingService(svc);
    setNewService({
      category_id: svc.category_id || "1",
      skill_id: svc.skill_id || "1",
      title: svc.title || "",
      description: svc.description || "",
      price: svc.price || "",
      price_type: svc.price_type || "FIXED",
      estimated_duration: svc.estimated_duration || "60"
    });
  };

  const openEditProductModal = (prod) => {
    setEditingProduct(prod);
    setNewProduct({
      category_id: prod.category_id || "1",
      name: prod.name || "",
      description: prod.description || "",
      price: prod.price || "",
      stock_quantity: prod.stock_quantity || "10"
    });
  };

  const counts = dashboard?.counts || {};

  return (
    <div className="entrepreneur-portal-container">
      {/* Header */}
      <div className="glass-panel portal-header-card">
        <div>
          <h1 className="portal-title">Entrepreneur Management Hub</h1>
          <p className="portal-subtitle">
            Business: <span className="business-name">{dashboard?.entrepreneur?.business_name || user?.full_name}</span>
          </p>
        </div>
        <button onClick={fetchData} className="btn-secondary">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Overview Metrics Grid */}
      <div className="metrics-grid">
        <div className="glass-panel metric-card">
          <span className="metric-label">Total Earnings</span>
          <div className="metric-value-box">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span className="metric-number emerald">₹{counts.earnings || 0}</span>
          </div>
        </div>

        <div className="glass-panel metric-card">
          <span className="metric-label">Pending Bookings</span>
          <div className="metric-value-box">
            <Clock className="w-5 h-5 text-amber-400" />
            <span className="metric-number amber">{counts.pending_requests || 0}</span>
          </div>
        </div>

        <div className="glass-panel metric-card">
          <span className="metric-label">Active Orders</span>
          <div className="metric-value-box">
            <Package className="w-5 h-5 text-cyan-400" />
            <span className="metric-number cyan">{counts.orders || 0}</span>
          </div>
        </div>

        <div className="glass-panel metric-card">
          <span className="metric-label">Active Offerings</span>
          <div className="metric-value-box">
            <Layers className="w-5 h-5 text-purple-400" />
            <span className="metric-number purple">{(counts.services || 0) + (counts.products || 0)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ep-tabs-bar">
        <div className="ep-tab-group">
          <button
            onClick={() => setActiveTab("requests")}
            className={`ep-tab-btn ${activeTab === "requests" ? "active" : ""}`}
          >
            📥 Bookings ({requests.length})
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
            🛍️ My Products ({myProducts.length})
          </button>
        </div>

        {activeTab === "services" && (
          <button onClick={() => { setEditingService(null); setNewService({ category_id: "1", skill_id: "1", title: "", description: "", price: "", price_type: "FIXED", estimated_duration: "60" }); setShowAddService(true); }} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span>Add New Service</span>
          </button>
        )}
        {activeTab === "products" && (
          <button onClick={() => { setEditingProduct(null); setNewProduct({ category_id: "1", name: "", description: "", price: "", stock_quantity: "10" }); setShowAddProduct(true); }} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Bookings Tab */}
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
                <p>📅 Requested: {new Date(sr.requested_date).toLocaleDateString()} at {sr.requested_time}</p>
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
                    <>
                      <button onClick={() => handleServiceAction(sr.id, "start")} className="btn-primary btn-sm">Start Work</button>
                      <button onClick={() => handleServiceAction(sr.id, "cancel")} className="btn-outline btn-sm">Cancel</button>
                    </>
                  )}
                  {sr.status === "IN_PROGRESS" && (
                    <button onClick={() => handleServiceAction(sr.id, "complete")} className="btn-success btn-sm">Mark Completed</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {requests.length === 0 && <p className="empty-msg">No incoming service bookings.</p>}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <div className="items-list">
          {orders.map((ord) => (
            <div key={ord.id} className="glass-panel request-card">
              <div className="request-card-header">
                <div>
                  <h3 className="request-title">Order #{ord.id}</h3>
                  <p className="request-customer">Customer ID: #{ord.customer_id}</p>
                </div>
                <span className={`badge badge-${(ord.status || "pending").toLowerCase()}`}>{ord.status}</span>
              </div>

              <div className="order-shipping-row">
                <span>Shipping: {ord.shipping_address}</span>
                <span className="request-price">₹{ord.total_amount}</span>
              </div>

              <div className="order-action-row">
                {ord.status === "PENDING" && (
                  <button onClick={() => handleOrderAction(ord.id, "confirm")} className="btn-success btn-sm">Confirm Order</button>
                )}
                {ord.status === "CONFIRMED" && (
                  <button onClick={() => handleOrderAction(ord.id, "process")} className="btn-primary btn-sm">Process Order</button>
                )}
                {ord.status === "PROCESSING" && (
                  <button onClick={() => handleOrderAction(ord.id, "ready")} className="btn-outline btn-sm">Mark Ready</button>
                )}
                {ord.status === "READY" && (
                  <button onClick={() => handleOrderAction(ord.id, "complete")} className="btn-success btn-sm">Mark Delivered</button>
                )}
              </div>
            </div>
          ))}
          {orders.length === 0 && <p className="empty-msg">No incoming product orders.</p>}
        </div>
      )}

      {/* My Services List Tab */}
      {activeTab === "services" && (
        <div className="catalog-grid">
          {myServices.map((svc) => (
            <div key={svc.id} className="glass-panel catalog-item-card">
              <h4 className="catalog-title">{svc.title}</h4>
              <p className="catalog-desc">{svc.description}</p>
              <div className="catalog-footer">
                <span className="catalog-price">₹{svc.price}</span>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button onClick={() => openEditServiceModal(svc)} className="btn-secondary btn-xs">Edit</button>
                  <button onClick={() => api.deleteService(svc.id).then(() => { showToast("info", "Service deleted"); fetchData(); })} className="btn-danger btn-xs">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My Products List Tab */}
      {activeTab === "products" && (
        <div className="catalog-grid">
          {myProducts.map((prod) => (
            <div key={prod.id} className="glass-panel catalog-item-card">
              <h4 className="catalog-title">{prod.name}</h4>
              <p className="catalog-desc">{prod.description}</p>
              <div className="catalog-footer">
                <span className="catalog-price">₹{prod.price} <span className="catalog-qty">(Qty: {prod.stock_quantity})</span></span>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button onClick={() => openEditProductModal(prod)} className="btn-secondary btn-xs">Edit</button>
                  <button onClick={() => api.deleteProduct(prod.id).then(() => { showToast("info", "Product deleted"); fetchData(); })} className="btn-danger btn-xs">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add / Edit Service */}
      {(showAddService || editingService) && (
        <div className="modal-overlay-backdrop animate-fade-in">
          <div className="glass-panel modal-dialog-card">
            <h3 className="modal-title mb-lg">{editingService ? "Edit Craft Service" : "Add New Craft Service"}</h3>
            <form onSubmit={handleCreateService} className="form-group-stack">
              <input type="text" required placeholder="Service Title (e.g. Shoe Repair)" value={newService.title} onChange={e => setNewService({...newService, title: e.target.value})} className="form-input" />
              <textarea required placeholder="Description of service..." value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} className="form-input" />
              <div className="form-grid-row">
                <input type="number" required placeholder="Price (₹)" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} className="form-input" />
                <input type="number" placeholder="Est. Mins" value={newService.estimated_duration} onChange={e => setNewService({...newService, estimated_duration: e.target.value})} className="form-input" />
              </div>
              <div className="modal-action-row">
                <button type="button" onClick={() => { setShowAddService(false); setEditingService(null); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editingService ? "Update Service" : "Save Service"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Product */}
      {(showAddProduct || editingProduct) && (
        <div className="modal-overlay-backdrop animate-fade-in">
          <div className="glass-panel modal-dialog-card">
            <h3 className="modal-title mb-lg">{editingProduct ? "Edit Handmade Product" : "Add Handmade Product"}</h3>
            <form onSubmit={handleCreateProduct} className="form-group-stack">
              <input type="text" required placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="form-input" />
              <textarea required placeholder="Description..." value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="form-input" />
              <div className="form-grid-row">
                <input type="number" required placeholder="Price (₹)" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="form-input" />
                <input type="number" required placeholder="Stock Quantity" value={newProduct.stock_quantity} onChange={e => setNewProduct({...newProduct, stock_quantity: e.target.value})} className="form-input" />
              </div>
              <div className="modal-action-row">
                <button type="button" onClick={() => { setShowAddProduct(false); setEditingProduct(null); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editingProduct ? "Update Product" : "Save Product"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
