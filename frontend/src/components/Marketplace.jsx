import React, { useState, useEffect } from "react";
import {
  Star,
  MapPin,
  Clock,
  ShoppingBag,
  Calendar,
  ShieldCheck,
  ChevronRight,
  Filter,
  RotateCcw,
  MessageSquareQuote,
  Search,
  Sparkles,
  Send,
  ThumbsUp,
  Users,
  ShieldAlert,
  Store,
  Zap,
  List,
  Map as MapIcon,
  Award,
  CheckCircle,
  MessageSquare,
  Eye
} from "lucide-react";
import ArtisanProfileModal from "./ArtisanProfileModal";
import ChatModal from "./ChatModal";
import ArtisanMapView from "./ArtisanMapView";
import { api } from "../services/api";
import "./Marketplace.css";
import homeImage from "../assets/home.png";

export default function Marketplace({
  categories,
  entrepreneurs,
  services,
  products,
  selectedCategory,
  setSelectedCategory,
  selectedCity,
  setSelectedCity,
  searchQuery,
  onBookService,
  onOpenQuoteWizard,
  onAddToCart,
  onOpenAuth,
  loading: _loading,
  currentUser,
  showToast
}) {
  const [activeTab, setActiveTab] = useState("services"); // "services" | "entrepreneurs" | "products"
  const [viewMode, setViewMode] = useState("list"); // "list" | "map"
  const [selectedMinRating, setSelectedMinRating] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [skills, setSkills] = useState([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("recommended");
  const [heroSearch, setHeroSearch] = useState("");
  const [recentReviews, setRecentReviews] = useState([]);

  // Load skills & recent platform reviews
  useEffect(() => {
    api.getSkills()
      .then((res) => {
        if (res && res.skills) setSkills(res.skills);
      })
      .catch((err) => console.error("Error loading skills in marketplace:", err));

    api.getRecentReviews()
      .then((res) => {
        if (res && res.reviews) setRecentReviews(res.reviews);
      })
      .catch((err) => console.error("Error loading recent reviews:", err));
  }, []);
  
  // Prioritize core artisan categories: Cobbler, Potter, Tailor, Artisan, Handicraft, Vendor
  const priorityKeywords = ["cobbler", "potter", "tailor", "artisan", "handicraft", "vendor"];
  const sortedCategories = [...categories].sort((a, b) => {
    const aIdx = priorityKeywords.findIndex((k) => a.name.toLowerCase().includes(k));
    const bIdx = priorityKeywords.findIndex((k) => b.name.toLowerCase().includes(k));
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  // Modal states
  const [selectedArtisanForProfile, setSelectedArtisanForProfile] = useState(null);
  const [chatPartner, setChatPartner] = useState(null);

  // Extract unique cities
  const availableCities = Array.from(
    new Set(entrepreneurs.map((e) => e.city).filter(Boolean))
  );

  const epCityMap = {};
  entrepreneurs.forEach((e) => {
    if (e.id) epCityMap[e.id] = e.city;
  });

  const effectiveSearch = searchQuery || heroSearch;

  const availableSkills = skills.filter(
    (sk) => !selectedCategory || String(sk.category_id) === String(selectedCategory)
  );

  // Filter & Sort Services
  const filteredServices = services
    .filter((s) => {
      const matchesCat = !selectedCategory || String(s.category_id) === String(selectedCategory);
      const sCity = epCityMap[s.entrepreneur_id] || s.city || "";
      const matchesCity = !selectedCity || sCity.toLowerCase() === selectedCity.toLowerCase();
      const rating = Number(s.average_rating || 0);
      const matchesRating = !selectedMinRating || rating >= Number(selectedMinRating);
      const matchesSkill = !selectedSkill || String(s.skill_id) === String(selectedSkill) || s.skill_name?.toLowerCase().includes(selectedSkill.toLowerCase());
      const matchesMinPrice = !minPrice || Number(s.price) >= Number(minPrice);
      const matchesMaxPrice = !maxPrice || Number(s.price) <= Number(maxPrice);
      const matchesSearch = !effectiveSearch ||
        s.title?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        s.description?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        s.business_name?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        s.category_name?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        s.skill_name?.toLowerCase().includes(effectiveSearch.toLowerCase());
      return matchesCat && matchesCity && matchesRating && matchesSkill && matchesMinPrice && matchesMaxPrice && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "price_asc") return Number(a.price) - Number(b.price);
      if (sortBy === "rating_desc") return Number(b.average_rating || 0) - Number(a.average_rating || 0);
      return 0;
    });

  // Filter & Sort Products
  const filteredProducts = products
    .filter((p) => {
      const matchesCat = !selectedCategory || String(p.category_id) === String(selectedCategory);
      const pCity = epCityMap[p.entrepreneur_id] || p.city || "";
      const matchesCity = !selectedCity || pCity.toLowerCase() === selectedCity.toLowerCase();
      const rating = Number(p.average_rating || 0);
      const matchesRating = !selectedMinRating || rating >= Number(selectedMinRating);
      const matchesMinPrice = !minPrice || Number(p.price) >= Number(minPrice);
      const matchesMaxPrice = !maxPrice || Number(p.price) <= Number(maxPrice);
      const matchesSearch = !effectiveSearch ||
        p.name?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        p.description?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        p.business_name?.toLowerCase().includes(effectiveSearch.toLowerCase());
      return matchesCat && matchesCity && matchesRating && matchesMinPrice && matchesMaxPrice && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "price_asc") return Number(a.price) - Number(b.price);
      if (sortBy === "rating_desc") return Number(b.average_rating || 0) - Number(a.average_rating || 0);
      return 0;
    });

  // Filter & Sort Entrepreneurs
  const filteredEntrepreneurs = entrepreneurs
    .filter((e) => {
      const matchesCat = !selectedCategory || String(e.category_id) === String(selectedCategory);
      const matchesCity = !selectedCity || e.city?.toLowerCase() === selectedCity.toLowerCase();
      const rating = Number(e.average_rating || 0);
      const matchesRating = !selectedMinRating || rating >= Number(selectedMinRating);
      const matchesVerified = !verifiedOnly || (e.verification_status === "APPROVED" || e.is_identity_verified || e.is_artisan_verified || e.is_business_verified);
      const matchesSkill = !selectedSkill || (e.bio && e.bio.toLowerCase().includes(selectedSkill.toLowerCase()));
      const matchesSearch = !effectiveSearch ||
        e.business_name?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        e.full_name?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        e.city?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        e.bio?.toLowerCase().includes(effectiveSearch.toLowerCase());
      return matchesCat && matchesCity && matchesRating && matchesVerified && matchesSkill && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "rating_desc") return Number(b.average_rating || 0) - Number(a.average_rating || 0);
      return 0;
    });

  const hasActiveFilters = Boolean(
    selectedCategory || selectedCity || selectedSkill || minPrice || maxPrice ||
    selectedMinRating || verifiedOnly || sortBy !== "recommended" || effectiveSearch
  );

  const resetAllFilters = () => {
    setSelectedCategory(null);
    setSelectedCity("");
    setSelectedSkill("");
    setMinPrice("");
    setMaxPrice("");
    setSelectedMinRating("");
    setVerifiedOnly(false);
    setSortBy("recommended");
    setHeroSearch("");
  };

  return (
    <div className="marketplace-container">
      {/* SULEKHA HERO SECTION */}
      <div className="sulekha-hero-banner">
        <div className="hero-glow-orb" />

        <div className="sulekha-hero-content">
          <div className="sulekha-hero-badge">
            <Sparkles className="hero-badge-icon text-amber" />
            <span>Digital Marketplace for Local Micro-Entrepreneurs</span>
          </div>

          <h1 className="sulekha-hero-title">
            Every Skill Has a Story. <br />
            <span className="hero-title-highlight">
              Every Skill Deserves an Opportunity.
            </span>
          </h1>

          <p className="sulekha-hero-subtitle">
            <strong>Connecting Skills. Creating Opportunities.</strong> HunarHub / HunarSetu is a digital marketplace dedicated to empowering local micro-entrepreneurs — Cobblers, Potters (Kumhars), Tailors, Artisans, and Small Vendors — with zero commission fees and direct customer relationships.
          </p>

          {/* HERO ACTION BUTTONS: FIND LOCAL SKILLS & JOIN AS AN ENTREPRENEUR */}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", margin: "1.25rem 0" }}>
            <button
              onClick={() => {
                document.getElementById("marketplace-catalog")?.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                background: "linear-gradient(135deg, #d97706, #b45309)",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "0.85rem 1.6rem",
                fontWeight: 700,
                fontSize: "0.95rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(217, 119, 6, 0.35)"
              }}
            >
              <Search size={17} />
              <span>Find Local Skills</span>
            </button>

            <button
              onClick={() => {
                if (onOpenAuth) {
                  onOpenAuth({ isSignUp: true, role: "ENTREPRENEUR" });
                }
              }}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                color: "#f8fafc",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                borderRadius: "10px",
                padding: "0.85rem 1.6rem",
                fontWeight: 700,
                fontSize: "0.95rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer"
              }}
            >
              <Store size={17} color="#fbbf24" />
              <span>Join as an Entrepreneur</span>
            </button>
          </div>

          {/* SULEKHA HERO SEARCH & LEAD WIDGET */}
          <div className="sulekha-search-widget">
            <div className="search-input-field">
              <Search className="widget-icon text-amber" />
              <input
                type="text"
                placeholder="Search craft, artisan or service (e.g. shoe repair, terracotta pottery, tailoring...)"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
              />
            </div>

            <div className="city-select-field">
              <MapPin className="widget-icon text-emerald" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
              >
                <option value="">All Cities</option>
                {availableCities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="Mumbai">Mumbai</option>
                <option value="Pune">Pune</option>
                <option value="Delhi">Delhi</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Jaipur">Jaipur</option>
                <option value="Varanasi">Varanasi</option>
              </select>
            </div>

            <button
              onClick={() => onOpenQuoteWizard?.()}
              className="btn-quote-hero"
            >
              <Send size={16} />
              <span>Get Free Quotes</span>
            </button>
          </div>

          {/* POPULAR QUICK CATEGORY PILLS */}
          <div className="hero-quick-pills">
            <span className="pills-label">Popular Trades:</span>
            {[
              { label: "Cobbler / Shoes", match: "Cobbler" },
              { label: "Potter (Kumhar)", match: "Potter" },
              { label: "Tailor / Stitching", match: "Tailor" },
              { label: "Handmade Artisan", match: "Artisan" },
              { label: "Small Vendor", match: "Small vendor" },
              { label: "Wood Worker", match: "Wood Worker" }
            ].map((pill) => {
              const matchedCat = categories.find(c => c.name.toLowerCase().includes(pill.match.toLowerCase()));
              const catId = matchedCat ? String(matchedCat.id) : null;
              const isActive = catId && selectedCategory === catId;
              return (
                <button
                  key={pill.label}
                  className={`quick-pill ${isActive ? "active" : ""}`}
                  onClick={() => {
                    if (catId) {
                      setSelectedCategory(isActive ? null : catId);
                    }
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="hero-image-wrapper">
          <img
            src={homeImage}
            alt="Local service provider artisan"
            className="sulekha-hero-image"
          />
          <div className="hero-image-badge-floating">
            <ShieldCheck className="text-emerald" size={24} />
            <div>
              <strong>Verified Micro-Entrepreneurs</strong>
              <span>Direct Skill-to-Opportunity Platform</span>
            </div>
          </div>
        </div>
      </div>

      {/* EXPLANATORY MISSION & VALUE PROPOSITION SECTION */}
      <div style={{
        margin: "2.5rem 0",
        padding: "2rem",
        background: "rgba(15, 23, 42, 0.5)",
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.08)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <span style={{ color: "#d97706", fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            The HunarHub Difference
          </span>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#ffffff", marginTop: "0.35rem" }}>
            Direct, Fair & Community-Powered Marketplace
          </h2>
          <p style={{ color: "#94a3b8", maxWidth: "680px", margin: "0.5rem auto 0", fontSize: "0.95rem" }}>
            Built to uplift unorganized skilled labor, give craftsmen their due respect, and provide households transparent access to verified local talents.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.5rem"
        }}>
          <div style={{ background: "rgba(30, 41, 59, 0.7)", padding: "1.4rem", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "rgba(217, 119, 6, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f59e0b", marginBottom: "0.75rem" }}>
              <Zap size={20} />
            </div>
            <h3 style={{ color: "#ffffff", fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.4rem" }}>What HunarHub Does</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.88rem", lineHeight: 1.5, margin: 0 }}>
              Provides a direct digital bridge between skilled neighborhood micro-entrepreneurs and consumers, eliminating parasitic middlemen and predatory commission fees.
            </p>
          </div>

          <div style={{ background: "rgba(30, 41, 59, 0.7)", padding: "1.4rem", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981", marginBottom: "0.75rem" }}>
              <Users size={20} />
            </div>
            <h3 style={{ color: "#ffffff", fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.4rem" }}>Who We Help</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.88rem", lineHeight: 1.5, margin: 0 }}>
              Cobblers, traditional Kumhars (potters), custom tailors, handcraft artisans, woodworkers, and local street vendors who lack expensive marketing budgets.
            </p>
          </div>

          <div style={{ background: "rgba(30, 41, 59, 0.7)", padding: "1.4rem", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "rgba(6, 182, 212, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#06b6d4", marginBottom: "0.75rem" }}>
              <Search size={20} />
            </div>
            <h3 style={{ color: "#ffffff", fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.4rem" }}>For Conscious Customers</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.88rem", lineHeight: 1.5, margin: 0 }}>
              Find verified artisans nearby, request transparent competitive quotes, chat directly, book doorstep repairs, and buy genuine handmade products.
            </p>
          </div>

          <div style={{ background: "rgba(30, 41, 59, 0.7)", padding: "1.4rem", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "rgba(168, 85, 247, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a855f7", marginBottom: "0.75rem" }}>
              <Store size={20} />
            </div>
            <h3 style={{ color: "#ffffff", fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.4rem" }}>For Micro-Entrepreneurs</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.88rem", lineHeight: 1.5, margin: 0 }}>
              Zero registration fees, 0% platform cuts, authentic digital showcase, direct customer leads, and verifiable reputation building in their local communities.
            </p>
          </div>
        </div>
      </div>

      {/* POPULAR CATEGORIES GRID */}
      <div className="sulekha-categories-section">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">Explore Top Artisan Categories</h2>
            <p className="section-subtitle">Select a category to connect with top-rated verified micro-entrepreneurs & get free quotes.</p>
          </div>
          {selectedCategory && (
            <button onClick={() => setSelectedCategory(null)} className="btn-link-amber">
              Show All Categories
            </button>
          )}
        </div>

        <div className="categories-cards-grid">
          {sortedCategories.map((cat) => {
            const count = services.filter((s) => String(s.category_id) === String(cat.id)).length;
            const isSelected = selectedCategory === String(cat.id);
            return (
              <div
                key={cat.id}
                className={`category-card-box ${isSelected ? "selected" : ""}`}
                onClick={() => setSelectedCategory(isSelected ? null : String(cat.id))}
              >
                <div className="category-card-top">
                  <span className="category-emoji-badge"><Award size={20} color="#d97706" /></span>
                  <span className="category-count-pill">{count > 0 ? `${count}+ Services` : "Local Skills"}</span>
                </div>
                <h3 className="category-card-name">{cat.name}</h3>
                <p className="category-card-desc">{cat.description}</p>
                <div className="category-card-footer">
                  <span className="category-action-link">
                    Get Free Quotes <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* COMPACT FILTER BAR */}
      <div className="glass-panel compact-filter-bar">
        <div className="filter-bar-header">
          <div className="filter-bar-title">
            <Filter className="category-icon text-amber" />
            <span>Filter Verified Providers & Services</span>
            {selectedCity && <span className="city-pill">{selectedCity}</span>}
          </div>
          {hasActiveFilters && (
            <button onClick={resetAllFilters} className="reset-filters-btn">
              <RotateCcw className="reset-icon" /> Reset All Filters
            </button>
          )}
        </div>

        <div className="filter-dropdowns-row">
          {/* Category Dropdown */}
          <div className="filter-select-group">
            <label className="filter-label">Service Category</label>
            <select
              value={selectedCategory || ""}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="filter-select-control"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location Dropdown */}
          <div className="filter-select-group">
            <label className="filter-label">City / Region</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="filter-select-control"
            >
              <option value="">All Cities & Regions</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
              <option value="Mumbai">Mumbai</option>
              <option value="Pune">Pune</option>
              <option value="Delhi">Delhi</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Jaipur">Jaipur</option>
              <option value="Varanasi">Varanasi</option>
            </select>
          </div>

          {/* Skill Type Dropdown */}
          <div className="filter-select-group">
            <label className="filter-label">Skill Type</label>
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="filter-select-control"
            >
              <option value="">All Skills & Crafts</option>
              {availableSkills.map((sk) => (
                <option key={sk.id} value={sk.id}>
                  {sk.name}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range Filter */}
          <div className="filter-select-group">
            <label className="filter-label">Price Range (₹)</label>
            <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
              <input
                type="number"
                placeholder="Min ₹"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                style={{
                  width: "72px",
                  padding: "0.45rem",
                  background: "#0f172a",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "0.82rem"
                }}
              />
              <span style={{ color: "#94a3b8" }}>-</span>
              <input
                type="number"
                placeholder="Max ₹"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                style={{
                  width: "72px",
                  padding: "0.45rem",
                  background: "#0f172a",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "0.82rem"
                }}
              />
            </div>
          </div>

          {/* Minimum Rating Dropdown */}
          <div className="filter-select-group">
            <label className="filter-label">Rating Filter</label>
            <select
              value={selectedMinRating}
              onChange={(e) => setSelectedMinRating(e.target.value)}
              className="filter-select-control"
            >
              <option value="">All Ratings</option>
              <option value="4.8">4.8 & Above (Top Rated)</option>
              <option value="4.5">4.5 & Above</option>
              <option value="4.0">4.0 & Above</option>
            </select>
          </div>

          {/* Verified Only Checkbox */}
          <div className="filter-select-group">
            <label className="filter-label">Verification</label>
            <label className="filter-checkbox-container">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                style={{ accentColor: "#d97706", width: "16px", height: "16px", cursor: "pointer" }}
              />
              <span>Verified Badges Only</span>
            </label>
          </div>

          {/* Sort Dropdown */}
          <div className="filter-select-group">
            <label className="filter-label">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select-control"
            >
              <option value="recommended">Featured / Recommended</option>
              <option value="rating_desc">Highest Rated Experts</option>
              <option value="price_asc">Price: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT TABS BAR & VIEW MODE TOGGLE */}
      <div className="marketplace-tabs-bar" id="marketplace-catalog">
        <div className="tab-selector-group">
          <button
            onClick={() => setActiveTab("services")}
            className={`tab-btn ${activeTab === "services" ? "active" : ""}`}
          >
            Local Services ({filteredServices.length})
          </button>
          <button
            onClick={() => setActiveTab("entrepreneurs")}
            className={`tab-btn ${activeTab === "entrepreneurs" ? "active" : ""}`}
          >
            Verified Artisans ({filteredEntrepreneurs.length})
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`tab-btn ${activeTab === "products" ? "active" : ""}`}
          >
            Handcrafted Products ({filteredProducts.length})
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* View Mode Switcher */}
          {activeTab === "entrepreneurs" && (
            <div style={{ display: "flex", background: "#e2e8f0", padding: "0.25rem", borderRadius: "10px", gap: "0.25rem" }}>
              <button
                className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                style={{ padding: "0.4rem 0.75rem", border: "none", borderRadius: "8px", background: viewMode === "list" ? "#ffffff" : "transparent", color: viewMode === "list" ? "#0f172a" : "#64748b", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem" }}
                onClick={() => setViewMode("list")}
              >
                <List size={14} /> List View
              </button>
              <button
                className={`view-toggle-btn ${viewMode === "map" ? "active" : ""}`}
                style={{ padding: "0.4rem 0.75rem", border: "none", borderRadius: "8px", background: viewMode === "map" ? "#ffffff" : "transparent", color: viewMode === "map" ? "#0f172a" : "#64748b", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem" }}
                onClick={() => setViewMode("map")}
              >
                <MapIcon size={14} /> Map View
              </button>
            </div>
          )}

          <span className="results-count-badge">
            Showing {activeTab === "services" ? filteredServices.length : activeTab === "entrepreneurs" ? filteredEntrepreneurs.length : filteredProducts.length} verified listings
          </span>
        </div>
      </div>

      {/* SERVICES TAB VIEW */}
      {activeTab === "services" && (
        <div className="catalog-grid-4">
          {filteredServices.map((svc) => (
            <div key={svc.id} className="glass-panel catalog-card sulekha-provider-card">
              <div className="catalog-card-body">
                <div className="card-top-header">
                  <span className="badge badge-accepted">
                    {svc.category_name || "Craft Service"}
                  </span>
                  <div className="rating-pill">
                    {Number(svc.average_rating) > 0 ? (
                      <>
                        <Star className="rating-star-icon" />
                        <span>{Number(svc.average_rating).toFixed(1)}</span>
                        <span className="reviews-count">({svc.total_reviews || svc.reviews_count || 1})</span>
                      </>
                    ) : (
                      <span className="reviews-count">No reviews yet</span>
                    )}
                  </div>
                </div>

                <h3 className="card-title">
                  {svc.title}
                </h3>
                
                <p className="card-description">
                  {svc.description}
                </p>

                {/* Expert Profile Banner */}
                <div className="provider-sub-box">
                  <div className="provider-top-row">
                    <span className="provider-name">{svc.business_name || "Local Artisan"}</span>
                    {svc.verification_status === "APPROVED" && (
                      <span className="sulekha-verified-pill">
                        <ShieldCheck size={12} /> Verified
                      </span>
                    )}
                  </div>
                  <div className="provider-meta-row">
                    <span className="meta-item">
                      <MapPin className="meta-icon text-amber" />
                      <span>{svc.city || "Location not specified"}</span>
                    </span>
                    {svc.response_time && (
                      <span className="meta-item response-badge">
                        <Zap size={12} className="text-amber" />
                        <span>{svc.response_time}</span>
                      </span>
                    )}
                    {svc.estimated_duration && (
                      <span className="meta-item">
                        <Clock className="meta-icon" />
                        <span>~{svc.estimated_duration}m</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="card-bottom-footer">
                <div className="price-box">
                  <span className="price-box-title">{svc.price_type === "STARTING_FROM" ? "Starting From" : "Est. Quote"}</span>
                  <span className="price-box-amount">₹{svc.price}</span>
                </div>
                <div className="card-actions-group">
                  <button
                    onClick={() => onOpenQuoteWizard?.(svc)}
                    className="btn-secondary btn-quote-action"
                    title="Get free quotes from verified experts"
                  >
                    <MessageSquareQuote className="btn-icon-left" />
                    <span>Get Quote</span>
                  </button>
                  <button
                    onClick={() => onBookService(svc, "book")}
                    className="btn-primary"
                  >
                    <Calendar className="btn-icon-left" />
                    <span>Book Service</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredServices.length === 0 && (
            <div className="empty-search-box">
              <ShieldAlert style={{ width: "2.5rem", height: "2.5rem", color: "#F59E0B" }} />
              <h3>No matching services found</h3>
              <p>No verified service providers matched your filters in {selectedCity || "this region"}.</p>
              <button onClick={resetAllFilters} className="btn-secondary">Clear Filters & Show All</button>
            </div>
          )}
        </div>
      )}

      {/* ENTREPRENEURS / EXPERTS TAB VIEW */}
      {activeTab === "entrepreneurs" && (
        viewMode === "map" ? (
          <ArtisanMapView
            artisans={filteredEntrepreneurs}
            onSelectArtisan={(artisan) => setSelectedArtisanForProfile(artisan.id)}
            onGetQuote={(artisan) => onOpenQuoteWizard?.(null, { id: artisan.category_id, name: artisan.business_name })}
          />
        ) : (
          <div className="catalog-grid-4 catalog-grid-experts">
            {filteredEntrepreneurs.map((ep) => (
              <div key={ep.id} className="glass-panel catalog-card sulekha-expert-card">
                <div className="expert-card-left">
                  <img
                    src={ep.profile_image || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300"}
                    alt={ep.business_name}
                    className="expert-card-avatar"
                  />
                  {ep.verification_status === "APPROVED" && (
                    <span className="expert-verified-badge">
                      <ShieldCheck size={14} /> Verified Artisan
                    </span>
                  )}
                </div>

                <div className="expert-card-right">
                  <div className="expert-header">
                    <div>
                      <h3 className="expert-business-title">{ep.business_name}</h3>
                      <p className="expert-person-name">By {ep.full_name}</p>
                    </div>
                    <div className="rating-pill">
                      {Number(ep.average_rating) > 0 ? (
                        <>
                          <Star className="rating-star-icon" />
                          <span>{Number(ep.average_rating).toFixed(1)}</span>
                        </>
                      ) : (
                        <span className="reviews-count">No reviews yet</span>
                      )}
                    </div>
                  </div>

                  <div className="expert-tags-row">
                    <span className="expert-tag-item"><MapPin size={12} /> {ep.city || "Location not specified"}</span>
                    {ep.experience_years ? (
                      <span className="expert-tag-item"><Award size={12} /> {ep.experience_years}+ Yrs Exp</span>
                    ) : null}
                    {ep.response_time ? (
                      <span className="expert-tag-item"><Zap size={12} /> {ep.response_time}</span>
                    ) : null}
                  </div>

                  <p className="expert-bio">{ep.bio}</p>

                  <div className="expert-actions-row">
                    <button
                      onClick={() => setSelectedArtisanForProfile(ep.id)}
                      className="btn-secondary"
                      title="View full portfolio and services"
                    >
                      <Eye size={14} />
                      <span>View Profile</span>
                    </button>
                    <button
                      onClick={() => setChatPartner(ep)}
                      className="btn-secondary"
                      title="Direct message artisan"
                    >
                      <MessageSquare size={14} />
                      <span>Chat</span>
                    </button>
                    <button
                      onClick={() => onOpenQuoteWizard?.(null, { id: ep.category_id, name: ep.business_name })}
                      className="btn-primary"
                    >
                      <MessageSquareQuote size={14} />
                      <span>Get Quote</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredEntrepreneurs.length === 0 && (
              <div className="empty-search-box">
                <ShieldAlert style={{ width: "2.5rem", height: "2.5rem", color: "#F59E0B" }} />
                <h3>No micro-entrepreneurs found</h3>
                <p>No verified local artisans found matching criteria.</p>
                <button onClick={resetAllFilters} className="btn-secondary">Clear Filters & Show All</button>
              </div>
            )}
          </div>
        )
      )}

      {/* PRODUCTS TAB VIEW */}
      {activeTab === "products" && (
        <div className="catalog-grid-4">
          {filteredProducts.map((prod) => (
            <div key={prod.id} className="glass-panel catalog-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="product-card-image-box">
                <img
                  src={prod.primary_image || prod.image_url || "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500"}
                  alt={prod.name}
                />
                <div className="stock-tag">
                  In Stock: {prod.stock_quantity}
                </div>
              </div>

              <div className="product-card-body">
                <div className="product-card-info">
                  <span className="badge badge-pending">
                    {prod.category_name || "Handcrafted Product"}
                  </span>
                  <h3 className="card-title" style={{ fontSize: '1rem' }}>
                    {prod.name}
                  </h3>
                  <p className="card-description">
                    {prod.description}
                  </p>
                </div>

                <div className="card-bottom-footer">
                  <div>
                    <span className="price-box-title">Price</span>
                    <span className="price-box-amount">₹{prod.price}</span>
                  </div>
                  <button
                    onClick={() => onAddToCart(prod)}
                    className="btn-primary"
                  >
                    <ShoppingBag className="btn-icon-left" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 && (
            <div className="empty-search-box">
              <p>No products matched your search filters.</p>
              <button onClick={resetAllFilters} className="btn-secondary">Clear Filters & Show All</button>
            </div>
          )}
        </div>
      )}

      {/* HOW HUNARHUB WORKS */}
      <div className="glass-panel" style={{ padding: "2.5rem", margin: "3rem 0", borderRadius: "1.5rem" }}>
        <div className="section-header text-center" style={{ marginBottom: "2rem" }}>
          <h2 className="section-title justify-center">How HunarHub Empowers Customers & Artisans</h2>
          <p className="section-subtitle">A seamless 4-step process to discover, request, and receive verified local craft services.</p>
        </div>

        <div className="trust-grid-4">
          <div className="trust-card">
            <div className="trust-icon-circle bg-amber">
              <Search size={24} />
            </div>
            <h3>1. Search Craft or Skill</h3>
            <p>Browse nearby tailors, cobblers, potters, carpenters, and repair specialists in your city.</p>
          </div>

          <div className="trust-card">
            <div className="trust-icon-circle bg-cyan">
              <MessageSquareQuote size={24} />
            </div>
            <h3>2. Request Free Quotes</h3>
            <p>Describe your job to get instant estimated quotes with zero hidden charges.</p>
          </div>

          <div className="trust-card">
            <div className="trust-icon-circle bg-purple">
              <MessageSquare size={24} />
            </div>
            <h3>3. Chat & Schedule</h3>
            <p>Communicate directly with verified artisans to finalize service time and details.</p>
          </div>

          <div className="trust-card">
            <div className="trust-icon-circle bg-emerald">
              <CheckCircle size={24} />
            </div>
            <h3>4. Verified Completion</h3>
            <p>Receive quality work directly at your doorstep and leave a verified customer review.</p>
          </div>
        </div>
      </div>

      {/* TRUST BANNER */}
      <div className="sulekha-trust-banner">
        <h2 className="trust-banner-title">Why Customers Trust HunarHub Micro-Entrepreneur Network</h2>
        <div className="trust-grid-4">
          <div className="trust-card">
            <div className="trust-icon-circle bg-amber">
              <Users size={24} />
            </div>
            <h3>Verified Local Artisans</h3>
            <p>Direct connect with cobblers, potters, tailors, carpenters, and appliance experts.</p>
          </div>

          <div className="trust-card">
            <div className="trust-icon-circle bg-emerald">
              <ShieldCheck size={24} />
            </div>
            <h3>Multi-Criteria Trust Badges</h3>
            <p>Identity, phone, artisan skill, and business registration verified.</p>
          </div>

          <div className="trust-card">
            <div className="trust-icon-circle bg-cyan">
              <Zap size={24} />
            </div>
            <h3>Fast Response Quotes</h3>
            <p>Get custom price estimates and direct messaging from local experts.</p>
          </div>

          <div className="trust-card">
            <div className="trust-icon-circle bg-purple">
              <ThumbsUp size={24} />
            </div>
            <h3>100% Free Lead Quotes</h3>
            <p>Compare price estimates with zero hidden charges or obligations.</p>
          </div>
        </div>
      </div>

      {/* VERIFIED CUSTOMER REVIEWS */}
      <div className="sulekha-reviews-section">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">Verified Customer Reviews</h2>
            <p className="section-subtitle">Authentic feedback from customers who booked services or ordered products from local artisans on HunarHub.</p>
          </div>
        </div>

        {recentReviews && recentReviews.length > 0 ? (
          <div className="reviews-cards-grid">
            {recentReviews.map((rev) => (
              <div key={rev.id} className="review-card-box">
                <div className="review-card-header">
                  <strong>{rev.customer_name || "Verified Customer"}</strong>
                  {rev.artisan_city && <span className="review-city">{rev.artisan_city}</span>}
                </div>
                <div className="review-stars">
                  {[...Array(Math.min(5, Math.max(1, Math.round(Number(rev.rating) || 5))))].map((_, i) => (
                    <Star key={i} size={14} className="star-filled" />
                  ))}
                </div>
                {rev.business_name && (
                  <span className="review-service-tag">{rev.business_name}</span>
                )}
                <p className="review-comment">"{rev.comment || "Great craftsmanship and transparent service."}"</p>
                <div className="review-expert-ref">Verified Transaction</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "3rem 1.5rem", background: "rgba(15, 23, 42, 0.4)", borderRadius: "16px", border: "1px dashed rgba(255, 255, 255, 0.15)", margin: "1rem 0" }}>
            <MessageSquareQuote size={40} color="#d97706" style={{ margin: "0 auto 1rem", opacity: 0.8 }} />
            <h3 style={{ color: "#ffffff", fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Authentic, Verified Reviews
            </h3>
            <p style={{ color: "#94a3b8", maxWidth: "560px", margin: "0 auto", fontSize: "0.95rem", lineHeight: 1.6 }}>
              Reviews on HunarHub are submitted exclusively by customers following verified, completed jobs and orders. Book a local artisan today to share the first review!
            </p>
          </div>
        )}
      </div>

      {/* BECOME AN ARTISAN PARTNER BANNER */}
      <div className="sulekha-partner-banner">
        <div className="partner-banner-content">
          <span className="partner-badge">
            <Store size={14} /> Become a Verified Partner
          </span>
          <h2>Are you a Local Micro-Entrepreneur or Artisan?</h2>
          <p>
            Grow your trade with HunarHub. List your skills or handcrafted goods with 0% platform commission, receive direct customer leads in your city, and build a verified digital reputation.
          </p>

          {/* Real Platform Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "1rem", margin: "1.5rem 0" }}>
            <div style={{ background: "rgba(255, 255, 255, 0.08)", padding: "1rem", borderRadius: "10px", textAlign: "center" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f59e0b" }}>{entrepreneurs.length}</div>
              <div style={{ fontSize: "0.82rem", color: "#e2e8f0" }}>Active Artisans</div>
            </div>
            <div style={{ background: "rgba(255, 255, 255, 0.08)", padding: "1rem", borderRadius: "10px", textAlign: "center" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f59e0b" }}>{categories.length}</div>
              <div style={{ fontSize: "0.82rem", color: "#e2e8f0" }}>Specialized Trades</div>
            </div>
            <div style={{ background: "rgba(255, 255, 255, 0.08)", padding: "1rem", borderRadius: "10px", textAlign: "center" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f59e0b" }}>{services.length}</div>
              <div style={{ fontSize: "0.82rem", color: "#e2e8f0" }}>Listed Services</div>
            </div>
            <div style={{ background: "rgba(255, 255, 255, 0.08)", padding: "1rem", borderRadius: "10px", textAlign: "center" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f59e0b" }}>{products.length}</div>
              <div style={{ fontSize: "0.82rem", color: "#e2e8f0" }}>Handcrafted Goods</div>
            </div>
            <div style={{ background: "rgba(255, 255, 255, 0.08)", padding: "1rem", borderRadius: "10px", textAlign: "center" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#10b981" }}>0%</div>
              <div style={{ fontSize: "0.82rem", color: "#e2e8f0" }}>Platform Commission</div>
            </div>
          </div>

          <button
            onClick={() => {
              if (onOpenAuth) {
                onOpenAuth({ isSignUp: true, role: "ENTREPRENEUR" });
              }
            }}
            className="btn-partner-cta"
          >
            <Store size={16} />
            <span>Join as an Entrepreneur (Free)</span>
          </button>
        </div>
      </div>

      {/* MODALS */}
      {selectedArtisanForProfile && (
        <ArtisanProfileModal
          artisanId={selectedArtisanForProfile}
          onClose={() => setSelectedArtisanForProfile(null)}
          onRequestService={(artisan, svc) => {
            setSelectedArtisanForProfile(null);
            if (svc) onBookService(svc, "book");
            else onOpenQuoteWizard?.(null, { id: artisan?.category_id, name: artisan?.business_name });
          }}
          onOpenChat={(artisan) => {
            setSelectedArtisanForProfile(null);
            setChatPartner(artisan);
          }}
          showToast={showToast}
        />
      )}

      {chatPartner && (
        <ChatModal
          partner={chatPartner}
          currentUser={currentUser}
          onClose={() => setChatPartner(null)}
        />
      )}
    </div>
  );
}
