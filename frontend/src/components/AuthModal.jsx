import React, { useState, useEffect } from "react";
import { X, Lock, Mail, User, Phone, Eye, EyeOff, Briefcase, MapPin } from "lucide-react";
import "./AuthModal.css";

export default function AuthModal({ isOpen, initialRole, isSignUpView, onClose, onLogin, onRegister, showToast }) {
  const [isLoginView, setIsLoginView] = useState(!isSignUpView);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirm_password: "",
    full_name: "",
    phone: "",
    role: initialRole || "CUSTOMER",
    business_name: "",
    city: "Mumbai"
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setAuthError("");
      if (initialRole) setFormData((prev) => ({ ...prev, role: initialRole }));
      if (typeof isSignUpView === "boolean") setIsLoginView(!isSignUpView);
    }
  }, [isOpen, initialRole, isSignUpView]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");

    if (!isLoginView) {
      if (!formData.full_name || formData.full_name.trim().length < 2) {
        setAuthError("Full name must be at least 2 characters");
        showToast("error", "Full name must be at least 2 characters");
        return;
      }

      const rawDigits = (formData.phone || "").replace(/\D/g, "");
      const phoneDigits = rawDigits.length === 11 && rawDigits.startsWith("0")
        ? rawDigits.slice(1)
        : rawDigits.length === 12 && rawDigits.startsWith("91")
        ? rawDigits.slice(2)
        : rawDigits;

      if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
        setAuthError("Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)");
        showToast("error", "Please enter a valid 10-digit Indian mobile number");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.email || !emailRegex.test(formData.email.trim())) {
        setAuthError("Please enter a valid email address");
        showToast("error", "Please enter a valid email address");
        return;
      }

      if (!formData.password || formData.password.length < 6) {
        setAuthError("Password must contain at least 6 characters");
        showToast("error", "Password must contain at least 6 characters");
        return;
      }

      if (formData.password !== formData.confirm_password) {
        setAuthError("Passwords do not match. Please verify your password.");
        showToast("error", "Passwords do not match");
        return;
      }
    }

    setLoading(true);
    try {
      if (isLoginView) {
        await onLogin(formData.email.trim(), formData.password);
        showToast("success", "Welcome back!");
      } else {
        const rawDigits = (formData.phone || "").replace(/\D/g, "");
        const cleanPhone = rawDigits.length === 11 && rawDigits.startsWith("0")
          ? rawDigits.slice(1)
          : rawDigits.length === 12 && rawDigits.startsWith("91")
          ? rawDigits.slice(2)
          : rawDigits;

        await onRegister({
          ...formData,
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: cleanPhone,
          business_name: formData.business_name ? formData.business_name.trim() : formData.full_name.trim(),
          city: formData.city || "Mumbai"
        });
        showToast("success", "Account created successfully! Welcome to HunarHub.");
      }
      onClose();
    } catch (err) {
      let rawMsg = err.message || "Authentication failed. Please try again.";
      let userMsg = rawMsg;
      if (rawMsg.includes("already exists") || rawMsg.includes("users_email_key")) {
        userMsg = "Email already registered. Please sign in instead.";
      } else if (rawMsg.includes("users_phone_key") || rawMsg.includes("phone number is already registered")) {
        userMsg = "This phone number is already registered. Please sign in or use another number.";
      } else if (rawMsg.includes("Invalid email or password")) {
        userMsg = "Invalid email or password. Please check your credentials.";
      } else if (rawMsg.includes("Network") || rawMsg.includes("Failed to fetch")) {
        userMsg = "Unable to reach server. Please check your internet connection.";
      }
      setAuthError(userMsg);
      showToast("error", userMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div className="glass-panel auth-modal-card">
        {/* Decorative ambient glow */}
        <div className="auth-modal-glow" />

        <div className="modal-header-row">
          <div>
            <h2 className="auth-modal-title">
              {isLoginView ? "Welcome Back to HunarHub" : "Create your Account"}
            </h2>
            <p className="auth-modal-subtitle">
              {isLoginView
                ? "Sign in to manage orders, requests & services"
                : "Join the digital marketplace for local entrepreneurs"}
            </p>
          </div>
          <button onClick={onClose} className="close-btn" aria-label="Close auth modal" type="button">
            <X size={20} />
          </button>
        </div>

        {authError && (
          <div className="auth-error-banner" style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", color: "#fca5a5", padding: "0.6rem 0.85rem", borderRadius: "0.5rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLoginView && (
            <>
              <div>
                <label className="field-label">Full Name</label>
                <div className="input-field-wrap">
                  <User className="field-icon" />
                  <input
                    type="text"
                    required
                    disabled={loading}
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="input-with-icon"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Phone Number (10 Digits)</label>
                <div className="input-field-wrap">
                  <Phone className="field-icon" />
                  <input
                    type="tel"
                    required
                    disabled={loading}
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-with-icon"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Account Role</label>
                <div className="role-selector-grid">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setFormData({ ...formData, role: "CUSTOMER" })}
                    className={`role-select-btn ${formData.role === "CUSTOMER" ? "active" : ""}`}
                  >
                    🛒 Customer
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setFormData({ ...formData, role: "ENTREPRENEUR" })}
                    className={`role-select-btn ${formData.role === "ENTREPRENEUR" ? "active" : ""}`}
                  >
                    🛠️ Micro-Entrepreneur
                  </button>
                </div>
              </div>

              {formData.role === "ENTREPRENEUR" && (
                <>
                  <div>
                    <label className="field-label">Business / Trade Name</label>
                    <div className="input-field-wrap">
                      <Briefcase className="field-icon" />
                      <input
                        type="text"
                        disabled={loading}
                        placeholder="e.g. Ramesh Leather Crafts & Boots (optional)"
                        value={formData.business_name}
                        onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                        className="input-with-icon"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="field-label">Operating City</label>
                    <div className="input-field-wrap">
                      <MapPin className="field-icon" />
                      <select
                        disabled={loading}
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="input-with-icon"
                        style={{
                          background: "#0f172a",
                          color: "#fff",
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: "0.5rem",
                          padding: "0.75rem 0.75rem 0.75rem 2.75rem",
                          width: "100%"
                        }}
                      >
                        <option value="Mumbai">Mumbai</option>
                        <option value="Pune">Pune</option>
                        <option value="Delhi">Delhi</option>
                        <option value="Bengaluru">Bengaluru</option>
                        <option value="Jaipur">Jaipur</option>
                        <option value="Varanasi">Varanasi</option>
                        <option value="Kolkata">Kolkata</option>
                        <option value="Chennai">Chennai</option>
                        <option value="Hyderabad">Hyderabad</option>
                        <option value="Ahmedabad">Ahmedabad</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <div>
            <label className="field-label">Email Address</label>
            <div className="input-field-wrap">
              <Mail className="field-icon" />
              <input
                type="email"
                required
                disabled={loading}
                placeholder="name@domain.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-with-icon"
              />
            </div>
          </div>

          <div>
            <label className="field-label">Password {isLoginView ? "" : "(Min 6 Characters)"}</label>
            <div className="input-field-wrap password-field-wrap">
              <Lock className="field-icon" />
              <input
                type={showPassword ? "text" : "password"}
                required
                disabled={loading}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (authError) setAuthError("");
                }}
                className="input-with-icon password-input"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {!isLoginView && (
            <div>
              <label className="field-label">Confirm Password</label>
              <div className="input-field-wrap password-field-wrap">
                <Lock className="field-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={loading}
                  placeholder="••••••••"
                  value={formData.confirm_password}
                  onChange={(e) => {
                    setFormData({ ...formData, confirm_password: e.target.value });
                    if (authError) setAuthError("");
                  }}
                  className="input-with-icon password-input"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary auth-submit-btn"
          >
            {loading ? "Processing..." : isLoginView ? "Sign In" : "Register Account"}
          </button>
        </form>

        <div className="auth-toggle-row">
          {isLoginView ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setIsLoginView(!isLoginView);
              setAuthError("");
            }}
            className="auth-toggle-link"
            type="button"
          >
            {isLoginView ? "Sign Up" : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}
