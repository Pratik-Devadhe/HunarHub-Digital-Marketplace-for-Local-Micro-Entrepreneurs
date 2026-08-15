import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingBag, Search, User, LogOut, Shield, Wrench, Package, Sparkles } from "lucide-react";
import "./Navbar.css";

export default function Navbar({
  user,
  cartCount,
  onOpenCart,
  onOpenAuth,
  onLogout,
  searchQuery,
  setSearchQuery
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
        
        {/* Brand Logo */}
        <div className="navbar-brand" onClick={() => navigate("/")}>
          <div className="brand-icon-box">
            <div className="brand-icon-inner">
              H
            </div>
          </div>
          <div>
            <span className="brand-text-title">
              HunarHub
            </span>
            <span className="brand-text-sub">
              Connecting Skills Creating Opportunities
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="navbar-search">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search cobblers, pottery, sarees, products by skill or city..."
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
            <span>Explore Marketplace</span>
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

        {/* Right Actions: Cart & Profile */}
        <div className="navbar-actions">
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
