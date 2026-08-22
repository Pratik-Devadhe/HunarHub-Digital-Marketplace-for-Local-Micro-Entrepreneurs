import React, { useState, useEffect } from "react";
import {
  Package,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  CreditCard,
  Star,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  MessageSquareQuote,
  MessageSquare,
  Heart,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  FileText
} from "lucide-react";
import { api } from "../services/api";
import ChatModal from "./ChatModal";
import "./CustomerPortal.css";

export default function CustomerPortal({ onOpenReview, showToast, currentUser }) {
  const [activeTab, setActiveTab] = useState("requests"); // "requests" | "orders" | "favorites"
  const [orders, setOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quotes drawer state
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [requestQuotesMap, setRequestQuotesMap] = useState({});
  const [quotesLoading, setQuotesLoading] = useState(false);

  // Chat Modal State
  const [chatPartner, setChatPartner] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordRes, reqRes, favRes] = await Promise.all([
        api.getMyOrders().catch(() => ({ orders: [] })),
        api.getMyServiceRequests().catch(() => ({ requests: [] })),
        api.getFavorites().catch(() => ({ favorites: [] }))
      ]);
      setOrders(ordRes.orders || []);
      setRequests(reqRes.requests || []);
      setFavorites(favRes.favorites || []);
    } catch (err) {
      showToast("error", "Failed to load customer dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleQuotes = (srId) => {
    if (expandedRequestId === srId) {
      setExpandedRequestId(null);
      return;
    }
    setExpandedRequestId(srId);
    setQuotesLoading(true);
    api.getQuotesForRequest(srId)
      .then((res) => {
        if (res && res.quotes) {
          setRequestQuotesMap((prev) => ({ ...prev, [srId]: res.quotes }));
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setQuotesLoading(false));
  };

  const handleAcceptQuote = async (quoteId) => {
    try {
      await api.acceptQuote(quoteId);
      showToast("success", "Quote accepted! Artisan has been assigned to your request.");
      fetchData();
    } catch (err) {
      showToast("error", err.message || "Failed to accept quote");
    }
  };

  const handleRejectQuote = async (quoteId) => {
    try {
      await api.rejectQuote(quoteId);
      showToast("info", "Quote rejected");
      if (expandedRequestId) toggleQuotes(expandedRequestId);
    } catch (err) {
      showToast("error", err.message || "Failed to reject quote");
    }
  };

  const handlePayOrder = async (orderId) => {
    try {
      const pOrder = await api.createPaymentOrder({ order_id: orderId });
      await api.verifyPayment({
        razorpay_order_id: pOrder.razorpay_order.id,
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        order_id: orderId
      });
      showToast("success", "Payment successful! Order updated.");
      fetchData();
    } catch (err) {
      showToast("error", err.message || "Payment failed");
    }
  };

  const handlePayServiceRequest = async (srId) => {
    try {
      const pOrder = await api.createPaymentOrder({ service_request_id: srId });
      await api.verifyPayment({
        razorpay_order_id: pOrder.razorpay_order.id,
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        service_request_id: srId
      });
      showToast("success", "Payment successful for service request!");
      fetchData();
    } catch (err) {
      showToast("error", err.message || "Payment failed");
    }
  };

  const getOrderStatusProgress = (status) => {
    const steps = ["PENDING", "CONFIRMED", "PROCESSING", "READY", "COMPLETED"];
    const idx = steps.indexOf(status);
    return idx === -1 ? 0 : Math.round(((idx + 1) / steps.length) * 100);
  };

  return (
    <div className="customer-portal-container">
      {/* Header */}
      <div className="glass-panel portal-header-card">
        <div>
          <h1 className="portal-title">Customer Dashboard & Activity</h1>
          <p className="portal-subtitle">Manage service requests, compare artisan price quotes, track orders & chat directly with experts</p>
        </div>
        <button onClick={fetchData} className="btn-secondary">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="portal-tabs-row">
        <button
          onClick={() => setActiveTab("requests")}
          className={`portal-tab-btn ${activeTab === "requests" ? "active" : ""}`}
        >
          <Calendar className="w-4 h-4" />
          <span>Service Requests & Quotes ({requests.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`portal-tab-btn ${activeTab === "orders" ? "active" : ""}`}
        >
          <Package className="w-4 h-4" />
          <span>Product Orders ({orders.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("favorites")}
          className={`portal-tab-btn ${activeTab === "favorites" ? "active" : ""}`}
        >
          <Heart className="w-4 h-4" />
          <span>Saved Favorites ({favorites.length})</span>
        </button>
      </div>

      {/* SERVICE REQUESTS & MULTI-QUOTE TAB */}
      {activeTab === "requests" && (
        <div className="orders-list">
          {requests.map((sr) => {
            const quotes = requestQuotesMap[sr.id] || [];
            const isExpanded = expandedRequestId === sr.id;

            return (
              <div key={sr.id} className="glass-panel order-history-card">
                <div className="order-card-header">
                  <div>
                    <div className="order-id-row">
                      <h3 className="order-id-title">{sr.title || sr.service_title || "Custom Service Request"}</h3>
                      <span className={`badge badge-${(sr.status || "pending").toLowerCase()}`}>
                        {sr.status}
                      </span>
                      {sr.category_name && (
                        <span className="badge badge-accepted">{sr.category_name}</span>
                      )}
                    </div>
                    <p className="portal-subtitle">Artisan / Business: {sr.business_name || "Open Marketplace Request"}</p>
                  </div>
                  <div className="order-price-box">
                    <span className="order-price-label">{sr.final_price ? "Final Agreed Price" : "Target Budget"}</span>
                    <span className="order-price-value">
                      ₹{sr.final_price || sr.budget_max || sr.estimated_price || "Open Quote"}
                    </span>
                  </div>
                </div>

                <div className="service-details-grid">
                  <div className="service-detail-box">
                    <span className="service-detail-label">Requested Date & City</span>
                    <div className="service-detail-values">
                      <span className="service-detail-val"><Calendar className="detail-icon" /> {sr.requested_date ? new Date(sr.requested_date).toLocaleDateString() : "Flexible"}</span>
                      <span className="service-detail-val"><MapPin className="detail-icon" /> {sr.city || sr.address || "Local City"}</span>
                    </div>
                  </div>

                  <div className="service-detail-box">
                    <span className="service-detail-label">Quotes Received</span>
                    <span className="service-detail-val" style={{ fontWeight: 700, color: "#d97706" }}>
                      <MessageSquareQuote className="detail-icon" /> {sr.quote_count || 0} Artisan Proposals
                    </span>
                  </div>
                </div>

                {sr.description && (
                  <p className="service-customer-note">
                    "{sr.description}"
                  </p>
                )}

                {/* Footer Controls */}
                <div className="order-card-footer">
                  <button
                    onClick={() => toggleQuotes(sr.id)}
                    className="btn-sec-outline"
                    style={{ fontSize: "0.88rem" }}
                  >
                    <MessageSquareQuote size={16} />
                    <span>{isExpanded ? "Hide Artisan Quotes" : `View & Compare Quotes (${sr.quote_count || 0})`}</span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  <div className="order-actions-box">
                    {["REQUESTED", "PENDING", "QUOTED"].includes(sr.status) && (
                      <button
                        onClick={async () => {
                          try {
                            await api.cancelServiceRequest(sr.id);
                            showToast("info", "Service request cancelled");
                            fetchData();
                          } catch (err) {
                            showToast("error", err.message || "Failed to cancel service");
                          }
                        }}
                        className="btn-danger btn-xs"
                      >
                        <span>Cancel Request</span>
                      </button>
                    )}
                    {["ACCEPTED", "CONFIRMED", "IN_PROGRESS"].includes(sr.status) && (
                      <button
                        onClick={() => setChatPartner({ user_id: sr.entrepreneur_user_id || sr.entrepreneur_id, business_name: sr.business_name, full_name: sr.entrepreneur_name })}
                        className="btn-sec-outline"
                      >
                        <MessageSquare size={14} />
                        <span>Chat Artisan</span>
                      </button>
                    )}
                    {["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(sr.status) && (
                      <button
                        onClick={() => handlePayServiceRequest(sr.id)}
                        className="btn-primary"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay Service Fee</span>
                      </button>
                    )}
                    {sr.status === "COMPLETED" && (
                      <button
                        onClick={() => onOpenReview({ entrepreneur_id: sr.entrepreneur_id, service_request_id: sr.id })}
                        className="btn-outline"
                      >
                        <Star className="w-3.5 h-3.5" />
                        <span>Rate Service</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* EXPANDED QUOTES COMPARISON DRAWER */}
                {isExpanded && (
                  <div className="quotes-drawer-container">
                    <h4 className="quotes-drawer-title">
                      Artisan Price Quotes & Completion Proposals
                    </h4>

                    {quotesLoading ? (
                      <p className="text-dim">Loading received quotes...</p>
                    ) : quotes.length === 0 ? (
                      <p className="text-dim">No quotes submitted by local artisans yet. Your request is visible in the local expert marketplace network!</p>
                    ) : (
                      <div className="quotes-cards-stack">
                        {quotes.map((q) => (
                          <div key={q.id} className="quote-proposal-card">
                            <div className="quote-proposal-header">
                              <div>
                                <h5 className="quote-artisan-name">{q.business_name}</h5>
                                <div className="quote-artisan-meta">
                                  <span><Star size={14} fill="#f59e0b" color="#f59e0b" style={{ display: "inline" }} /> {q.average_rating || "4.9"} rating</span>
                                  <span>• {q.experience_years || 5}+ Yrs Exp</span>
                                  <span>• {q.city || "Mumbai"}</span>
                                </div>
                              </div>

                              <div style={{ textAlign: "right" }}>
                                <div className="quote-proposed-price">₹{q.proposed_price}</div>
                                <div className="quote-completion-time">Est. Delivery: {q.estimated_completion || "2 Days"}</div>
                              </div>
                            </div>

                            {q.message && (
                              <p className="quote-proposal-message">
                                "{q.message}"
                              </p>
                            )}

                            <div className="quote-proposal-actions">
                              <button
                                className="btn-sec-outline"
                                style={{ padding: "0.45rem 0.85rem", fontSize: "0.82rem" }}
                                onClick={() => setChatPartner({ user_id: q.artisan_user_id || q.entrepreneur_id, business_name: q.business_name })}
                              >
                                <MessageSquare size={14} /> Message Artisan
                              </button>

                              {q.status === "PENDING" && sr.status !== "ACCEPTED" && (
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                  <button
                                    className="btn-danger btn-xs"
                                    onClick={() => handleRejectQuote(q.id)}
                                  >
                                    <X size={14} /> Reject
                                  </button>
                                  <button
                                    className="btn-primary"
                                    style={{ padding: "0.45rem 1rem", fontSize: "0.85rem" }}
                                    onClick={() => handleAcceptQuote(q.id)}
                                  >
                                    <Check size={14} /> Accept Quote & Hire
                                  </button>
                                </div>
                              )}
                              {q.status === "ACCEPTED" && (
                                <span style={{ color: "#10b981", fontWeight: 700, fontSize: "0.9rem" }}>
                                  ✓ Accepted Proposal
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {requests.length === 0 && !loading && (
            <div className="glass-panel empty-state-box">
              <Calendar className="empty-icon" />
              <p className="empty-text">No service requests booked yet.</p>
            </div>
          )}
        </div>
      )}

      {/* PRODUCT ORDERS TAB */}
      {activeTab === "orders" && (
        <div className="orders-list">
          {orders.map((ord) => (
            <div key={ord.id} className="glass-panel order-history-card">
              <div className="order-card-header">
                <div>
                  <div className="order-id-row">
                    <span className="order-id-title">Order #{ord.id}</span>
                    <span className={`badge badge-${(ord.status || "pending").toLowerCase()}`}>
                      {ord.status}
                    </span>
                    <span className={`badge ${ord.payment_status === "PAID" ? "badge-completed" : "badge-pending"}`}>
                      {ord.payment_status}
                    </span>
                  </div>
                  <p className="portal-subtitle">Placed on: {new Date(ord.created_at).toLocaleDateString()}</p>
                </div>
                <div className="order-price-box">
                  <span className="order-price-label">Total Price</span>
                  <span className="order-price-value">₹{ord.total_amount}</span>
                </div>
              </div>

              <div className="order-items-list">
                <span className="order-items-title">Ordered Items</span>
                {ord.items && ord.items.map((it, i) => (
                  <div key={i} className="order-item-row">
                    <div>
                      <span className="order-item-name">{it.product_name}</span>
                      <span className="order-item-qty">x{it.quantity}</span>
                    </div>
                    <span className="order-item-subtotal">₹{it.subtotal}</span>
                  </div>
                ))}
              </div>

              <div className="order-progress-box">
                <div className="order-progress-header">
                  <span>Fulfillment Progress</span>
                  <span className="order-progress-percent">{getOrderStatusProgress(ord.status)}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${getOrderStatusProgress(ord.status)}%` }}
                  />
                </div>
              </div>

              <div className="order-card-footer">
                <span className="order-address-box">
                  <MapPin className="address-icon" />
                  <span className="address-text">{ord.shipping_address}</span>
                </span>

                <div className="order-actions-box">
                  {ord.payment_status !== "PAID" && (
                    <button
                      onClick={() => handlePayOrder(ord.id)}
                      className="btn-primary"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pay ₹{ord.total_amount} Now</span>
                    </button>
                  )}
                  {ord.status === "COMPLETED" && (
                    <button
                      onClick={() => onOpenReview({ entrepreneur_id: ord.entrepreneur_id, product_id: ord.items?.[0]?.product_id })}
                      className="btn-outline"
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span>Rate Product</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {orders.length === 0 && !loading && (
            <div className="glass-panel empty-state-box">
              <Package className="empty-icon" />
              <p className="empty-text">You haven't placed any product orders yet.</p>
            </div>
          )}
        </div>
      )}

      {/* SAVED FAVORITES TAB */}
      {activeTab === "favorites" && (
        <div className="orders-list">
          {favorites.length === 0 ? (
            <div className="glass-panel empty-state-box">
              <Heart className="empty-icon" />
              <p className="empty-text">No saved favorite artisans, services, or products yet.</p>
            </div>
          ) : (
            <div className="favorites-grid">
              {favorites.map((fav) => (
                <div key={fav.id} className="glass-panel favorite-card">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span className="badge badge-accepted">
                      {fav.product_name ? "Product" : fav.service_title ? "Service" : "Artisan"}
                    </span>
                    <button
                      onClick={async () => {
                        await api.removeFavorite(fav.id);
                        showToast("info", "Removed from favorites");
                        fetchData();
                      }}
                      style={{ background: "none", border: "none", color: "#e11d48", cursor: "pointer" }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <h4 style={{ margin: "0 0 0.35rem 0", color: "#FFFFFF", fontSize: "1.05rem" }}>
                    {fav.product_name || fav.service_title || fav.business_name}
                  </h4>
                  <p style={{ fontSize: "0.85rem", color: "#94A3B8", margin: "0 0 0.75rem 0" }}>
                    {fav.business_name ? `By ${fav.business_name}` : "Local Craft"}
                  </p>
                  <div style={{ fontWeight: 800, color: "#F59E0B", fontSize: "1.1rem" }}>
                    {fav.product_price ? `₹${fav.product_price}` : fav.service_price ? `₹${fav.service_price}` : "Verified Artisan"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CHAT MODAL */}
      {chatPartner && (
        <ChatModal
          partner={chatPartner}
          currentUser={currentUser}
          onClose={() => setChatPartner(null)}
        />
      )}
    </div>
  );
}
