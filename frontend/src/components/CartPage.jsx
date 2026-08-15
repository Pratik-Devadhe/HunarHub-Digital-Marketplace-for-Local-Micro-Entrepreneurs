import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Trash2, Plus, Minus, MapPin, ShieldCheck, ArrowRight, ArrowLeft, Store, Sparkles } from "lucide-react";
import "./CartPage.css";

export default function CartPage({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  showToast
}) {
  const navigate = useNavigate();
  const [shippingAddress, setShippingAddress] = useState("Flat 402, Sunshine Apartments, Bandra West, Mumbai");
  const [loading, setLoading] = useState(false);

  const subtotal = cartItems.reduce((acc, item) => acc + Number(item.price) * item.quantity, 0);
  const deliveryFee = 0; // Free delivery offer
  const tax = subtotal * 0.05; // 5% GST included/calculated
  const grandTotal = subtotal + deliveryFee;

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      showToast("info", "Your cart is empty");
      return;
    }
    if (!shippingAddress.trim()) {
      showToast("error", "Please provide a valid delivery address");
      return;
    }

    setLoading(true);
    try {
      await onCheckout(shippingAddress);
      showToast("success", "Order placed successfully! Track order in your Customer Dashboard.");
      navigate("/activity");
    } catch (err) {
      showToast("error", err.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cart-page-container animate-fade-in">
      
      {/* Header & Breadcrumbs */}
      <div className="glass-panel cart-header-card">
        <div className="cart-breadcrumb">
          <span className="cart-breadcrumb-link" onClick={() => navigate("/")}>
            Explore Marketplace
          </span>
          <span>/</span>
          <span>Shopping Cart</span>
        </div>

        <div className="cart-title-row">
          <h1 className="cart-main-title">
            <ShoppingBag className="cart-title-icon" />
            <span>Your Handcrafted Cart</span>
            <span className="cart-count-badge-lg">
              {cartItems.reduce((acc, item) => acc + item.quantity, 0)} {cartItems.length === 1 ? "Item" : "Items"}
            </span>
          </h1>

          <button onClick={() => navigate("/")} className="btn-secondary">
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span>Continue Shopping</span>
          </button>
        </div>

        <p className="cart-header-subtitle">
          Support verified local micro-entrepreneurs and artisans with 100% direct fulfillment.
        </p>
      </div>

      {cartItems.length > 0 ? (
        <div className="cart-layout-grid">
          
          {/* Left Column: Cart Items List */}
          <div className="cart-items-section">
            {cartItems.map((item) => (
              <div key={item.id} className="glass-panel cart-item-card-full">
                <img
                  src={item.primary_image || item.image_url || "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500"}
                  alt={item.name}
                  className="cart-item-thumb"
                />

                <div className="cart-item-details-box">
                  <div className="cart-item-artisan-tag">
                    <Store className="w-3.5 h-3.5" />
                    <span>{item.business_name || "Local Artisan"}</span>
                  </div>
                  <h3 className="cart-item-title-text">{item.name}</h3>
                  <p className="cart-item-description-text">{item.description}</p>
                  <span className="cart-item-unit-price">Unit Price: ₹{Number(item.price).toFixed(2)}</span>
                </div>

                <div className="cart-item-actions-box">
                  <span className="cart-item-subtotal-price">
                    ₹{(Number(item.price) * item.quantity).toFixed(2)}
                  </span>

                  <div className="cart-item-qty-row">
                    <div className="cart-qty-counter">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="cart-qty-btn"
                        title="Decrease Quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="cart-qty-val">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="cart-qty-btn"
                        title="Increase Quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onRemoveItem(item.id);
                        showToast("info", `Removed "${item.name}" from cart`);
                      }}
                      className="cart-remove-btn"
                      title="Cancel / Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Bulk Cart Action Buttons */}
            <div className="cart-bulk-actions-row">
              <button
                type="button"
                onClick={() => {
                  if (onClearCart) onClearCart();
                  showToast("info", "Cart cleared successfully");
                }}
                className="btn-clear-cart"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear Entire Cart</span>
              </button>
            </div>
          </div>

          {/* Right Column: Order Summary & Checkout Card */}
          <div className="glass-panel cart-summary-card">
            <h3 className="cart-summary-title">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Order Summary</span>
            </h3>

            <div className="cart-summary-rows-group">
              <div className="summary-data-row">
                <span>Items Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-data-row">
                <span>Artisan Delivery Fee</span>
                <span className="text-free">FREE</span>
              </div>
              <div className="summary-data-row">
                <span>Estimated Taxes (Included)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>

              <div className="summary-data-row total-row">
                <span>Total Amount</span>
                <span className="total-amount">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Delivery Address Input */}
            <form onSubmit={handleCheckoutSubmit} className="address-input-group">
              <label className="address-label">Delivery Shipping Address</label>
              <div className="address-input-box">
                <MapPin className="address-icon-left" />
                <input
                  type="text"
                  required
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Enter complete house no, street, city & pincode"
                  className="address-field-control"
                />
              </div>

              <div className="payment-guarantee-box mt-2">
                <ShieldCheck className="guarantee-icon" />
                <span>Encrypted 256-bit Checkout. Direct payment to micro-entrepreneur.</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary btn-checkout-place-order"
              >
                <span>{loading ? "Placing Order..." : "Confirm & Place Order"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      ) : (
        /* Empty Cart State */
        <div className="glass-panel cart-empty-full-card">
          <ShoppingBag className="cart-empty-big-icon" />
          <h2 className="cart-empty-title">Your Cart is Currently Empty</h2>
          <p className="cart-empty-subtitle">
            You haven't added any handcrafted products yet. Explore our artisan catalog to support local craft experts!
          </p>
          <button onClick={() => navigate("/")} className="btn-primary">
            <Sparkles className="w-4 h-4 mr-1" />
            <span>Explore Artisan Marketplace</span>
          </button>
        </div>
      )}

    </div>
  );
}
