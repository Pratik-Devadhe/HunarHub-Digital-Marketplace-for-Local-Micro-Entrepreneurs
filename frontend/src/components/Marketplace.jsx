import React, { useState } from "react";
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
  PhoneCall,
  ThumbsUp,
  Users,
  ShieldAlert,
  Store,
  ArrowRight,
  Zap,
  List,
  Map as MapIcon,
  Award,
  CheckCircle,
  MessageSquare,
  Eye,
  SlidersHorizontal
} from "lucide-react";
import ArtisanProfileModal from "./ArtisanProfileModal";
import ChatModal from "./ChatModal";
import ArtisanMapView from "./ArtisanMapView";
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
  loading,
  currentUser,
  showToast
}) {
  const [activeTab, setActiveTab] = useState("services"); // "services" | "entrepreneurs" | "products"
  const [viewMode, setViewMode] = useState("list"); // "list" | "map"
  const [selectedMinRating, setSelectedMinRating] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("recommended");
  const [heroSearch, setHeroSearch] = useState("");
  
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

  // Filter & Sort Services
  const filteredServices = services
    .filter((s) => {
      const matchesCat = !selectedCategory || String(s.category_id) === String(selectedCategory);
      const sCity = epCityMap[s.entrepreneur_id] || s.city || "";
      const matchesCity = !selectedCity || sCity.toLowerCase() === selectedCity.toLowerCase();
      const rating = Number(s.average_rating || 4.9);
      const matchesRating = !selectedMinRating || rating >= Number(selectedMinRating);
      const matchesSearch = !effectiveSearch ||
        s.title?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        s.description?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        s.business_name?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        s.category_name?.toLowerCase().includes(effectiveSearch.toLowerCase());
      return matchesCat && matchesCity && matchesRating && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "price_asc") return Number(a.price) - Number(b.price);
      if (sortBy === "price_desc") return Number(b.price) - Number(a.price);
      if (sortBy === "rating_desc") return Number(b.average_rating || 4.9) - Number(a.average_rating || 4.9);
      return 0;
    });

  // Filter & Sort Products
  const filteredProducts = products
    .filter((p) => {
      const matchesCat = !selectedCategory || String(p.category_id) === String(selectedCategory);
      const pCity = epCityMap[p.entrepreneur_id] || p.city || "";
      const matchesCity = !selectedCity || pCity.toLowerCase() === selectedCity.toLowerCase();
      const rating = Number(p.average_rating || 4.9);
      const matchesRating = !selectedMinRating || rating >= Number(selectedMinRating);
      const matchesSearch = !effectiveSearch ||
        p.name?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        p.description?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        p.business_name?.toLowerCase().includes(effectiveSearch.toLowerCase());
      return matchesCat && matchesCity && matchesRating && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "price_asc") return Number(a.price) - Number(b.price);
      if (sortBy === "price_desc") return Number(b.price) - Number(a.price);
      if (sortBy === "rating_desc") return Number(p.average_rating || 4.9) - Number(a.average_rating || 4.9);
      return 0;
    });

  // Filter & Sort Entrepreneurs
  const filteredEntrepreneurs = entrepreneurs
    .filter((e) => {
      const matchesCat = !selectedCategory || String(e.category_id) === String(selectedCategory);
      const matchesCity = !selectedCity || e.city?.toLowerCase() === selectedCity.toLowerCase();
      const rating = Number(e.average_rating || 4.9);
      const matchesRating = !selectedMinRating || rating >= Number(selectedMinRating);
      const matchesVerified = !verifiedOnly || (e.is_identity_verified || e.is_artisan_verified || e.is_business_verified);
      const matchesSearch = !effectiveSearch ||
        e.business_name?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        e.full_name?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        e.city?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        e.bio?.toLowerCase().includes(effectiveSearch.toLowerCase());
      return matchesCat && matchesCity && matchesRating && matchesVerified && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "rating_desc") return Number(b.average_rating || 4.9) - Number(a.average_rating || 4.9);
      if (sortBy === "experience") return Number(b.experience_years || 0) - Number(a.experience_years || 0);
      return 0;
    });

  const hasActiveFilters = Boolean(selectedCategory || selectedCity || selectedMinRating || verifiedOnly || sortBy !== "recommended" || effectiveSearch);

  const resetAllFilters = () => {
    setSelectedCategory(null);
    setSelectedCity("");
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
            <span>India's Premier Local Expert & Micro-Entrepreneur Platform</span>
          </div>

          <h1 className="sulekha-hero-title">
            Get Matched with Top <br />
            <span className="hero-title-highlight">
              Verified Local Experts
            </span> Near You
          </h1>

          <p className="sulekha-hero-subtitle">
            Compare free price quotes for Cobbler Resoling, Earthen Pottery, Designer Tailoring, Appliance Servicing, Shifting, Painting, and Craft Work in your city.
          </p>

          {/* SULEKHA HERO SEARCH & LEAD WIDGET */}
          <div className="sulekha-search-widget">
            <div className="search-input-field">
              <Search className="widget-icon text-amber" />
              <input
                type="text"
                placeholder="What service do you need? (e.g. shoe resoling, tailor, AC repair...)"
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
            <span className="pills-label">Popular Crafts:</span>
            {[
              { label: "Leather & Boots", catId: 1 },
              { label: "Pottery & Matkas", catId: 2 },
              { label: "Tailoring & Blouse", catId: 3 },
              { label: "AC & Appliance Fix", catId: 4 },
              { label: "House Shifting", catId: 6 },
              { label: "Home Painting", catId: 8 }
            ].map((pill) => (
              <button
                key={pill.label}
                className={`quick-pill ${selectedCategory === String(pill.catId) ? "active" : ""}`}
                onClick={() => setSelectedCategory(selectedCategory === String(pill.catId) ? null : String(pill.catId))}
              >
                {pill.label}
              </button>
            ))}
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
              <strong>100% Verified Artisans</strong>
              <span>Fast 15-Min Lead Connect</span>
            </div>
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
          {categories.map((cat) => {
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
                  <span className="category-count-pill">{count > 0 ? `${count}+ Services` : "Verified Experts"}</span>
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
          <div className="filter-select-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.2rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.88rem", fontWeight: 600, color: "#334155" }}>
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                style={{ accentColor: "#d97706" }}
              />
              Verified Badges Only
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
              <option value="experience">Most Experienced</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT TABS BAR & VIEW MODE TOGGLE */}
      <div className="marketplace-tabs-bar">
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
                    <Star className="rating-star-icon" />
                    <span>{Number(svc.average_rating || 4.9).toFixed(1)}</span>
                    <span className="reviews-count">({svc.reviews_count || 120})</span>
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
                    <span className="provider-name">{svc.business_name || "Verified Expert"}</span>
                    <span className="sulekha-verified-pill">
                      <ShieldCheck size={12} /> Verified Expert
                    </span>
                  </div>
                  <div className="provider-meta-row">
                    <span className="meta-item">
                      <MapPin className="meta-icon text-amber" />
                      <span>{svc.city || "Mumbai"}</span>
                    </span>
                    <span className="meta-item response-badge">
                      <Zap size={12} className="text-amber" />
                      <span>{svc.response_time || "15 mins"}</span>
                    </span>
                    <span className="meta-item">
                      <Clock className="meta-icon" />
                      <span>~{svc.estimated_duration || 45}m</span>
                    </span>
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
          <div className="catalog-grid-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
            {filteredEntrepreneurs.map((ep) => (
              <div key={ep.id} className="glass-panel catalog-card sulekha-expert-card">
                <div className="expert-card-left">
                  <img
                    src={ep.profile_image || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300"}
                    alt={ep.business_name}
                    className="expert-card-avatar"
                  />
                  <span className="expert-verified-badge">
                    <ShieldCheck size={14} /> Verified Artisan
                  </span>
                </div>

                <div className="expert-card-right">
                  <div className="expert-header">
                    <div>
                      <h3 className="expert-business-title">{ep.business_name}</h3>
                      <p className="expert-person-name">By {ep.full_name}</p>
                    </div>
                    <div className="rating-pill">
                      <Star className="rating-star-icon" />
                      <span>{Number(ep.average_rating || 4.9).toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="expert-tags-row">
                    <span className="expert-tag-item"><MapPin size={12} /> {ep.city || "Mumbai"}</span>
                    <span className="expert-tag-item"><Award size={12} /> {ep.experience_years || 10}+ Yrs Exp</span>
                    <span className="expert-tag-item"><Zap size={12} /> {ep.response_time || "15 mins"}</span>
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
            <p className="section-subtitle">Real feedback from satisfied customers who booked local artisans on HunarHub.</p>
          </div>
        </div>

        <div className="reviews-cards-grid">
          <div className="review-card-box">
            <div className="review-card-header">
              <strong>Priya Sharma</strong>
              <span className="review-city">Pune</span>
            </div>
            <div className="review-stars">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="star-filled" />
              ))}
            </div>
            <span className="review-service-tag">Designer Blouse Alteration</span>
            <p className="review-comment">
              "Found Ramesh Tailors on HunarHub. They fixed my wedding blouse fitting in just 2 hours! Excellent craft and polite behavior."
            </p>
            <div className="review-expert-ref">Artisan: Ramesh Tailors</div>
          </div>

          <div className="review-card-box">
            <div className="review-card-header">
              <strong>Amit Varma</strong>
              <span className="review-city">Mumbai</span>
            </div>
            <div className="review-stars">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="star-filled" />
              ))}
            </div>
            <span className="review-service-tag">Leather Boot Resoling</span>
            <p className="review-comment">
              "My formal leather shoes had worn-out soles. Precision Leather Works resoled them with genuine rubber soles at a fraction of showroom price."
            </p>
            <div className="review-expert-ref">Artisan: Precision Leather Works</div>
          </div>

          <div className="review-card-box">
            <div className="review-card-header">
              <strong>Sneha Kulkarni</strong>
              <span className="review-city">Bengaluru</span>
            </div>
            <div className="review-stars">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="star-filled" />
              ))}
            </div>
            <span className="review-service-tag">Handcrafted Earthen Matkas</span>
            <p className="review-comment">
              "Ordered beautiful terracotta clay pots for summer. Delivered safely with zero damage. Superb natural cooling."
            </p>
            <div className="review-expert-ref">Artisan: ClayCraft Artisans</div>
          </div>
        </div>
      </div>

      {/* BECOME AN ARTISAN PARTNER BANNER */}
      <div className="sulekha-partner-banner">
        <div className="partner-banner-content">
          <span className="partner-badge">
            <Store size={14} /> Become a Verified Partner
          </span>
          <h2>Are you a Local Micro-Entrepreneur or Artisan?</h2>
          <p>
            Join over 1,500+ verified cobblers, tailors, potters, appliance technicians, and carpenters receiving daily customer service leads across India. Zero hidden charges!
          </p>
          <button
            onClick={() => onOpenQuoteWizard?.()}
            className="btn-partner-cta"
          >
            <Store size={16} />
            <span>List Your Business FREE</span>
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
