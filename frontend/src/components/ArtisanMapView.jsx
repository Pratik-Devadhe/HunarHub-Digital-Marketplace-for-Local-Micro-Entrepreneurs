import React, { useState } from "react";
import { MapPin, Star, ShieldCheck, Phone, FileText, X } from "lucide-react";
import "./ArtisanMapView.css";

export default function ArtisanMapView({ artisans, onSelectArtisan, onGetQuote }) {
  const [selectedArtisan, setSelectedArtisan] = useState(artisans[0] || null);

  // Mock coordinates distribution for interactive map display
  const pinPositions = [
    { top: "35%", left: "42%" },
    { top: "52%", left: "60%" },
    { top: "28%", left: "68%" },
    { top: "62%", left: "32%" },
    { top: "45%", left: "25%" },
    { top: "70%", left: "55%" }
  ];

  return (
    <div className="artisan-map-container">
      {/* Sidebar List */}
      <div className="map-sidebar">
        <div className="map-sidebar-header">
          <span style={{ fontWeight: 700 }}>Verified Local Artisans</span>
          <span style={{ fontSize: "0.8rem", color: "#f59e0b" }}>{artisans.length} Nearby</span>
        </div>
        <div className="map-sidebar-list">
          {artisans.map((ep, idx) => {
            const isSelected = selectedArtisan?.id === ep.id;
            return (
              <div
                key={ep.id}
                className={`map-artisan-card ${isSelected ? "active" : ""}`}
                onClick={() => setSelectedArtisan(ep)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h4 style={{ margin: "0 0 0.2rem 0", fontSize: "0.98rem", color: "#0f172a" }}>{ep.business_name}</h4>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.85rem", color: "#f59e0b", fontWeight: 700 }}>
                    <Star size={12} fill="#f59e0b" /> {ep.average_rating || "4.9"}
                  </span>
                </div>
                <div style={{ fontSize: "0.82rem", color: "#64748b", display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                  <span><MapPin size={12} /> {ep.city || "Mumbai"}</span>
                  <span>• {ep.experience_years || 10} Yrs Exp</span>
                </div>
                {ep.distance_km && (
                  <div style={{ fontSize: "0.78rem", color: "#10b981", fontWeight: 600, marginTop: "0.35rem" }}>
                    📍 {ep.distance_km} km away
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual Canvas */}
      <div className="map-canvas-wrapper">
        <div style={{ position: "absolute", top: "1rem", left: "1rem", background: "rgba(255,255,255,0.9)", padding: "0.5rem 1rem", borderRadius: "20px", fontSize: "0.82rem", fontWeight: 600, color: "#334155" }}>
          📍 Interactive Map View (Near Selected Region)
        </div>

        {artisans.map((ep, idx) => {
          const pos = pinPositions[idx % pinPositions.length];
          const isSelected = selectedArtisan?.id === ep.id;
          return (
            <div
              key={ep.id}
              className={`map-marker ${isSelected ? "selected" : ""}`}
              style={{ top: pos.top, left: pos.left }}
              onClick={() => setSelectedArtisan(ep)}
            >
              <MapPin size={14} color={isSelected ? "#ffffff" : "#f59e0b"} />
              <span>{ep.business_name.split(" ")[0]}</span>
            </div>
          );
        })}

        {/* Selected Popup */}
        {selectedArtisan && (
          <div className="map-info-popup">
            <button
              style={{ position: "absolute", top: "0.75rem", right: "0.75rem", background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              onClick={() => setSelectedArtisan(null)}
            >
              <X size={16} />
            </button>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <img
                src={selectedArtisan.profile_image || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"}
                alt={selectedArtisan.business_name}
                style={{ width: "48px", height: "48px", borderRadius: "10px", objectFit: "cover" }}
              />
              <div>
                <h4 style={{ margin: "0 0 0.15rem 0", fontSize: "0.98rem", color: "#0f172a" }}>{selectedArtisan.business_name}</h4>
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{selectedArtisan.full_name}</div>
                <div style={{ fontSize: "0.78rem", color: "#f59e0b", fontWeight: 700, marginTop: "0.15rem" }}>
                  <Star size={12} fill="#f59e0b" style={{ display: "inline" }} /> {selectedArtisan.average_rating || "4.9"} ({selectedArtisan.total_reviews || 0} reviews)
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <button
                className="btn-sec-outline"
                style={{ padding: "0.45rem", fontSize: "0.82rem", justifyContent: "center" }}
                onClick={() => onSelectArtisan && onSelectArtisan(selectedArtisan)}
              >
                View Profile
              </button>
              <button
                className="btn-primary-amber"
                style={{ padding: "0.45rem", fontSize: "0.82rem", justifyContent: "center" }}
                onClick={() => onGetQuote && onGetQuote(selectedArtisan)}
              >
                Get Quote
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
