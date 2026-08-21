import React, { useState } from "react";
import { X, CheckCircle2, ShieldCheck, MapPin, Calendar, Clock, Sparkles, Send, PhoneCall, Star, ArrowRight, UserCheck } from "lucide-react";
import "./QuoteWizardModal.css";

export default function QuoteWizardModal({
  isOpen,
  onClose,
  service,
  category,
  city,
  entrepreneurs = [],
  onSubmitQuote,
  showToast
}) {
  const [step, setStep] = useState(1); // 1: Requirement, 2: Location & Contact, 3: Matched Experts
  const [timing, setTiming] = useState("Immediate");
  const [jobDescription, setJobDescription] = useState("");
  const [userCity, setUserCity] = useState(city || "Mumbai");
  const [pincode, setPincode] = useState("400001");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const targetCategoryName = service?.category_name || category?.name || "Local Micro-Entrepreneur Service";
  const targetTitle = service?.title || `Expert ${targetCategoryName} Requirement`;

  // Find top matching entrepreneurs in selected city
  const matchedExperts = entrepreneurs.filter((e) => {
    if (category?.id && String(e.category_id) !== String(category.id)) return false;
    return true;
  }).slice(0, 3);

  const handleNextStep1 = (e) => {
    e.preventDefault();
    if (!jobDescription.trim()) {
      showToast?.("info", "Please briefly describe what service or work you need.");
      return;
    }
    setStep(2);
  };

  const handleSubmitRequirement = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      showToast?.("info", "Please enter a valid 10-digit mobile number for experts to reach out.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSubmitQuote) {
        await onSubmitQuote({
          service_id: service?.id,
          category_name: targetCategoryName,
          title: targetTitle,
          timing,
          description: jobDescription,
          city: userCity,
          pincode,
          phone,
          status: "QUOTE_REQUESTED"
        });
      }
      setStep(3);
    } catch (err) {
      showToast?.("error", err.message || "Failed to submit quote request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setStep(1);
    setJobDescription("");
    onClose();
  };

  return (
    <div className="quote-modal-overlay" onClick={handleResetAndClose}>
      <div className="quote-modal-card" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="quote-modal-header">
          <div className="quote-modal-header-brand">
            <div className="quote-badge">
              <Sparkles className="quote-badge-icon" />
              <span>Sulekha Expert Connect</span>
            </div>
            <h2>Get Free Quotes from Verified Experts</h2>
            <p className="quote-modal-subtitle">
              {targetTitle} in <span className="city-highlight">📍 {userCity}</span>
            </p>
          </div>
          <button className="quote-modal-close-btn" onClick={handleResetAndClose}>
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="quote-progress-bar">
          <div className={`progress-step ${step >= 1 ? "active" : ""}`}>
            <span className="step-num">1</span>
            <span className="step-label">Service Details</span>
          </div>
          <div className="progress-line" />
          <div className={`progress-step ${step >= 2 ? "active" : ""}`}>
            <span className="step-num">2</span>
            <span className="step-label">Contact & Location</span>
          </div>
          <div className="progress-line" />
          <div className={`progress-step ${step >= 3 ? "active" : ""}`}>
            <span className="step-num">3</span>
            <span className="step-label">Matched Experts</span>
          </div>
        </div>

        {/* STEP 1: SERVICE REQUIREMENT DETAILS */}
        {step === 1 && (
          <form onSubmit={handleNextStep1} className="quote-modal-body">
            <div className="form-group">
              <label className="form-label">
                <Clock size={16} className="input-icon-left" />
                When do you need this service?
              </label>
              <div className="timing-options-grid">
                {[
                  { id: "Immediate", label: "⚡ Immediate / Today", desc: "Urgent response needed" },
                  { id: "Within 2 Days", label: "📅 Within 2 Days", desc: "Flexible timeline" },
                  { id: "Planning Ahead", label: "🗓️ Next Week / Planning", desc: "Getting estimates" }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`timing-card ${timing === item.id ? "selected" : ""}`}
                    onClick={() => setTiming(item.id)}
                  >
                    <span className="timing-card-title">{item.label}</span>
                    <span className="timing-card-desc">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Describe your specific requirement / issue
              </label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="e.g. Need leather shoe resoling and zipper replacement for 2 formal boots..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                required
              />
              <span className="form-hint">Tip: Adding details helps local experts send exact price quotes!</span>
            </div>

            <div className="quote-modal-footer">
              <button type="button" className="btn-secondary" onClick={handleResetAndClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                <span>Continue to Location</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: CONTACT & LOCATION DETAILS */}
        {step === 2 && (
          <form onSubmit={handleSubmitRequirement} className="quote-modal-body">
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">
                  <MapPin size={16} className="input-icon-left" />
                  Your City
                </label>
                <select
                  className="form-select"
                  value={userCity}
                  onChange={(e) => setUserCity(e.target.value)}
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

              <div className="form-group">
                <label className="form-label">Pincode / Area</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 400001"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <PhoneCall size={16} className="input-icon-left" />
                Mobile Number for Quotes & Callback
              </label>
              <input
                type="tel"
                className="form-input"
                placeholder="Enter 10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <span className="form-hint">🔒 Your contact details are shared only with top verified experts.</span>
            </div>

            <div className="quote-guarantee-box">
              <ShieldCheck className="guarantee-icon" />
              <div>
                <strong>100% Free & No Obligation</strong>
                <p>Top rated local artisans will review your request and send custom price quotes.</p>
              </div>
            </div>

            <div className="quote-modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span>Matching Experts...</span>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Get Free Quotes Now</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: MATCHED EXPERTS CONFIRMATION */}
        {step === 3 && (
          <div className="quote-modal-body matched-step">
            <div className="quote-success-banner">
              <CheckCircle2 className="success-icon" />
              <div>
                <h3>Request Sent Successfully!</h3>
                <p>We've matched your requirement with top verified experts in <strong>{userCity}</strong>.</p>
              </div>
            </div>

            <h4 className="matched-title">
              <UserCheck size={18} className="text-amber" />
              <span>Top 3 Matched Local Experts Contacting You Shortly:</span>
            </h4>

            <div className="matched-experts-list">
              {matchedExperts.map((exp, idx) => (
                <div key={exp.id || idx} className="expert-matched-card">
                  <img
                    src={exp.profile_image || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"}
                    alt={exp.business_name}
                    className="expert-avatar"
                  />
                  <div className="expert-info">
                    <div className="expert-name-row">
                      <strong>{exp.business_name || exp.full_name}</strong>
                      <span className="verified-badge-pill">
                        <ShieldCheck size={12} /> Sulekha Verified
                      </span>
                    </div>
                    <p className="expert-sub">{exp.experience_years || 10}+ Yrs Experience • {exp.city || userCity}</p>
                    <div className="expert-rating-row">
                      <Star size={14} className="star-icon-filled" />
                      <span>{Number(exp.average_rating || 4.9).toFixed(1)}</span>
                      <span className="response-time">⚡ Responds in ~15 mins</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="quote-modal-footer">
              <button className="btn-primary" style={{ width: "100%" }} onClick={handleResetAndClose}>
                Done & View My Activity
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
