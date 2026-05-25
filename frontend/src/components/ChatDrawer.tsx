"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { apiFetch } from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "Which muscle groups should I train today based on recovery?",
  "Analyze my recent body metric progression.",
  "Give me a quick workout plan for my most recovered muscles.",
];

export default function ChatDrawer() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bodyRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages or loading state changes
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, loading]);

  if (!user) return null; // Only show for logged in users

  async function handleSend(text: string) {
    if (!text.trim() || loading) return;

    const token = typeof window !== "undefined" ? window.localStorage.getItem("nextyra-session-token") : null;
    if (!token) {
      setError("User session token not found. Please re-authenticate.");
      return;
    }

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch<{ reply: string }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ token, message: text }),
      });

      setMessages((prev) => [...prev, { role: "assistant", content: response.reply }]);
    } catch (err: any) {
      console.error("PulsePilot chat error:", err);
      setError(err.message || "Could not connect to PulsePilot. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSend(input);
  }

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          type="button"
          className="chat-drawer-trigger"
          onClick={() => setIsOpen(true)}
          aria-label="Open PulsePilot AI Chat"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Ask PulsePilot</span>
        </button>
      )}

      {/* Chat Drawer container */}
      {isOpen && (
        <div className="chat-drawer-container">
          {/* Header */}
          <div className="chat-drawer-header">
            <div className="chat-drawer-header-title">
              <span className="chat-drawer-logo-badge">AGENT</span>
              <span className="chat-drawer-header-name">PulsePilot</span>
            </div>
            <button
              type="button"
              className="chat-drawer-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close Chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Messages Body */}
          <div className="chat-drawer-body" ref={bodyRef}>
            {messages.length === 0 ? (
              <div className="chat-drawer-welcome-state">
                <div className="chat-drawer-welcome-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                    <circle cx="12" cy="5" r="2"></circle>
                    <path d="M12 7v4"></path>
                    <line x1="8" y1="16" x2="8.01" y2="16"></line>
                    <line x1="16" y1="16" x2="16.01" y2="16"></line>
                  </svg>
                </div>
                <h3 className="chat-drawer-welcome-title">PulsePilot AI Coach</h3>
                <p className="chat-drawer-welcome-text">
                  Hi {user.name}! I analyze your recovery scores, body metrics, and workout logs to give you highly customized recommendations. What would you like to build today?
                </p>

                <div className="chat-drawer-suggestions">
                  {SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      className="chat-drawer-suggestion-chip"
                      onClick={() => handleSend(sug)}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`chat-drawer-message ${
                    msg.role === "user" ? "chat-drawer-message-user" : "chat-drawer-message-agent"
                  }`}
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {msg.content}
                </div>
              ))
            )}

            {/* Loading Indicator */}
            {loading && (
              <div className="typing-indicator-container">
                <div className="typing-dots">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                  Analyzing metrics...
                </span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "var(--danger)",
                  background: "rgba(220, 38, 38, 0.08)",
                  border: "1px solid var(--danger)",
                  borderRadius: "8px",
                  padding: "0.6rem 0.8rem",
                  marginBlock: "0.5rem",
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Form Input Area */}
          <div className="chat-drawer-input-area">
            <form onSubmit={handleFormSubmit} className="chat-drawer-form">
              <input
                type="text"
                className="chat-drawer-input"
                placeholder="Ask PulsePilot about your recovery..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                className="chat-drawer-send-btn"
                disabled={loading || !input.trim()}
                aria-label="Send Message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
