import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Marketplace from "./components/Marketplace";
import CustomerPortal from "./components/CustomerPortal";
import EntrepreneurPortal from "./components/EntrepreneurPortal";
import AdminPortal from "./components/AdminPortal";
import CartPage from "./components/CartPage";
import ServiceBookingModal from "./components/ServiceBookingModal";
import CartDrawer from "./components/CartDrawer";
import AuthModal from "./components/AuthModal";
import ReviewModal from "./components/ReviewModal";
import Toast from "./components/Toast";
import { api } from "./services/api";
import { ShieldAlert, LogIn } from "lucide-react";
import "./App.css";

export default function App() {
  const navigate = useNavigate();

  // Navigation & User State
  const [user, setUser] = useState(null);

  // Data Catalog State
  const [categories, setCategories] = useState([]);
  const [entrepreneurs, setEntrepreneurs] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Cart & Modal State
  const [cartItems, setCartItems] = useState([]);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [bookingService, setBookingService] = useState(null);
  const [bookingMode, setBookingMode] = useState("book"); // "book" | "quote"
  const [reviewItem, setReviewItem] = useState(null);

  // Toast Notification State
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Initial Fetch & Auto Login Restore
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [catRes, epRes, svcRes, prodRes] = await Promise.all([
        api.getCategories(),
        api.getEntrepreneurs(),
        api.getServices(),
        api.getProducts()
      ]);

      setCategories(catRes.categories || []);
      setEntrepreneurs(epRes.entrepreneurs || []);
      setServices(svcRes.services || []);
      setProducts(prodRes.products || []);

      // Check if token exists in localStorage
      if (localStorage.getItem("token")) {
        const meRes = await api.getMe().catch(() => null);
        if (meRes && meRes.user) {
          setUser(meRes.user);
        }
      }
    } catch (err) {
      console.error("Initial data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Auth Handlers
  const handleLogin = async (email, password) => {
    const data = await api.login(email, password);
    if (data.token) {
      localStorage.setItem("token", data.token);
      setUser(data.user);
      if (data.user.role === "ENTREPRENEUR") navigate("/entrepreneur");
      else if (data.user.role === "ADMIN") navigate("/admin");
      else navigate("/activity");
    }
    return data;
  };

  const handleRegister = async (userData) => {
    const data = await api.register(userData);
    if (data.token) {
      localStorage.setItem("token", data.token);
      setUser(data.user);
      if (data.user.role === "ENTREPRENEUR") navigate("/entrepreneur");
      else navigate("/");
    }
    return data;
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/");
    showToast("info", "Signed out successfully");
  };

  // Cart Handlers
  const handleAddToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    showToast("success", `Added "${product.name}" to cart`);
  };

  const handleUpdateQuantity = (id, quantity) => {
    if (quantity <= 0) {
      handleRemoveCartItem(id);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const handleRemoveCartItem = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleCheckout = async (shippingAddress) => {
    if (!user) {
      setIsAuthOpen(true);
      throw new Error("Please sign in to place an order");
    }

    const items = cartItems.map((item) => ({
      product_id: item.id,
      quantity: item.quantity
    }));

    await api.createOrder({
      items,
      shipping_address: shippingAddress
    });

    setCartItems([]);
    loadInitialData();
  };

  // Booking & Review Submit
  const handleBookService = (service, mode = "book") => {
    if (!user) {
      setIsAuthOpen(true);
      showToast("info", mode === "quote" ? "Please sign in to request a free quote" : "Please sign in to book a service");
      return;
    }
    setBookingMode(mode);
    setBookingService(service);
  };

  const handleSubmitBooking = async (bookingData) => {
    await api.createServiceRequest(bookingData);
    loadInitialData();
  };

  const handleSubmitReview = async (reviewData) => {
    await api.createReview(reviewData);
    loadInitialData();
  };

  return (
    <div className="app-shell">
      
      {/* Clean Header */}
      <Navbar
        user={user}
        cartCount={cartItems.reduce((acc, i) => acc + i.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main View Area with React Router */}
      <main className="app-main">
        <Routes>
          {/* Public Marketplace Route */}
          <Route
            path="/"
            element={
              <Marketplace
                categories={categories}
                entrepreneurs={entrepreneurs}
                services={services}
                products={products}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                searchQuery={searchQuery}
                onBookService={handleBookService}
                onAddToCart={handleAddToCart}
                loading={loading}
              />
            }
          />
          <Route
            path="/marketplace"
            element={<Navigate to="/" replace />}
          />

          {/* Dedicated Full Cart Page Route */}
          <Route
            path="/cart"
            element={
              <CartPage
                cartItems={cartItems}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveCartItem}
                onClearCart={handleClearCart}
                onCheckout={handleCheckout}
                showToast={showToast}
              />
            }
          />

          {/* Customer Activity Portal Route */}
          <Route
            path="/activity"
            element={
              user ? (
                <CustomerPortal
                  onOpenReview={(target) => setReviewItem(target)}
                  showToast={showToast}
                />
              ) : (
                <div className="empty-search-box" style={{ margin: "4rem auto", maxWidth: "500px" }}>
                  <ShieldAlert style={{ width: "2.5rem", height: "2.5rem", color: "#F59E0B" }} />
                  <h3>Authentication Required</h3>
                  <p>Please sign in to access your activity history and bookings.</p>
                  <button onClick={() => setIsAuthOpen(true)} className="btn-primary">
                    <LogIn style={{ width: "1rem", height: "1rem", marginRight: "0.5rem" }} />
                    <span>Sign In to Continue</span>
                  </button>
                </div>
              )
            }
          />
          <Route
            path="/customer"
            element={<Navigate to="/activity" replace />}
          />

          {/* Entrepreneur Hub Portal Route */}
          <Route
            path="/entrepreneur"
            element={
              user && (user.role === "ENTREPRENEUR" || user.role === "ADMIN") ? (
                <EntrepreneurPortal
                  user={user}
                  showToast={showToast}
                />
              ) : (
                <div className="empty-search-box" style={{ margin: "4rem auto", maxWidth: "500px" }}>
                  <ShieldAlert style={{ width: "2.5rem", height: "2.5rem", color: "#F59E0B" }} />
                  <h3>Entrepreneur Access Required</h3>
                  <p>You need to be signed in as a registered Micro-Entrepreneur to access the Entrepreneur Hub.</p>
                  <button onClick={() => setIsAuthOpen(true)} className="btn-primary">
                    <LogIn style={{ width: "1rem", height: "1rem", marginRight: "0.5rem" }} />
                    <span>Sign In as Entrepreneur</span>
                  </button>
                </div>
              )
            }
          />

          {/* Admin Portal Route */}
          <Route
            path="/admin"
            element={
              user && user.role === "ADMIN" ? (
                <AdminPortal
                  showToast={showToast}
                />
              ) : (
                <div className="empty-search-box" style={{ margin: "4rem auto", maxWidth: "500px" }}>
                  <ShieldAlert style={{ width: "2.5rem", height: "2.5rem", color: "#FB7185" }} />
                  <h3>Admin Authorization Required</h3>
                  <p>This portal is restricted to HunarHub System Administrators only.</p>
                  <button onClick={() => setIsAuthOpen(true)} className="btn-primary">
                    <LogIn style={{ width: "1rem", height: "1rem", marginRight: "0.5rem" }} />
                    <span>Sign In as Admin</span>
                  </button>
                </div>
              )
            }
          />

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="app-footer-inner">
          <div className="app-footer-brand">
            <span className="app-footer-brand-name">HunarHub Marketplace</span>
            <span>— Empowering Local Artisans & Micro-Entrepreneurs</span>
          </div>
          <p>© 2026 HunarHub Platform. Digitalizing local commerce.</p>
        </div>
      </footer>

      {/* Modals & Overlay Drawers */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
        showToast={showToast}
      />

      <ServiceBookingModal
        service={bookingService}
        mode={bookingMode}
        isOpen={!!bookingService}
        onClose={() => setBookingService(null)}
        onSubmitBooking={handleSubmitBooking}
        showToast={showToast}
      />

      <ReviewModal
        isOpen={!!reviewItem}
        targetItem={reviewItem}
        onClose={() => setReviewItem(null)}
        onSubmitReview={handleSubmitReview}
        showToast={showToast}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={handleCheckout}
        showToast={showToast}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />

    </div>
  );
}
