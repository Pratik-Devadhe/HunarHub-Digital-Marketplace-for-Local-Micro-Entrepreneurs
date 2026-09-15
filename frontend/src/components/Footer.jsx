import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Heart } from "lucide-react";
import "./Footer.css";

export default function Footer({ onOpenAuth }) {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <div className="footer-top-grid">
          
          {/* Brand Column */}
          <div className="footer-brand-col">
            <div className="footer-brand-title">
              <div className="brand-icon-box">H</div>
              <span>HunarHub Marketplace</span>
            </div>
            <p className="footer-brand-desc">
              Empowering verified local micro-entrepreneurs, artisans, cobblers, tailors, potters, and repair specialists across India with direct customer access and zero commission lead matching.
            </p>
            <div className="footer-trust-badge-row">
              <ShieldCheck size={18} className="text-emerald" />
              <span>Direct Connect With Local Grassroots Artisans</span>
            </div>
          </div>

          {/* Quick Craft Services */}
          <div>
            <h4 className="footer-col-title">Popular Craft Services</h4>
            <ul className="footer-links-list">
              <li className="footer-link-item"><Link to="/">Cobbler & Leather Resoling</Link></li>
              <li className="footer-link-item"><Link to="/">Tailoring, Stitching & Alteration</Link></li>
              <li className="footer-link-item"><Link to="/">Potter (Kumhar) & Earthen Crafts</Link></li>
              <li className="footer-link-item"><Link to="/">Handmade Artisan & Handicrafts</Link></li>
              <li className="footer-link-item"><Link to="/">Small Vendors & Traditional Goods</Link></li>
              <li className="footer-link-item"><Link to="/">Traditional Woodwork & Carving</Link></li>
            </ul>
          </div>

          {/* Micro-Entrepreneurs */}
          <div>
            <h4 className="footer-col-title">Micro-Entrepreneurs</h4>
            <ul className="footer-links-list">
              <li className="footer-link-item">
                <button onClick={() => onOpenAuth?.({ isSignUp: true, role: "ENTREPRENEUR" })} className="btn-ghost">
                  List Your Business FREE
                </button>
              </li>
              <li className="footer-link-item"><Link to="/entrepreneur">Entrepreneur Portal</Link></li>
              <li className="footer-link-item"><a href="#verification">Verification Standards</a></li>
              <li className="footer-link-item"><a href="#benefits">Artisan Skill Badges</a></li>
              <li className="footer-link-item"><a href="#leads">Instant Lead Notifications</a></li>
            </ul>
          </div>

          {/* Help & Support */}
          <div>
            <h4 className="footer-col-title">Help & Trust</h4>
            <ul className="footer-links-list">
              <li className="footer-link-item"><a href="#how-it-works">How HunarHub Works</a></li>
              <li className="footer-link-item"><a href="#trust">Customer Protection & Trust</a></li>
              <li className="footer-link-item"><a href="#faqs">Frequently Asked Questions</a></li>
              <li className="footer-link-item"><a href="#support">Contact Support</a></li>
              <li className="footer-link-item"><Link to="/admin">System Admin Panel</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <div>
            © {new Date().getFullYear()} HunarHub Digital Marketplace Platform. Made with <Heart size={14} className="text-terracotta" style={{ display: "inline", verticalAlign: "middle" }} /> for India's Micro-Entrepreneurs.
          </div>
          <div className="footer-bottom-links">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#security">Security</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
