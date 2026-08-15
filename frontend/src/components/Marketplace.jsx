import React, { useState } from "react";
import { Star, MapPin, Clock, Tag, ShoppingBag, Calendar, CheckCircle2, Award, ChevronRight, ShieldCheck, Filter, RotateCcw, MessageSquareQuote } from "lucide-react";
import "./Marketplace.css";

export default function Marketplace({
  categories,
  entrepreneurs,
  services,
  products,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  onBookService,
  onAddToCart,
  loading
}) {
  const [activeTab, setActiveTab] = useState("services"); // "services" | "products" | "entrepreneurs"
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedMinRating, setSelectedMinRating] = useState("");
  const [sortBy, setSortBy] = useState("recommended");

  // Extract unique cities from entrepreneurs
  const availableCities = Array.from(
    new Set(entrepreneurs.map((e) => e.city).filter(Boolean))
  );

  // Map entrepreneur cities for service matching
  const epCityMap = {};
  entrepreneurs.forEach((e) => {
    if (e.id) epCityMap[e.id] = e.city;
  });

  // Filter and Sort Services
  const filteredServices = services
    .filter((s) => {
      const matchesCat = !selectedCategory || String(s.category_id) === String(selectedCategory);
      const sCity = epCityMap[s.entrepreneur_id] || s.city || "";
      const matchesCity = !selectedCity || sCity.toLowerCase() === selectedCity.toLowerCase();
      const rating = Number(s.average_rating || 4.9);
      const matchesRating = !selectedMinRating || rating >= Number(selectedMinRating);
      const matchesSearch = !searchQuery || 
        s.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.business_name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesCity && matchesRating && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "price_asc") return Number(a.price) - Number(b.price);
      if (sortBy === "price_desc") return Number(b.price) - Number(a.price);
      if (sortBy === "rating_desc") return Number(b.average_rating || 4.9) - Number(a.average_rating || 4.9);
      return 0;
    });

  // Filter and Sort Products
  const filteredProducts = products
    .filter((p) => {
      const matchesCat = !selectedCategory || String(p.category_id) === String(selectedCategory);
      const pCity = epCityMap[p.entrepreneur_id] || p.city || "";
      const matchesCity = !selectedCity || pCity.toLowerCase() === selectedCity.toLowerCase();
      const rating = Number(p.average_rating || 4.9);
      const matchesRating = !selectedMinRating || rating >= Number(selectedMinRating);
      const matchesSearch = !searchQuery || 
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.business_name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesCity && matchesRating && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "price_asc") return Number(a.price) - Number(b.price);
      if (sortBy === "price_desc") return Number(b.price) - Number(a.price);
      if (sortBy === "rating_desc") return Number(b.average_rating || 4.9) - Number(a.average_rating || 4.9);
      return 0;
    });

  // Filter and Sort Entrepreneurs
  const filteredEntrepreneurs = entrepreneurs
    .filter((e) => {
      const matchesCity = !selectedCity || e.city?.toLowerCase() === selectedCity.toLowerCase();
      const rating = Number(e.average_rating || 4.9);
      const matchesRating = !selectedMinRating || rating >= Number(selectedMinRating);
      const matchesSearch = !searchQuery || 
        e.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.city?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCity && matchesRating && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "rating_desc") return Number(b.average_rating || 4.9) - Number(a.average_rating || 4.9);
      return 0;
    });

  const hasActiveFilters = Boolean(selectedCategory || selectedCity || selectedMinRating || sortBy !== "recommended" || searchQuery);

  const resetAllFilters = () => {
    setSelectedCategory(null);
    setSelectedCity("");
    setSelectedMinRating("");
    setSortBy("recommended");
  };

  return (
    <div className="marketplace-container">

      {/* Hero Banner Section */}
      <div className="hero-banner">
        <div className="hero-glow-orb" />
        <div className="hero-content">
          <div className="hero-badge">
            <Award className="hero-badge-icon" />
            <span>Verified Local Micro-Entrepreneurs</span>
          </div>
          <h1 className="hero-title">
            Discover & Book <span className="hero-title-highlight">Local Craft Experts</span>
          </h1>
          <p className="hero-subtitle">
            Every Skill Has a Story <br /> Every Skill Deserves an Opportunity
          </p>
          <div className="hero-actions">
            <button onClick={() => setActiveTab("services")} className="btn-primary">
              <span>Explore Services</span>
              <ChevronRight className="btn-icon-right" />
            </button>
            <button onClick={() => setActiveTab("products")} className="btn-secondary">
              <span>Browse Products</span>
            </button>
          </div>
        </div>
      </div>

      
      <div className="glass-panel compact-filter-bar">
        <div className="filter-bar-header">
          <div className="filter-bar-title">
            <Filter className="category-icon" />
            <span>Refine Marketplace Search</span>
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
            <label className="filter-label">Craft Category</label>
            <select
              value={selectedCategory || ""}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="filter-select-control"
            >
              <option value="">🌟 All Categories (All Services Open)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location Dropdown */}
          <div className="filter-select-group">
            <label className="filter-label">City / Location</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="filter-select-control"
            >
              <option value="">📍 All Cities & Regions</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  📍 {city}
                </option>
              ))}
              <option value="Mumbai">📍 Mumbai</option>
              <option value="Pune">📍 Pune</option>
              <option value="Delhi">📍 Delhi</option>
              <option value="Bengaluru">📍 Bengaluru</option>
              <option value="Kolkata">📍 Kolkata</option>
              <option value="Jaipur">📍 Jaipur</option>
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
              <option value="">⭐ All Ratings</option>
              <option value="4.5">⭐ 4.5 & Above (Top Artisans)</option>
              <option value="4.0">⭐ 4.0 & Above</option>
              <option value="3.5">⭐ 3.5 & Above</option>
            </select>
          </div>

          {/* Price & Rating Sort Dropdown */}
          <div className="filter-select-group">
            <label className="filter-label">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select-control"
            >
              <option value="recommended">Featured / Recommended</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating_desc">Highest Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Tabs Header */}
      <div className="marketplace-tabs-bar">
        <div className="tab-selector-group">
          <button
            onClick={() => setActiveTab("services")}
            className={`tab-btn ${activeTab === "services" ? "active" : ""}`}
          >
            🛠️ Craft Services ({filteredServices.length})
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`tab-btn ${activeTab === "products" ? "active" : ""}`}
          >
            🛍️ Handmade Products ({filteredProducts.length})
          </button>
          <button
            onClick={() => setActiveTab("entrepreneurs")}
            className={`tab-btn ${activeTab === "entrepreneurs" ? "active" : ""}`}
          >
            👨‍🎨 Verified Artisans ({filteredEntrepreneurs.length})
          </button>
        </div>

        <span className="results-count-badge">
          Showing {activeTab === "services" ? filteredServices.length : activeTab === "products" ? filteredProducts.length : filteredEntrepreneurs.length} available items
        </span>
      </div>

      {/* Services Grid View */}
      {activeTab === "services" && (
        <div className="catalog-grid-4">
          {filteredServices.map((svc) => (
            <div key={svc.id} className="glass-panel catalog-card">
              <div className="catalog-card-body">
                <div className="card-top-header">
                  <span className="badge badge-accepted">
                    {svc.category_name || "Craft Service"}
                  </span>
                  <div className="rating-pill">
                    <Star className="rating-star-icon" />
                    <span>{Number(svc.average_rating || 4.9).toFixed(1)}</span>
                  </div>
                </div>

                <h3 className="card-title">
                  {svc.title}
                </h3>
                
                <p className="card-description">
                  {svc.description}
                </p>

                <div className="card-meta-row">
                  <span className="meta-item">
                    <MapPin className="meta-icon text-amber" />
                    <span className="meta-business-name">{svc.business_name || "Local Artisan"}</span>
                  </span>
                  <span className="meta-item">
                    <Clock className="meta-icon" />
                    <span>~{svc.estimated_duration || 45}m</span>
                  </span>
                </div>
              </div>

              <div className="card-bottom-footer">
                <div>
                  <span className="price-box-title">Est. Price</span>
                  <span className="price-box-amount">₹{svc.price}</span>
                </div>
                <div className="card-actions-group">
                  <button
                    onClick={() => onBookService(svc, "quote")}
                    className="btn-secondary btn-quote-action"
                    title="Get free quote from artisan"
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
              <p>No craft services matched your search filters. All services remain open when filters are reset.</p>
              <button onClick={resetAllFilters} className="btn-secondary">Clear Filters & Show All</button>
            </div>
          )}
        </div>
      )}

      {/* Products Grid View */}
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

      {/* Entrepreneurs Grid View */}
      {activeTab === "entrepreneurs" && (
        <div className="catalog-grid-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {filteredEntrepreneurs.map((ep) => (
            <div key={ep.id} className="glass-panel catalog-card" style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <img
                src={ep.profile_image || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300"}
                alt={ep.business_name}
                className="artisan-card-img"
              />
              <div className="artisan-info-box">
                <div className="artisan-header-row">
                  <div>
                    <h3 className="card-title">
                      {ep.business_name}
                    </h3>
                    <p className="artisan-subtitle">By {ep.full_name}</p>
                  </div>
                  <div className="rating-pill">
                    <Star className="rating-star-icon" />
                    <span>{Number(ep.average_rating || 4.9).toFixed(1)}</span>
                  </div>
                </div>

                <p className="card-description">
                  {ep.bio}
                </p>

                <div className="card-meta-row">
                  <span className="meta-item bold">
                    <MapPin className="meta-icon text-amber" />
                    <span>{ep.city || "Mumbai"}, {ep.state || "Maharashtra"}</span>
                  </span>
                  <span className="meta-item bold">
                    <ShieldCheck className="meta-icon text-emerald" />
                    <span>{ep.experience_years || 15}+ Yrs Exp</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
          {filteredEntrepreneurs.length === 0 && (
            <div className="empty-search-box">
              <p>No micro-entrepreneurs found with selected criteria.</p>
              <button onClick={resetAllFilters} className="btn-secondary">Clear Filters & Show All</button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

