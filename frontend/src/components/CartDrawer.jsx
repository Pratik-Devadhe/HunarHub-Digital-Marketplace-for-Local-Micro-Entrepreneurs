import React, { useState } from "react";
import { X, Trash2, Plus, Minus, ShoppingBag, MapPin, ArrowRight } from "lucide-react";

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  showToast
}) {
  if (!isOpen) return null;

  const [shippingAddress, setShippingAddress] = useState("Flat 402, Sunshine Apartments, Bandra West, Mumbai");
  const [loading, setLoading] = useState(false);

  const subtotal = cartItems.reduce((acc, item) => acc + Number(item.price) * item.quantity, 0);

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    if (!shippingAddress.trim()) {
      showToast("error", "Shipping address is required");
      return;
    }

    setLoading(true);
    try {
      await onCheckout(shippingAddress);
      showToast("success", "Order placed successfully!");
      onClose();
    } catch (err) {
      showToast("error", err.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cart-drawer-overlay animate-fade-in">
      <div className="cart-drawer-panel animate-slide-right">
        
        {/* Header */}
        <div className="cart-drawer-header">
          <div className="cart-header-title-wrap">
            <ShoppingBag className="cart-header-icon" />
            <h2 className="cart-header-title">Your Shopping Cart</h2>
            <span className="cart-count-pill">{cartItems.length}</span>
          </div>
          <button onClick={onClose} className="cart-close-btn" aria-label="Close cart">
            <X className="cart-close-icon" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="cart-drawer-body">
          {cartItems.map((item) => (
            <div key={item.id} className="cart-item-card">
              <img
                src={item.primary_image || item.image_url || "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500"}
                alt={item.name}
                className="cart-item-img"
              />
              <div className="cart-item-info">
                <h4 className="cart-item-name">{item.name}</h4>
                <p className="cart-item-price">₹{item.price}</p>
                <div className="cart-item-controls">
                  <div className="qty-counter-box">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="qty-step-btn"
                    >
                      <Minus className="qty-step-icon" />
                    </button>
                    <span className="qty-number">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="qty-step-btn"
                    >
                      <Plus className="qty-step-icon" />
                    </button>
                  </div>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="remove-item-btn"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="remove-item-icon" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {cartItems.length === 0 && (
            <div className="cart-empty-state">
              <ShoppingBag className="cart-empty-icon" />
              <p>Your cart is currently empty.</p>
              <button onClick={onClose} className="btn-secondary cart-empty-btn">Browse Products</button>
            </div>
          )}
        </div>

        {/* Footer Checkout */}
        {cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            <div>
              <label className="field-label">Shipping Address</label>
              <div className="input-field-wrap cart-address-wrap">
                <MapPin className="field-icon" />
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Enter full shipping address"
                  className="input-with-icon cart-address-input"
                />
              </div>
            </div>

            <div className="checkout-summary">
              <div className="checkout-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="checkout-row">
                <span>Delivery</span>
                <span className="checkout-free">FREE</span>
              </div>
              <div className="checkout-row total-row">
                <span>Total Amount</span>
                <span className="checkout-total">₹{subtotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="btn-primary cart-checkout-btn"
            >
              <span>{loading ? "Processing Order..." : "Place Order & Pay"}</span>
              <ArrowRight className="cart-checkout-icon" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
