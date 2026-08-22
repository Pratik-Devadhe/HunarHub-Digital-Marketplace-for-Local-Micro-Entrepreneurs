import React, { useState, useEffect } from "react";
import {
  X,
  Star,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle,
  Briefcase,
  Award,
  Phone,
  MessageSquare,
  FileText,
  Calendar,
  Heart,
  Package,
  Layers
} from "lucide-react";
import { api } from "../services/api";
import "./ArtisanProfileModal.css";

export default function ArtisanProfileModal({ artisanId, onClose, onRequestService, onOpenChat, showToast }) {
  const [artisan, setArtisan] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    if (!artisanId) return;
    setLoading(true);
    api.getEntrepreneurById(artisanId)
      .then((res) => {
        if (res && res.entrepreneur) {
          setArtisan(res.entrepreneur);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [artisanId]);

  if (!artisanId) return null;

  const handleToggleFavorite = () => {
    if (isFavorited) {
      setIsFavorited(false);
      showToast && showToast("Removed from saved favorites", "info");
    } else {
      setIsFavorited(true);
      api.addFavorite({ entrepreneur_id: artisanId }).catch(() => {});
      showToast && showToast("Saved artisan to favorites!", "success");
    }
  };

  return (
    <div className="artisan-modal-overlay" onClick={onClose}>
      <div className="artisan-modal-container" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "#64748b" }}>
            <p>Loading artisan profile details...</p>
          </div>
        ) : !artisan ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <p>Artisan profile not found.</p>
            <button className="btn-sec-outline" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="artisan-modal-header">
              <button className="artisan-modal-close" onClick={onClose} aria-label="Close Profile">
                <X size={20} />
              </button>

              <img
                src={artisan.profile_image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300"}
                alt={artisan.full_name || artisan.business_name}
                className="artisan-avatar-lg"
              />

              <div className="artisan-header-info">
                <h2>{artisan.full_name || artisan.business_name}</h2>
                <div className="artisan-business-name">{artisan.business_name}</div>
                <div style={{ display: "flex", gap: "1rem", color: "#cbd5e1", fontSize: "0.88rem", flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <MapPin size={14} color="#f59e0b" /> {artisan.city || "Local"}, {artisan.state || "India"}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Briefcase size={14} color="#f59e0b" /> {artisan.experience_years || 5}+ Years Experience
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#f59e0b", fontWeight: 700 }}>
                    <Star size={14} fill="#f59e0b" /> {artisan.average_rating || "4.9"} ({artisan.total_reviews || 0} reviews)
                  </span>
                </div>

                {/* Verification Badges */}
                <div className="artisan-badge-row">
                  {artisan.is_identity_verified && (
                    <span className="v-badge verified">
                      <ShieldCheck size={14} /> Identity Verified
                    </span>
                  )}
                  {artisan.is_artisan_verified && (
                    <span className="v-badge verified">
                      <Award size={14} /> Master Craft Verified
                    </span>
                  )}
                  {artisan.is_business_verified && (
                    <span className="v-badge verified">
                      <CheckCircle size={14} /> Registered Business
                    </span>
                  )}
                  {artisan.is_phone_verified && (
                    <span className="v-badge verified">
                      <Phone size={14} /> Phone Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="artisan-modal-nav">
              <button
                className={`artisan-tab-btn ${activeTab === "overview" ? "active" : ""}`}
                onClick={() => setActiveTab("overview")}
              >
                <Layers size={16} /> Overview
              </button>
              <button
                className={`artisan-tab-btn ${activeTab === "services" ? "active" : ""}`}
                onClick={() => setActiveTab("services")}
              >
                <Briefcase size={16} /> Services ({artisan.services ? artisan.services.length : 0})
              </button>
              <button
                className={`artisan-tab-btn ${activeTab === "portfolio" ? "active" : ""}`}
                onClick={() => setActiveTab("portfolio")}
              >
                <FileText size={16} /> Work Portfolio ({artisan.portfolio ? artisan.portfolio.length : 0})
              </button>
              <button
                className={`artisan-tab-btn ${activeTab === "products" ? "active" : ""}`}
                onClick={() => setActiveTab("products")}
              >
                <Package size={16} /> Products ({artisan.products ? artisan.products.length : 0})
              </button>
              <button
                className={`artisan-tab-btn ${activeTab === "reviews" ? "active" : ""}`}
                onClick={() => setActiveTab("reviews")}
              >
                <Star size={16} /> Reviews ({artisan.reviews ? artisan.reviews.length : 0})
              </button>
            </div>

            {/* Modal Body */}
            <div className="artisan-modal-body">
              {activeTab === "overview" && (
                <>
                  <div className="artisan-stats-grid">
                    <div className="art-stat-card">
                      <div className="art-stat-val">₹{artisan.starting_price || 250}</div>
                      <div className="art-stat-lbl">Starting Price</div>
                    </div>
                    <div className="art-stat-card">
                      <div className="art-stat-val">{artisan.completed_orders_count || 120}+</div>
                      <div className="art-stat-lbl">Completed Orders</div>
                    </div>
                    <div className="art-stat-card">
                      <div className="art-stat-val">98%</div>
                      <div className="art-stat-lbl">On-Time Delivery</div>
                    </div>
                    <div className="art-stat-card">
                      <div className="art-stat-val">15 Mins</div>
                      <div className="art-stat-lbl">Avg Response</div>
                    </div>
                  </div>

                  <div className="artisan-bio-box">
                    <h4>About the Artisan & Craft Specialty</h4>
                    <p>{artisan.bio || "Local expert skilled in traditional and modern custom craftwork, dedicated to delivering pristine quality and high customer satisfaction."}</p>
                  </div>

                  <div className="artisan-bio-box">
                    <h4>Location & Workshop Address</h4>
                    <p>{artisan.address || "Main Market Workshop"}, {artisan.city || "City"}, {artisan.state || "State"} - {artisan.pincode || "400001"}</p>
                  </div>
                </>
              )}

              {activeTab === "services" && (
                <div className="services-list-modal">
                  {(!artisan.services || artisan.services.length === 0) ? (
                    <p style={{ color: "#64748b", textAlign: "center" }}>No custom services listed yet.</p>
                  ) : (
                    artisan.services.map((svc) => (
                      <div key={svc.id} className="service-item-card">
                        <div className="service-item-info">
                          <h5>{svc.title}</h5>
                          <p>{svc.description}</p>
                          <span style={{ fontSize: "0.8rem", color: "#64748b", display: "inline-block", marginTop: "0.35rem" }}>
                            Est. Duration: {svc.estimated_duration || 60} mins
                          </span>
                        </div>
                        <div className="service-item-action">
                          <div className="service-item-price">₹{svc.price}</div>
                          <button
                            className="btn-primary-amber"
                            onClick={() => onRequestService && onRequestService(artisan, svc)}
                          >
                            Book Service
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "portfolio" && (
                <div className="portfolio-grid">
                  {(!artisan.portfolio || artisan.portfolio.length === 0) ? (
                    <p style={{ color: "#64748b", textAlign: "center", gridColumn: "1/-1" }}>No portfolio items uploaded yet.</p>
                  ) : (
                    artisan.portfolio.map((item) => (
                      <div key={item.id} className="portfolio-card">
                        <img
                          src={item.image_url || "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400"}
                          alt={item.title}
                          className="portfolio-img"
                        />
                        <div className="portfolio-content">
                          <h5>{item.title}</h5>
                          <p>{item.description}</p>
                          {item.price && <div className="portfolio-price">₹{item.price}</div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "products" && (
                <div className="portfolio-grid">
                  {(!artisan.products || artisan.products.length === 0) ? (
                    <p style={{ color: "#64748b", textAlign: "center", gridColumn: "1/-1" }}>No handcrafted products available right now.</p>
                  ) : (
                    artisan.products.map((prod) => (
                      <div key={prod.id} className="portfolio-card">
                        <img
                          src={prod.primary_image || "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400"}
                          alt={prod.name}
                          className="portfolio-img"
                        />
                        <div className="portfolio-content">
                          <h5>{prod.name}</h5>
                          <p>{prod.description}</p>
                          <div className="portfolio-price">₹{prod.price}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "reviews" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {(!artisan.reviews || artisan.reviews.length === 0) ? (
                    <p style={{ color: "#94a3b8", textAlign: "center" }}>No customer reviews yet.</p>
                  ) : (
                    artisan.reviews.map((rev) => (
                      <div key={rev.id} className="artisan-review-card">
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                          <span style={{ fontWeight: 700, color: "#FFFFFF" }}>{rev.customer_name || "Verified Customer"}</span>
                          <span style={{ color: "#f59e0b", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.2rem" }}>
                            <Star size={14} fill="#f59e0b" /> {rev.rating}/5
                          </span>
                        </div>
                        <p style={{ margin: 0, color: "#CBD5E1", fontSize: "0.92rem", lineHeight: 1.5 }}>{rev.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="artisan-modal-footer">
              <button
                className={`btn-sec-outline ${isFavorited ? "active" : ""}`}
                onClick={handleToggleFavorite}
                style={{ color: isFavorited ? "#e11d48" : "#334155" }}
              >
                <Heart size={16} fill={isFavorited ? "#e11d48" : "none"} color={isFavorited ? "#e11d48" : "currentColor"} />
                {isFavorited ? "Saved" : "Save Favorite"}
              </button>

              <div className="artisan-footer-actions">
                <button
                  className="btn-sec-outline"
                  onClick={() => {
                    onClose();
                    onOpenChat && onOpenChat(artisan);
                  }}
                >
                  <MessageSquare size={16} /> Send Message
                </button>
                <button
                  className="btn-primary-amber"
                  onClick={() => {
                    onClose();
                    onRequestService && onRequestService(artisan);
                  }}
                >
                  <FileText size={16} /> Get Free Quote
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
