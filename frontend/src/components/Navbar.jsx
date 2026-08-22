import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ShoppingBag,
  Search,
  User,
  LogOut,
  Shield,
  Wrench,
  Package,
  Sparkles,
  MapPin,
  Store,
  Menu,
  X
} from "lucide-react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isCurrent = (path) => {
    if (path === "/" && (location.pathname === "/" || location.pathname === "/marketplace")) return true;
    return location.pathname.startsWith(path) && path !== "/";
  };

  const handleNavClick = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="navbar-header">
      <div className="navbar-inner">
        
        {/* Brand Logo & City Selector */}
        <div className="navbar-brand-wrapper">
          <div className="navbar-brand" onClick={() => handleNavClick("/")}>
            <div className="brand-icon-box">
              <div className="brand-icon-inner">
                H
              </div>
            </div>
            <div>
              <span className="brand-text-title">
                HunarHub <span className="sulekha-tag">Artisan Network</span>
              </span>
              <span className="brand-text-sub">
                Verified Local Experts & Micro-Entrepreneurs
              </span>
            </div>
          </div>

          {/* City Selector */}
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

        {/* Desktop Navigation Links */}
        <nav className="navbar-nav desktop-only-nav">
          <button
            onClick={() => handleNavClick("/")}
            className={`nav-link-btn ${isCurrent("/") ? "active" : ""}`}
          >
            <Sparkles className="nav-icon" />
            <span>Marketplace</span>
          </button>

          {user && (
            <button
              onClick={() => handleNavClick("/activity")}
              className={`nav-link-btn ${isCurrent("/activity") ? "active" : ""}`}
            >
              <Package className="nav-icon" />
              <span>My Activity</span>
            </button>
          )}

          {user && (user.role === "ENTREPRENEUR" || user.role === "ADMIN") && (
            <button
              onClick={() => handleNavClick("/entrepreneur")}
              className={`nav-link-btn ${isCurrent("/entrepreneur") ? "active" : ""}`}
            >
              <Wrench className="nav-icon" />
              <span>Entrepreneur Hub</span>
            </button>
          )}

          {user && user.role === "ADMIN" && (
            <button
              onClick={() => handleNavClick("/admin")}
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
                else handleNavClick("/entrepreneur");
              }}
              className="btn-list-business desktop-only-btn"
              title="Register your business and start receiving local leads"
            >
              <Store size={15} />
              <span>List Business <strong>FREE</strong></span>
            </button>
          )}

          {/* Cart Button */}
          <button
            onClick={() => handleNavClick("/cart")}
            className={`cart-icon-btn ${isCurrent("/cart") ? "active" : ""}`}
            title="View Shopping Cart"
          >
            <ShoppingBag className="cart-icon" />
            {cartCount > 0 && (
              <span className="cart-badge">
                {cartCount}
              </span>
            )}
          </button>

          {user ? (
            <div className="user-profile-box desktop-only-user">
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
            <button onClick={onOpenAuth} className="btn-primary desktop-only-btn">
              <User className="nav-icon" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

      </div>

      {/* Mobile Slide-Down Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="mobile-nav-dropdown glass-panel animate-fade-in">
          {/* Search Field on Mobile */}
          <div className="mobile-search-box mb-4">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search services or artisans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="mobile-nav-links">
            <button
              onClick={() => handleNavClick("/")}
              className={`mobile-nav-item ${isCurrent("/") ? "active" : ""}`}
            >
              <Sparkles size={18} />
              <span>Explore Marketplace</span>
            </button>

            {user && (
              <button
                onClick={() => handleNavClick("/activity")}
                className={`mobile-nav-item ${isCurrent("/activity") ? "active" : ""}`}
              >
                <Package size={18} />
                <span>My Activity & Bookings</span>
              </button>
            )}

            {user && (user.role === "ENTREPRENEUR" || user.role === "ADMIN") && (
              <button
                onClick={() => handleNavClick("/entrepreneur")}
                className={`mobile-nav-item ${isCurrent("/entrepreneur") ? "active" : ""}`}
              >
                <Wrench size={18} />
                <span>Entrepreneur Hub</span>
              </button>
            )}

            {user && user.role === "ADMIN" && (
              <button
                onClick={() => handleNavClick("/admin")}
                className={`mobile-nav-item ${isCurrent("/admin") ? "active" : ""}`}
              >
                <Shield size={18} />
                <span>Admin Panel</span>
              </button>
            )}

            {(!user || user.role !== "ENTREPRENEUR") && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (!user) onOpenAuth();
                  else handleNavClick("/entrepreneur");
                }}
                className="btn-list-business w-full justify-center py-3"
              >
                <Store size={18} />
                <span>List Business <strong>FREE</strong></span>
              </button>
            )}

            {user ? (
              <div className="mobile-user-profile-bar mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">{user.full_name}</div>
                    <div className="text-xs text-amber font-semibold uppercase">{user.role}</div>
                  </div>
                  <button onClick={() => { setMobileMenuOpen(false); onLogout(); }} className="btn-danger btn-sm">
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setMobileMenuOpen(false); onOpenAuth(); }} className="btn-primary w-full justify-center mt-3">
                <User size={18} />
                <span>Sign In to HunarHub</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
