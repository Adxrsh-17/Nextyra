"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

const MEMBERSHIP_PLANS: Record<string, { name: string; price: string; rawPrice: number; blurb: string; features: string[] }> = {
  lift_start: {
    name: "Lift Start",
    price: "$9/mo",
    rawPrice: 9,
    blurb: "For solo lifters who want smart logging and daily motivation.",
    features: ["Workout logging", "History and XP", "Daily training brief"],
  },
  momentum_pro: {
    name: "Momentum Pro",
    price: "$19/mo",
    rawPrice: 19,
    blurb: "For serious gym users who want PulsePilot adapting the workout to how they actually feel.",
    features: ["PulsePilot agent", "Recovery dashboard", "Adaptive day plans"],
  },
  coach_console: {
    name: "Coach Console",
    price: "$49/mo",
    rawPrice: 49,
    blurb: "For trainers managing clients with structure, accountability, and shared plans.",
    features: ["Multi-athlete support", "Client progress view", "Program oversight"],
  },
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const planId = searchParams.get("plan") || "momentum_pro";
  const plan = MEMBERSHIP_PLANS[planId] || MEMBERSHIP_PLANS.momentum_pro;

  // Active payment method tab: 'upi' | 'card' | 'netbanking'
  const [activeTab, setActiveTab] = useState<"upi" | "card" | "netbanking">("upi");

  // Form states
  const [upiId, setUpiId] = useState("");
  const [upiError, setUpiError] = useState("");

  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardError, setCardError] = useState("");
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [selectedBank, setSelectedBank] = useState("");
  const [netBankingError, setNetBankingError] = useState("");

  // Simulated gateway processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);

  // QR Code expiration timer (300 seconds = 5:00)
  const [qrTimer, setQrTimer] = useState(300);
  const [qrExpired, setQrExpired] = useState(false);

  useEffect(() => {
    if (activeTab === "upi") {
      const interval = setInterval(() => {
        setQrTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setQrExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Card details detection
  const getCardType = (number: string) => {
    const cleaned = number.replace(/\s+/g, "");
    if (cleaned.startsWith("4")) return "Visa";
    if (/^5[1-5]/.test(cleaned)) return "Mastercard";
    if (/^6[0-9]/.test(cleaned)) return "RuPay";
    if (/^3[47]/.test(cleaned)) return "Amex";
    return "Card";
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    const chunks = value.match(/.{1,4}/g);
    const formatted = chunks ? chunks.join(" ").slice(0, 19) : "";
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 2) {
      setCardExpiry(value);
    } else {
      setCardExpiry(`${value.slice(0, 2)}/${value.slice(2, 4)}`);
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setCardCvv(value);
  };

  // Trigger simulated multi-stage payment loader
  const triggerPayment = () => {
    // Basic validation
    if (activeTab === "upi") {
      const upiRegex = /^[\w.-]+@[\w.-]+$/;
      if (!upiId.trim() || !upiRegex.test(upiId)) {
        setUpiError("Please enter a valid UPI ID (e.g., name@okaxis)");
        return;
      }
      setUpiError("");
    } else if (activeTab === "card") {
      if (cardNumber.replace(/\s/g, "").length < 15) {
        setCardError("Please enter a valid card number");
        return;
      }
      if (!cardHolder.trim()) {
        setCardError("Please enter the cardholder name");
        return;
      }
      if (cardExpiry.length < 5) {
        setCardError("Expiry date must be MM/YY");
        return;
      }
      if (cardCvv.length < 3) {
        setCardError("CVV is required");
        return;
      }
      setCardError("");
    } else if (activeTab === "netbanking") {
      if (!selectedBank) {
        setNetBankingError("Please select a bank to continue");
        return;
      }
      setNetBankingError("");
    }

    setIsProcessing(true);
    setProcessingStep(0);
  };

  // Run the multi-step handshake animation
  useEffect(() => {
    if (isProcessing) {
      const steps = [
        "Verifying payment details...",
        "Initiating secure handshake...",
        "Waiting for issuer bank authorization...",
        "Payment authorized! Completing subscription...",
      ];

      const interval = setInterval(() => {
        setProcessingStep((prev) => {
          if (prev >= steps.length - 1) {
            clearInterval(interval);
            // Complete payment and redirect to success
            setTimeout(() => {
              router.push(`/payment/success?session_id=mock_chk_${Date.now()}&plan=${planId}`);
            }, 600);
            return prev;
          }
          return prev + 1;
        });
      }, 700);

      return () => clearInterval(interval);
    }
  }, [isProcessing, planId, router]);

  // Banks data
  const popularBanks = [
    { id: "sbi", name: "State Bank of India", color: "#00a2e8", label: "SBI" },
    { id: "hdfc", name: "HDFC Bank", color: "#1c3f94", label: "HDFC" },
    { id: "icici", name: "ICICI Bank", color: "#f37021", label: "ICICI" },
    { id: "axis", name: "Axis Bank", color: "#861f41", label: "Axis" },
    { id: "kotak", name: "Kotak Mahindra", color: "#e61a22", label: "Kotak" },
  ];

  const otherBanks = [
    "Bank of Baroda",
    "Canara Bank",
    "Union Bank of India",
    "Punjab National Bank",
    "IndusInd Bank",
    "Yes Bank",
    "IDFC FIRST Bank",
    "Federal Bank",
  ];

  return (
    <div className="page" style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1rem" }}>
      {/* Handshake Overlay Screen */}
      {isProcessing && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(9, 9, 9, 0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "2rem",
        }}>
          <div style={{
            position: "relative",
            width: "120px",
            height: "120px",
            marginBottom: "2.5rem",
          }}>
            <div className="spinner" style={{
              width: "120px",
              height: "120px",
              borderWidth: "4px",
              borderTopColor: "var(--accent)",
              borderRightColor: "transparent",
              borderBottomColor: "var(--accent-warm)",
              borderLeftColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite",
            }}></div>
            <div style={{
              position: "absolute",
              inset: "15px",
              background: "var(--bg-panel)",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              border: "1px solid var(--border)",
              boxShadow: "inset 0 0 20px rgba(208, 162, 74, 0.15)",
            }}>
              <span style={{ fontSize: "2rem" }}>🔒</span>
            </div>
          </div>

          <h2 className="section-heading" style={{ color: "var(--text)", fontSize: "1.6rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Processing Payment
          </h2>
          <p className="helper-text" style={{ fontSize: "0.95rem", marginBottom: "2rem" }}>
            Please do not refresh the page or press the back button.
          </p>

          <div style={{
            maxWidth: "400px",
            width: "100%",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}>
            {[
              "Verifying payment details...",
              "Initiating secure handshake...",
              "Waiting for issuer bank authorization...",
              "Payment authorized! Completing subscription...",
            ].map((stepText, idx) => (
              <div key={idx} style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                opacity: processingStep >= idx ? 1 : 0.3,
                transition: "opacity 300ms ease",
              }}>
                <div style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border: `2px solid ${processingStep > idx ? "var(--success)" : processingStep === idx ? "var(--accent)" : "var(--border)"}`,
                  background: processingStep > idx ? "var(--success)" : "transparent",
                  display: "grid",
                  placeItems: "center",
                  color: "#16110a",
                  fontSize: "0.65rem",
                  fontWeight: "bold",
                }}>
                  {processingStep > idx ? "✓" : ""}
                </div>
                <span style={{
                  fontSize: "0.9rem",
                  fontWeight: processingStep === idx ? 700 : 500,
                  color: processingStep === idx ? "var(--accent-strong)" : "var(--text-soft)",
                }}>
                  {stepText}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <section className="hero-panel" style={{ marginBottom: "1rem", padding: "1.5rem 2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div className="hero-eyebrow pill" style={{ display: "inline-block", marginBottom: "0.5rem" }}>Secure Checkout</div>
            <h1 className="hero-title gradient-text" style={{ fontSize: "2rem", margin: 0, maxWidth: "none" }}>Complete Subscription</h1>
          </div>
          <Link href="/billing" className="secondary-button" style={{ padding: "0.6rem 1.2rem", fontSize: "0.85rem" }}>
            ← Back to Plans
          </Link>
        </div>
      </section>

      {/* Checkout Split Grid */}
      <div className="content-grid" style={{ gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)", gap: "1.5rem" }}>
        {/* Left Side: Payment Form Panels */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="section-header" style={{ marginBottom: "0.5rem" }}>
            <div>
              <div className="section-title">Select payment method</div>
              <div className="section-heading" style={{ fontSize: "1.2rem" }}>Indian Bank & Card Portal</div>
            </div>
          </div>

          {/* Payment Tabs Selector */}
          <div style={{
            display: "flex",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "0.3rem",
            gap: "0.3rem",
          }}>
            <button
              onClick={() => setActiveTab("upi")}
              style={{
                flex: 1,
                padding: "0.8rem",
                borderRadius: "9px",
                border: 0,
                background: activeTab === "upi" ? "var(--bg-strong)" : "transparent",
                color: activeTab === "upi" ? "var(--accent-strong)" : "var(--text-soft)",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 200ms ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>📱</span> UPI / QR Code
            </button>
            <button
              onClick={() => setActiveTab("card")}
              style={{
                flex: 1,
                padding: "0.8rem",
                borderRadius: "9px",
                border: 0,
                background: activeTab === "card" ? "var(--bg-strong)" : "transparent",
                color: activeTab === "card" ? "var(--accent-strong)" : "var(--text-soft)",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 200ms ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>💳</span> Debit/Credit Cards
            </button>
            <button
              onClick={() => setActiveTab("netbanking")}
              style={{
                flex: 1,
                padding: "0.8rem",
                borderRadius: "9px",
                border: 0,
                background: activeTab === "netbanking" ? "var(--bg-strong)" : "transparent",
                color: activeTab === "netbanking" ? "var(--accent-strong)" : "var(--text-soft)",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 200ms ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>🏦</span> Net Banking
            </button>
          </div>

          {/* TAB CONTENTS */}

          {/* UPI TAB */}
          {activeTab === "upi" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {upiError && (
                <div style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(212, 100, 79, 0.1)", border: "1px solid var(--danger)", color: "var(--danger)", fontSize: "0.85rem" }}>
                  {upiError}
                </div>
              )}

              <div className="content-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                {/* VPA Address Block */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Enter UPI ID / VPA</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="username@bank"
                      style={{
                        width: "100%",
                        background: "rgba(255, 255, 255, 0.02)",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        padding: "0.75rem",
                        fontSize: "0.95rem",
                        outline: "none",
                      }}
                    />
                    <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginTop: "0.3rem" }}>
                      {["@okaxis", "@okicici", "@okhdfcbank", "@paytm"].map((suffix) => (
                        <button
                          key={suffix}
                          type="button"
                          onClick={() => {
                            const prefix = upiId.includes("@") ? upiId.split("@")[0] : upiId;
                            setUpiId(prefix + suffix);
                          }}
                          style={{
                            background: "var(--bg-soft)",
                            border: "1px solid var(--border)",
                            color: "var(--text-soft)",
                            borderRadius: "6px",
                            padding: "0.3rem 0.6rem",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                          }}
                        >
                          {suffix}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="helper-text" style={{ fontSize: "0.82rem", lineHeight: 1.5 }}>
                    Upon proceeding, a collect request will be sent to your UPI app. Please open your mobile app (GPay, PhonePe, BHIM, Paytm) to authorize the payment.
                  </p>

                  <button
                    onClick={triggerPayment}
                    className="primary-button"
                    style={{ width: "100%", justifyContent: "center", marginTop: "auto", padding: "0.85rem" }}
                  >
                    Pay {plan.price} via UPI ID
                  </button>
                </div>

                {/* QR Code Block */}
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--border)",
                  borderRadius: "16px",
                  background: "rgba(255, 255, 255, 0.01)",
                  padding: "1.5rem",
                  textAlign: "center",
                }}>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-soft)", marginBottom: "0.8rem" }}>
                    Scan QR Code to Pay
                  </div>

                  {/* QR SVG Visualizer with scan lines */}
                  <div style={{
                    position: "relative",
                    background: "#fff",
                    padding: "0.75rem",
                    borderRadius: "12px",
                    display: "inline-block",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                    opacity: qrExpired ? 0.2 : 1,
                    transition: "opacity 300ms ease",
                  }}>
                    <svg width="150" height="150" viewBox="0 0 100 100" style={{ display: "block" }}>
                      {/* Quiet Zone Grid blocks to simulate actual QR Code */}
                      <path d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z" fill="#16110a" />
                      <path d="M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z" fill="#16110a" />
                      <path d="M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z" fill="#16110a" />
                      {/* Random mock QR patterns */}
                      <path d="M40,10 h5 v5 h-5 z M50,5 h10 v5 h-10 z M45,20 h10 v5 h-10 z M35,40 h15 v5 h-15 z M10,40 h10 v5 h-10 z" fill="#16110a" />
                      <path d="M60,40 h10 v20 h-10 z M80,45 h15 v5 h-15 z M85,60 h5 v10 h-5 z M45,60 h15 v5 h-15 z M35,80 h10 v10 h-10 z" fill="#16110a" />
                      <path d="M50,75 h20 v5 h-20 z M75,80 h5 v10 h-5 z M90,85 h10 v10 h-10 z M65,90 h10 v5 h-10 z" fill="#16110a" />
                      {/* Central branding anchor */}
                      <rect x="42" y="42" width="16" height="16" rx="4" fill="var(--accent)" stroke="#fff" strokeWidth="2" />
                      <text x="50" y="52" fill="#16110a" fontSize="7" fontWeight="bold" textAnchor="middle">N</text>
                    </svg>

                    {/* Scanline Animation */}
                    {!qrExpired && (
                      <div style={{
                        position: "absolute",
                        left: "0.75rem",
                        right: "0.75rem",
                        height: "2px",
                        background: "var(--accent-strong)",
                        boxShadow: "0 0 8px var(--accent)",
                        animation: "scan 3s ease-in-out infinite",
                      }} />
                    )}
                  </div>

                  {qrExpired ? (
                    <div style={{ marginTop: "1rem" }}>
                      <div style={{ color: "var(--danger)", fontWeight: 700, fontSize: "0.85rem" }}>QR Code Expired</div>
                      <button
                        onClick={() => {
                          setQrTimer(300);
                          setQrExpired(false);
                        }}
                        style={{
                          background: "var(--bg-strong)",
                          border: "1px solid var(--border-strong)",
                          color: "var(--accent-strong)",
                          borderRadius: "8px",
                          padding: "0.4rem 0.8rem",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          marginTop: "0.5rem",
                        }}
                      >
                        Regenerate QR
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginTop: "1rem" }}>
                      <div style={{ color: "var(--accent-strong)", fontWeight: 700, fontSize: "1.1rem", fontFamily: "monospace" }}>
                        {formatTimer(qrTimer)}
                      </div>
                      <div className="helper-text" style={{ fontSize: "0.75rem" }}>
                        Pay using any UPI-compliant app.
                      </div>
                      <button
                        onClick={triggerPayment}
                        className="secondary-button"
                        style={{ padding: "0.4rem 1rem", fontSize: "0.8rem", marginTop: "0.5rem", borderRadius: "8px" }}
                      >
                        Simulate Scan Complete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CARD TAB */}
          {activeTab === "card" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {cardError && (
                <div style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(212, 100, 79, 0.1)", border: "1px solid var(--danger)", color: "var(--danger)", fontSize: "0.85rem" }}>
                  {cardError}
                </div>
              )}

              <div className="content-grid" style={{ gridTemplateColumns: "1.2fr 0.8fr", gap: "1.5rem", alignItems: "center" }}>
                {/* Inputs Block */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Cardholder Name</label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                      onFocus={() => {
                        setIsCardFlipped(false);
                        setFocusedField("holder");
                      }}
                      onBlur={() => setFocusedField(null)}
                      placeholder="E.G. AATHITHYAN S"
                      maxLength={24}
                      style={{
                        width: "100%",
                        background: "rgba(255, 255, 255, 0.02)",
                        color: "var(--text)",
                        border: focusedField === "holder" ? "1px solid var(--accent)" : "1px solid var(--border)",
                        borderRadius: "8px",
                        padding: "0.75rem",
                        fontSize: "0.95rem",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Card Number</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        onFocus={() => {
                          setIsCardFlipped(false);
                          setFocusedField("number");
                        }}
                        onBlur={() => setFocusedField(null)}
                        placeholder="4000 1234 5678 9010"
                        maxLength={19}
                        style={{
                          width: "100%",
                          background: "rgba(255, 255, 255, 0.02)",
                          color: "var(--text)",
                          border: focusedField === "number" ? "1px solid var(--accent)" : "1px solid var(--border)",
                          borderRadius: "8px",
                          padding: "0.75rem",
                          paddingRight: "3rem",
                          fontSize: "0.95rem",
                          outline: "none",
                          fontFamily: "monospace",
                        }}
                      />
                      <span style={{
                        position: "absolute",
                        right: "0.75rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "var(--accent-strong)",
                        background: "var(--bg-strong)",
                        padding: "0.2rem 0.4rem",
                        borderRadius: "4px",
                      }}>
                        {getCardType(cardNumber)}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "1rem" }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>Expiry Date</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        onFocus={() => {
                          setIsCardFlipped(false);
                          setFocusedField("expiry");
                        }}
                        onBlur={() => setFocusedField(null)}
                        placeholder="MM/YY"
                        maxLength={5}
                        style={{
                          width: "100%",
                          background: "rgba(255, 255, 255, 0.02)",
                          color: "var(--text)",
                          border: focusedField === "expiry" ? "1px solid var(--accent)" : "1px solid var(--border)",
                          borderRadius: "8px",
                          padding: "0.75rem",
                          fontSize: "0.95rem",
                          outline: "none",
                          textAlign: "center",
                          fontFamily: "monospace",
                        }}
                      />
                    </div>

                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>CVV</label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={handleCvvChange}
                        onFocus={() => {
                          setIsCardFlipped(true);
                          setFocusedField("cvv");
                        }}
                        onBlur={() => {
                          setIsCardFlipped(false);
                          setFocusedField(null);
                        }}
                        placeholder="•••"
                        maxLength={4}
                        style={{
                          width: "100%",
                          background: "rgba(255, 255, 255, 0.02)",
                          color: "var(--text)",
                          border: focusedField === "cvv" ? "1px solid var(--accent)" : "1px solid var(--border)",
                          borderRadius: "8px",
                          padding: "0.75rem",
                          fontSize: "0.95rem",
                          outline: "none",
                          textAlign: "center",
                          fontFamily: "monospace",
                        }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={triggerPayment}
                    className="primary-button"
                    style={{ width: "100%", justifyContent: "center", marginTop: "1rem", padding: "0.85rem" }}
                  >
                    Pay {plan.price} via Card
                  </button>
                </div>

                {/* 3D Glassmorphic Card Container */}
                <div style={{
                  perspective: "1000px",
                  width: "100%",
                  maxWidth: "320px",
                  height: "200px",
                  margin: "0 auto",
                }}>
                  <div style={{
                    width: "100%",
                    height: "100%",
                    position: "relative",
                    transformStyle: "preserve-3d",
                    transform: isCardFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    transition: "transform 600ms cubic-bezier(0.4, 0, 0.2, 1)",
                  }}>
                    {/* Front side */}
                    <div style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      backfaceVisibility: "hidden",
                      background: "linear-gradient(135deg, rgba(208, 162, 74, 0.15), rgba(24, 24, 24, 0.95))",
                      border: "1px solid var(--border-strong)",
                      boxShadow: "var(--shadow-md)",
                      borderRadius: "16px",
                      padding: "1.2rem",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      color: "var(--text)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        {/* Chip */}
                        <div style={{
                          width: "38px",
                          height: "28px",
                          background: "linear-gradient(135deg, #d4af37, #f3e5ab)",
                          borderRadius: "4px",
                          position: "relative",
                          overflow: "hidden",
                        }}>
                          <div style={{ position: "absolute", inset: "4px", border: "1px solid rgba(0,0,0,0.15)", borderRadius: "2px" }} />
                        </div>
                        {/* Network Type Logo */}
                        <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--accent-strong)", fontFamily: "var(--font-display)" }}>
                          {getCardType(cardNumber)}
                        </div>
                      </div>

                      {/* Card Number Container */}
                      <div style={{
                        fontFamily: "monospace",
                        fontSize: "1.2rem",
                        letterSpacing: "2.5px",
                        textAlign: "center",
                        padding: "0.3rem 0",
                        borderRadius: "6px",
                        background: focusedField === "number" ? "rgba(208,162,74,0.1)" : "transparent",
                        border: focusedField === "number" ? "1px dashed var(--border-strong)" : "1px solid transparent",
                      }}>
                        {cardNumber || "•••• •••• •••• ••••"}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        {/* Holder */}
                        <div style={{
                          maxWidth: "70%",
                          padding: "0.2rem",
                          borderRadius: "4px",
                          background: focusedField === "holder" ? "rgba(208,162,74,0.1)" : "transparent",
                          border: focusedField === "holder" ? "1px dashed var(--border-strong)" : "1px solid transparent",
                        }}>
                          <div style={{ fontSize: "0.6rem", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.15rem" }}>
                            Card Holder
                          </div>
                          <div style={{ fontSize: "0.8rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {cardHolder || "YOUR NAME"}
                          </div>
                        </div>

                        {/* Expiry */}
                        <div style={{
                          padding: "0.2rem",
                          borderRadius: "4px",
                          background: focusedField === "expiry" ? "rgba(208,162,74,0.1)" : "transparent",
                          border: focusedField === "expiry" ? "1px dashed var(--border-strong)" : "1px solid transparent",
                        }}>
                          <div style={{ fontSize: "0.6rem", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.15rem" }}>
                            Expires
                          </div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 700, fontFamily: "monospace" }}>
                            {cardExpiry || "MM/YY"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Back side */}
                    <div style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      background: "var(--bg-panel)",
                      border: "1px solid var(--border)",
                      boxShadow: "var(--shadow-md)",
                      borderRadius: "16px",
                      padding: "1.2rem 0",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      color: "var(--text)",
                    }}>
                      {/* Black Stripe */}
                      <div style={{ width: "100%", height: "40px", background: "#000" }} />

                      {/* Info Block */}
                      <div style={{ paddingInline: "1.2rem" }}>
                        <div style={{ fontSize: "0.6rem", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.25rem", textAlign: "right" }}>
                          CVV / Security Code
                        </div>
                        {/* CVV Stripe */}
                        <div style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          height: "36px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          paddingRight: "0.75rem",
                        }}>
                          <div style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            letterSpacing: "2px",
                            fontSize: "0.95rem",
                            background: focusedField === "cvv" ? "rgba(208,162,74,0.2)" : "transparent",
                            padding: "0.1rem 0.3rem",
                            borderRadius: "4px",
                          }}>
                            {cardCvv || "•••"}
                          </div>
                        </div>
                      </div>

                      {/* Footer notice */}
                      <div style={{ paddingInline: "1.2rem", fontSize: "0.6rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                        This is a simulated tokenized transaction. Your details are secured locally.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NET BANKING TAB */}
          {activeTab === "netbanking" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {netBankingError && (
                <div style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(212, 100, 79, 0.1)", border: "1px solid var(--danger)", color: "var(--danger)", fontSize: "0.85rem" }}>
                  {netBankingError}
                </div>
              )}

              <div>
                <label className="form-label" style={{ fontWeight: 700, display: "block", marginBottom: "0.8rem" }}>
                  Popular Banks
                </label>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                  gap: "0.8rem",
                }}>
                  {popularBanks.map((bank) => {
                    const isSelected = selectedBank === bank.id;
                    return (
                      <button
                        key={bank.id}
                        onClick={() => setSelectedBank(bank.id)}
                        type="button"
                        style={{
                          background: isSelected ? "var(--bg-strong)" : "rgba(255, 255, 255, 0.02)",
                          border: isSelected ? "1px solid var(--border-strong)" : "1px solid var(--border)",
                          borderRadius: "12px",
                          padding: "1rem",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "0.6rem",
                          transition: "all 150ms ease",
                        }}
                      >
                        <div style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: bank.color,
                          display: "grid",
                          placeItems: "center",
                          color: "#fff",
                          fontWeight: 800,
                          fontSize: "0.7rem",
                          boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                        }}>
                          {bank.label}
                        </div>
                        <div style={{
                          fontSize: "0.8rem",
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? "var(--accent-strong)" : "var(--text-soft)",
                          textAlign: "center",
                          lineHeight: 1.2,
                        }}>
                          {bank.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Or Select Other Bank</label>
                <select
                  value={otherBanks.includes(selectedBank) ? selectedBank : ""}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--bg-panel)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "0.75rem",
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                >
                  <option value="" disabled>-- Select your bank --</option>
                  {otherBanks.map((bankName) => (
                    <option key={bankName} value={bankName}>{bankName}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={triggerPayment}
                className="primary-button"
                style={{ width: "100%", justifyContent: "center", marginTop: "1rem", padding: "0.85rem" }}
              >
                Pay {plan.price} via Net Banking
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Order Summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Plan Info Card */}
          <div className="panel" style={{ height: "fit-content" }}>
            <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1rem", marginBottom: "1rem" }}>
              <div className="section-title">Order Summary</div>
              <h2 className="section-heading" style={{ color: "var(--accent-strong)", margin: "0.25rem 0 0" }}>
                {plan.name}
              </h2>
              <p className="helper-text" style={{ fontSize: "0.85rem", marginTop: "0.4rem" }}>{plan.blurb}</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {plan.features.map((feature) => (
                <div key={feature} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
                  <span style={{ color: "var(--success)" }}>✓</span>
                  <span style={{ color: "var(--text-soft)" }}>{feature}</span>
                </div>
              ))}
            </div>

            <div style={{
              background: "var(--bg-soft)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
              marginBottom: "1.5rem",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Subscription</span>
                <span style={{ color: "var(--text)" }}>{plan.price}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Tax (GST 18%)</span>
                <span style={{ color: "var(--text)" }}>Included</span>
              </div>
              <div style={{ height: "1px", background: "var(--border)", marginBlock: "0.3rem" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "1.05rem" }}>
                <span style={{ color: "var(--accent-strong)" }}>Total Due</span>
                <span style={{ color: "var(--accent-strong)" }}>{plan.price}</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>
              <span>🔒 SECURE 256-BIT ENCRYPTION</span>
            </div>
          </div>

          {/* Secure details info */}
          <div className="panel-empty" style={{ fontSize: "0.8rem", lineHeight: 1.5, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ fontWeight: 700, color: "var(--text-soft)" }}>💡 Sandbox Environment</div>
            <div>
              This checkout runs in testing mode. You can enter any mock credentials for Card, VPA, or Net Banking options. No actual funds will be transferred.
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Animations and Keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0%, 100% { top: 0.75rem; }
          50% { top: calc(100% - 0.75rem - 2px); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="completion-card form-card" style={{ maxWidth: "500px", margin: "4rem auto", textAlign: "center" }}>
        <div className="loading-spinner-wrapper" style={{ margin: "2rem auto" }}>
          <div className="spinner"></div>
        </div>
        <h2 className="section-heading" style={{ color: "var(--accent)" }}>Loading payment details...</h2>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
