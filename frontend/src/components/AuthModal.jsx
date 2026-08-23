import React, { useState, useEffect } from "react";
import { X, Lock, Mail, User, Phone, ShieldCheck, Zap } from "lucide-react";
import "./AuthModal.css";

export default function AuthModal({ isOpen, initialRole, isSignUpView, onClose, onLogin, onRegister, showToast }) {
  const [isLoginView, setIsLoginView] = useState(!isSignUpView);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: initialRole || "CUSTOMER"
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialRole) setFormData((prev) => ({ ...prev, role: initialRole }));
      if (typeof isSignUpView === "boolean") setIsLoginView(!isSignUpView);
    }
  }, [isOpen, initialRole, isSignUpView]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLoginView) {
        await onLogin(formData.email, formData.password);
        showToast("success", "Welcome back!");
      } else {
        await onRegister(formData);
        showToast("success", "Account created successfully!");
      }
      onClose();
    } catch (err) {
      showToast("error", err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="glass-panel auth-modal-card">
        {/* Decorative ambient glow */}
        <div className="auth-modal-glow" />

        <div className="modal-header-row">
          <div>
            <h2 className="auth-modal-title">
              {isLoginView ? "Welcome Back to HunarHub" : "Create your Account"}
            </h2>
            <p className="auth-modal-subtitle">
              {isLoginView ? "Sign in to manage orders, requests & services" : "Join the digital marketplace for local entrepreneurs"}
            </p>
          </div>
          <button onClick={onClose} className="close-btn" aria-label="Close auth modal">
            <X size={20} />
          </button>
        </div>

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
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="input-with-icon"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Phone Number</label>
                <div className="input-field-wrap">
                  <Phone className="field-icon" />
                  <input
                    type="tel"
                    required
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
                    onClick={() => setFormData({ ...formData, role: "CUSTOMER" })}
                    className={`role-select-btn ${formData.role === "CUSTOMER" ? "active" : ""}`}
                  >
                    🛒 Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "ENTREPRENEUR" })}
                    className={`role-select-btn ${formData.role === "ENTREPRENEUR" ? "active" : ""}`}
                  >
                    🛠️ Micro-Entrepreneur
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="field-label">Email Address</label>
            <div className="input-field-wrap">
              <Mail className="field-icon" />
              <input
                type="email"
                required
                placeholder="name@domain.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-with-icon"
              />
            </div>
          </div>

          <div>
            <label className="field-label">Password</label>
            <div className="input-field-wrap">
              <Lock className="field-icon" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input-with-icon"
              />
            </div>
          </div>

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
            onClick={() => setIsLoginView(!isLoginView)}
            className="auth-toggle-link"
          >
            {isLoginView ? "Sign Up" : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}
