import React from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const { type, message } = toast;

  const icons = {
    success: <CheckCircle className="toast-icon success-icon" />,
    error: <AlertCircle className="toast-icon error-icon" />,
    info: <Info className="toast-icon info-icon" />
  };

  const borders = {
    success: "success",
    error: "error",
    info: "info"
  };

  return (
    <div className="toast-floating-container animate-fade-in">
      <div className={`toast-bubble ${borders[type] || borders.info}`}>
        {icons[type]}
        <p className="toast-message">{message}</p>
        <button onClick={onClose} className="toast-close-btn" aria-label="Close notification">
          <X className="toast-close-icon" />
        </button>
      </div>
    </div>
  );
}
