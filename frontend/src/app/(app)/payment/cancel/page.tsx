"use client";

import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <div className="completion-card form-card" style={{ maxWidth: "550px", margin: "4rem auto", padding: "3rem 2rem", textAlign: "center" }}>
      <div className="completion-orb" style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--warning)" }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m10.29 3.86 8 14a2 2 0 0 1-1.73 3H3.66a2 2 0 0 1-1.73-3l8-14z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </div>
      <div className="section-title" style={{ color: "var(--warning)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Checkout Cancelled</div>
      <h1 className="hero-title" style={{ fontSize: "2.1rem", marginBlock: "0.75rem 1.5rem", maxWidth: "none" }}>
        Payment was not completed.
      </h1>
      <p className="hero-copy" style={{ fontSize: "1rem", marginInline: "auto", maxWidth: "45ch" }}>
        No charges were made to your card. You can start the checkout process again anytime from your dashboard.
      </p>

      <div className="hero-actions" style={{ justifyContent: "center", gap: "1rem", marginTop: "2.5rem" }}>
        <Link href="/dashboard" className="primary-button" style={{ minWidth: "180px" }}>
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
