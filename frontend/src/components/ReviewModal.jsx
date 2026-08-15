import React, { useState } from "react";
import { X, Star, Send } from "lucide-react";

export default function ReviewModal({ isOpen, onClose, targetItem, onSubmitReview, showToast }) {
  if (!isOpen || !targetItem) return null;

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      showToast("error", "Please write a comment for your review");
      return;
    }

    setLoading(true);
    try {
      await onSubmitReview({
        entrepreneur_id: targetItem.entrepreneur_id,
        product_id: targetItem.product_id || null,
        service_request_id: targetItem.service_request_id || null,
        rating,
        comment
      });
      showToast("success", "Review submitted! Thank you for supporting local artisans.");
      onClose();
    } catch (err) {
      showToast("error", err.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="review-modal-overlay animate-fade-in">
      <div className="glass-panel review-modal-card">
        <div className="review-modal-header">
          <div>
            <h3 className="review-modal-title">Rate & Review Artisan</h3>
            <p className="review-modal-subtitle">Share your experience to help local entrepreneurs grow</p>
          </div>
          <button onClick={onClose} className="close-btn" aria-label="Close review modal">
            <X className="modal-close-icon" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="review-modal-form">
          {/* Star Selector */}
          <div className="star-rating-box">
            <span className="star-rating-label">Select Star Rating</span>
            <div className="star-row">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="star-rating-button"
                >
                  <Star
                    className={`star-icon ${
                      (hoverRating || rating) >= star
                        ? "filled"
                        : "empty"
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="review-rating-text">
              {rating === 5 ? "Excellent (5 Stars)" : rating === 4 ? "Very Good (4 Stars)" : rating === 3 ? "Good (3 Stars)" : rating === 2 ? "Fair (2 Stars)" : "Poor (1 Star)"}
            </span>
          </div>

          <div>
            <label className="field-label">Your Feedback & Comment</label>
            <textarea
              rows="4"
              required
              placeholder="Describe the craftsmanship, timeliness, quality of work or product..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="review-textarea"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary review-submit-btn">
            <Send className="submit-btn-icon" />
            <span>{loading ? "Submitting..." : "Submit Verified Review"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
