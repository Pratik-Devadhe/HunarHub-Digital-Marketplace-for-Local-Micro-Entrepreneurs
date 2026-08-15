import React, { useState, useEffect } from "react";
import { Package, Calendar, Clock, MapPin, CheckCircle2, CreditCard, Star, RefreshCw, AlertCircle, ShieldCheck } from "lucide-react";
import { api } from "../services/api";
import "./CustomerPortal.css";

export default function CustomerPortal({ onOpenReview, showToast }) {
  const [activeTab, setActiveTab] = useState("orders"); // "orders" | "requests"
  const [orders, setOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordRes, reqRes] = await Promise.all([
        api.getMyOrders().catch(() => ({ orders: [] })),
        api.getMyServiceRequests().catch(() => ({ requests: [] }))
      ]);
      setOrders(ordRes.orders || []);
      setRequests(reqRes.requests || []);
    } catch (err) {
      showToast("error", "Failed to load activity history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
          <h1 className="portal-title">My Customer Dashboard</h1>
          <p className="portal-subtitle">Track your product orders and booked artisan service requests</p>
        </div>
        <button onClick={fetchData} className="btn-secondary">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="portal-tabs-row">
        <button
          onClick={() => setActiveTab("orders")}
          className={`portal-tab-btn ${activeTab === "orders" ? "active" : ""}`}
        >
          <Package className="w-4 h-4" />
          <span>Product Orders ({orders.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`portal-tab-btn ${activeTab === "requests" ? "active" : ""}`}
        >
          <Calendar className="w-4 h-4" />
          <span>Service Bookings ({requests.length})</span>
        </button>
      </div>

      {/* Orders Tab */}
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

              {/* Items List */}
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

              {/* Progress Bar */}
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

              {/* Action Buttons */}
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

      {/* Service Requests Tab */}
      {activeTab === "requests" && (
        <div className="orders-list">
          {requests.map((sr) => (
            <div key={sr.id} className="glass-panel order-history-card">
              <div className="order-card-header">
                <div>
                  <div className="order-id-row">
                    <h3 className="order-id-title">{sr.service_title}</h3>
                    <span className={`badge badge-${(sr.status || "pending").toLowerCase()}`}>
                      {sr.status}
                    </span>
                  </div>
                  <p className="portal-subtitle">Artisan Business: {sr.business_name || "Local Entrepreneur"}</p>
                </div>
                <div className="order-price-box">
                  <span className="order-price-label">Est. Price</span>
                  <span className="order-price-value">₹{sr.final_price || sr.estimated_price}</span>
                </div>
              </div>

              <div className="service-details-grid">
                <div className="service-detail-box">
                  <span className="service-detail-label">Date & Time</span>
                  <div className="service-detail-values">
                    <span className="service-detail-val"><Calendar className="detail-icon" /> {new Date(sr.requested_date).toLocaleDateString()}</span>
                    <span className="service-detail-val"><Clock className="detail-icon" /> {sr.requested_time}</span>
                  </div>
                </div>

                <div className="service-detail-box">
                  <span className="service-detail-label">Service Address</span>
                  <span className="service-detail-val truncate"><MapPin className="detail-icon" /> {sr.address}</span>
                </div>
              </div>

              {sr.customer_note && (
                <p className="service-customer-note">
                  "{sr.customer_note}"
                </p>
              )}

              <div className="order-card-footer">
                <span className="service-booking-id">Booking ID: #{sr.id}</span>
                <div className="order-actions-box">
                  {(sr.status === "PENDING" || sr.status === "ACCEPTED") && (
                    <button
                      onClick={async () => {
                        try {
                          await api.cancelServiceRequest(sr.id);
                          showToast("info", "Service booking cancelled");
                          fetchData();
                        } catch (err) {
                          showToast("error", err.message || "Failed to cancel service");
                        }
                      }}
                      className="btn-danger btn-xs"
                    >
                      <span>Cancel Booking</span>
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
            </div>
          ))}

          {requests.length === 0 && !loading && (
            <div className="glass-panel empty-state-box">
              <Calendar className="empty-icon" />
              <p className="empty-text">No service requests booked yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
