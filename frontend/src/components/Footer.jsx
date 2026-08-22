import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Heart, MapPin, Phone, Mail, Award, Sparkles } from "lucide-react";
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
              <span>100% Identity & Skill Verified Local Experts</span>
            </div>
          </div>

          {/* Quick Craft Services */}
          <div>
            <h4 className="footer-col-title">Popular Craft Services</h4>
            <ul className="footer-links-list">
              <li className="footer-link-item"><Link to="/">Leather & Boot Resoling</Link></li>
              <li className="footer-link-item"><Link to="/">Designer Blouse & Alteration</Link></li>
              <li className="footer-link-item"><Link to="/">Earthen Clay Pottery & Utensils</Link></li>
              <li className="footer-link-item"><Link to="/">AC & Home Appliance Repair</Link></li>
              <li className="footer-link-item"><Link to="/">Local Household Shifting</Link></li>
              <li className="footer-link-item"><Link to="/">Wood Carpentry & Furniture</Link></li>
            </ul>
          </div>

          {/* Micro-Entrepreneurs */}
          <div>
            <h4 className="footer-col-title">Micro-Entrepreneurs</h4>
            <ul className="footer-links-list">
              <li className="footer-link-item">
                <button onClick={onOpenAuth} className="btn-ghost">
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
