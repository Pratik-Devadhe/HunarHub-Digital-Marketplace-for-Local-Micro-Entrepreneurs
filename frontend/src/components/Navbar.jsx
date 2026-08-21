import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingBag, Search, User, LogOut, Shield, Wrench, Package, Sparkles, MapPin, Store } from "lucide-react";
import "./Navbar.css";

export default function Navbar({
  user,
  cartCount,
  onOpenCart,
  onOpenAuth,
  onLogout,
  searchQuery,
  setSearchQuery,
  selectedCity,
  setSelectedCity
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const isCurrent = (path) => {
    if (path === "/" && (location.pathname === "/" || location.pathname === "/marketplace")) return true;
    return location.pathname.startsWith(path) && path !== "/";
  };

  return (
    <header className="navbar-header">
      <div className="navbar-inner">
        
        {/* Brand Logo & City Selector */}
        <div className="navbar-brand-wrapper">
          <div className="navbar-brand" onClick={() => navigate("/")}>
            <div className="brand-icon-box">
              <div className="brand-icon-inner">
                H
              </div>
            </div>
            <div>
              <span className="brand-text-title">
                HunarHub <span className="sulekha-tag">Expert Marketplace</span>
              </span>
              <span className="brand-text-sub">
                Verified Local Artisans & Micro-Entrepreneurs
              </span>
            </div>
          </div>

          {/* Sulekha Header City Selector */}
          <div className="navbar-city-selector">
            <MapPin className="city-selector-icon" />
            <select
              value={selectedCity || ""}
              onChange={(e) => setSelectedCity?.(e.target.value)}
              className="header-city-select"
            >
              <option value="">All India (Select City)</option>
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
        </div>

        {/* Search Bar */}
        <div className="navbar-search">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search AC repair, cobblers, tailors, shifting, pottery in your city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Navigation Links */}
        <nav className="navbar-nav">
          <button
            onClick={() => navigate("/")}
            className={`nav-link-btn ${isCurrent("/") ? "active" : ""}`}
          >
            <Sparkles className="nav-icon" />
            <span>Marketplace</span>
          </button>

          {user && (
            <button
              onClick={() => navigate("/activity")}
              className={`nav-link-btn ${isCurrent("/activity") ? "active" : ""}`}
            >
              <Package className="nav-icon" />
              <span>My Activity</span>
            </button>
          )}

          {user && (user.role === "ENTREPRENEUR" || user.role === "ADMIN") && (
            <button
              onClick={() => navigate("/entrepreneur")}
              className={`nav-link-btn ${isCurrent("/entrepreneur") ? "active" : ""}`}
            >
              <Wrench className="nav-icon" />
              <span>Entrepreneur Hub</span>
            </button>
          )}

          {user && user.role === "ADMIN" && (
            <button
              onClick={() => navigate("/admin")}
              className={`nav-link-btn ${isCurrent("/admin") ? "active" : ""}`}
            >
              <Shield className="nav-icon" />
              <span>Admin Panel</span>
            </button>
          )}
        </nav>

        {/* Right Actions: Cart, List Business & Profile */}
        <div className="navbar-actions">

          {/* List Your Business FREE button */}
          {(!user || user.role !== "ENTREPRENEUR") && (
            <button
              onClick={() => {
                if (!user) onOpenAuth();
                else navigate("/entrepreneur");
              }}
              className="btn-list-business"
              title="Register your business and start receiving local leads"
            >
              <Store size={15} />
              <span>List Business <strong>FREE</strong></span>
            </button>
          )}

          {/* Cart Button */}
          <button onClick={() => navigate("/cart")} className={`cart-icon-btn ${isCurrent("/cart") ? "active" : ""}`} title="View Shopping Cart">
            <ShoppingBag className="cart-icon" />
            {cartCount > 0 && (
              <span className="cart-badge">
                {cartCount}
              </span>
            )}
          </button>

          {user ? (
            <div className="user-profile-box">
              <div className="user-info">
                <span className="user-name">
                  {user.full_name}
                </span>
                <span className="user-role">
                  {user.role}
                </span>
              </div>
              <button onClick={onLogout} className="cart-icon-btn" title="Sign Out">
                <LogOut className="logout-icon" />
              </button>
            </div>
          ) : (
            <button onClick={onOpenAuth} className="btn-primary">
              <User className="nav-icon" />
              <span>Sign In</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
