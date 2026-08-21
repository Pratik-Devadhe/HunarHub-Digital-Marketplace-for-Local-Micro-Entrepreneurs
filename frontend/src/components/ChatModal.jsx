import React, { useState, useEffect, useRef } from "react";
import { X, Send, CircleCheck, Image, Shield } from "lucide-react";
import { api } from "../services/api";
import "./ChatModal.css";

export default function ChatModal({ partner, serviceRequestId, onClose, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const partnerUserId = partner?.user_id || partner?.id;

  const fetchMessages = () => {
    if (!partnerUserId) return;
    api.getMessages({ with_user_id: partnerUserId, service_request_id: serviceRequestId })
      .then((res) => {
        if (res && res.messages) {
          setMessages(res.messages);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000); // Polling every 4s
    return () => clearInterval(interval);
  }, [partnerUserId, serviceRequestId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !partnerUserId) return;

    const newText = inputText.trim();
    setInputText("");

    // Optimistic message UI
    const tempMsg = {
      id: "temp_" + Date.now(),
      sender_id: currentUser?.id || 999,
      receiver_id: partnerUserId,
      message_text: newText,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempMsg]);

    api.sendMessage({
      receiver_id: partnerUserId,
      service_request_id: serviceRequestId || null,
      message_text: newText
    })
      .then(() => fetchMessages())
      .catch((err) => console.error(err));
  };

  if (!partner) return null;

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="chat-modal-header">
          <div className="chat-partner-info">
            <img
              src={partner.profile_image || partner.artisan_image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
              alt={partner.business_name || partner.full_name}
              className="chat-partner-avatar"
            />
            <div>
              <div className="chat-partner-name">{partner.business_name || partner.full_name || partner.partner_name}</div>
              <div className="chat-partner-sub">
                <CircleCheck size={12} color="#34d399" /> Active & Verified Direct Chat
              </div>
            </div>
          </div>
          <button className="artisan-modal-close" onClick={onClose} aria-label="Close Chat">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="chat-messages-area">
          {loading ? (
            <p style={{ textAlign: "center", color: "#64748b" }}>Loading messages...</p>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: "center", color: "#64748b", margin: "auto" }}>
              <p style={{ fontWeight: 600, color: "#1e293b" }}>Start Direct Conversation</p>
              <p style={{ fontSize: "0.88rem" }}>Ask questions about custom tailoring, leather repair, pottery, quotes, or scheduling.</p>
            </div>
          ) : (
            messages.map((m) => {
              const isSentByMe = currentUser ? m.sender_id === currentUser.id : true;
              return (
                <div key={m.id} className={`chat-bubble ${isSentByMe ? "sent" : "received"}`}>
                  <div>{m.message_text}</div>
                  <div className="chat-time">
                    {new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form className="chat-input-area" onSubmit={handleSend}>
          <input
            type="text"
            className="chat-input"
            placeholder="Type your message or custom requirement..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button type="submit" className="chat-send-btn" aria-label="Send Message">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
