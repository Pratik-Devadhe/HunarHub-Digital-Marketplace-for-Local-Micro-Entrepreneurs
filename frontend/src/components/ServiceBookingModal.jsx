import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, MapPin, FileText, CheckCircle } from "lucide-react";
import "./ServiceBookingModal.css";

export default function ServiceBookingModal({ service, mode = "book", isOpen, onClose, onSubmitBooking, showToast }) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [requestedDate, setRequestedDate] = useState(todayStr);
  const [requestedTime, setRequestedTime] = useState("10:00");
  const [address, setAddress] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRequestedDate(new Date().toISOString().split("T")[0]);
      setRequestedTime("10:00");
      setAddress("");
      setCustomerNote("");
    }
  }, [isOpen, service]);

  if (!isOpen || !service) return null;

  const isQuote = mode === "quote";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!address.trim()) {
      showToast("error", "Please provide a service address");
      return;
    }

    setLoading(true);
    try {
      await onSubmitBooking({
        service_id: service.id,
        entrepreneur_id: service.entrepreneur_id,
        description: service.title,
        requested_date: requestedDate,
        requested_time: requestedTime,
        address,
        estimated_price: service.price,
        customer_note: isQuote ? `[QUOTE INQUIRY] ${customerNote}` : customerNote
      });
      showToast("success", isQuote ? "Free quote request sent to artisan!" : "Service booking submitted successfully!");
      onClose();
    } catch (err) {
      showToast("error", err.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-panel modal-dialog-card relative animate-modal-pop">
        <div className="modal-header-row">
          <div className="modal-header-title-box">
            <h2 className="modal-title">{isQuote ? "Request Free Service Quote" : "Book Artisan Service"}</h2>
            <p className="modal-subtitle">{service.business_name || "Verified Local Artisan"}</p>
          </div>
          <button onClick={onClose} className="close-btn" aria-label="Close modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Service Card Summary */}
        <div className="service-summary-card">
          <div className="service-details-row">
            <h3 className="service-title">{service.title}</h3>
            <span className="service-price">₹{service.price}</span>
          </div>
          <p className="service-description">{service.description}</p>
          <div className="service-meta">
            <span>Duration: ~{service.estimated_duration || 60} mins</span>
            <span>Type: {service.price_type || "Fixed"}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="booking-form">
          <div className="form-grid-row">
            <div className="form-field">
              <label className="field-label">Service Date</label>
              <div className="input-with-icon">
                <Calendar className="input-icon" />
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={requestedDate}
                  onChange={(e) => setRequestedDate(e.target.value)}
                  className="form-input pl-icon"
                />
              </div>
            </div>

            <div className="form-field">
              <label className="field-label">Service Time</label>
              <div className="input-with-icon">
                <Clock className="input-icon" />
                <input
                  type="time"
                  required
                  value={requestedTime}
                  onChange={(e) => setRequestedTime(e.target.value)}
                  className="form-input pl-icon"
                />
              </div>
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">Service Address</label>
            <div className="input-with-icon">
              <MapPin className="input-icon" />
              <input
                type="text"
                required
                placeholder="Enter complete delivery / service address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="form-input pl-icon"
              />
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">Customer Note / Special Instructions</label>
            <div className="input-with-icon">
              <FileText className="input-icon" />
              <textarea
                rows="3"
                placeholder="Mention specific requirements (e.g. bring extra sole material, size details, handle gently)"
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                className="form-input pl-icon text-area-pad"
              />
            </div>
          </div>

          {/* Payment Notice Banner */}
          <div className="payment-notice-banner">
            <div className="payment-notice-icon-box">
              <CheckCircle className="w-5 h-5 text-emerald" />
            </div>
            <div>
              <span className="payment-notice-title">Direct Artisan Booking Mode</span>
              <p className="payment-notice-text">
                Online gateway payment is currently disabled in demo environment. Your request will be directly sent to the artisan, and payment will be settled upon service completion.
              </p>
            </div>
          </div>

          <div className="form-submit-box">
            <button type="submit" disabled={loading} className="btn-primary submit-btn">
              <CheckCircle className="w-4 h-4" />
              <span>{loading ? "Submitting..." : isQuote ? "Send Free Quote Request" : "Confirm & Send Request"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
