"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const sessionId = searchParams.get("session_id");
  const plan = searchParams.get("plan");

  const planTitles: Record<string, string> = {
    lift_start: "Lift Start",
    momentum_pro: "Momentum Pro",
    coach_console: "Coach Console",
  };

  useEffect(() => {
    let active = true;

    async function handlePaymentSuccess() {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("nextyra-session-token") : null;
      if (!token) {
        setError("User session not found. Please log in.");
        setLoading(false);
        return;
      }

      if (!plan) {
        setError("No subscription plan specified in payment details.");
        setLoading(false);
        return;
      }

      try {
        // Upgrade database tier
        await apiFetch("/api/payments/mock-success", {
          method: "POST",
          body: JSON.stringify({ token, plan }),
        });

        // Refresh user context state
        await refreshUser();

        if (active) {
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Failed to upgrade subscription tier:", err);
        if (active) {
          setError(err.message || "Something went wrong while confirming your payment.");
          setLoading(false);
        }
      }
    }

    handlePaymentSuccess();

    return () => {
      active = false;
    };
  }, [plan, refreshUser]);

  if (loading) {
    return (
      <div className="completion-card form-card" style={{ maxWidth: "500px", margin: "4rem auto", textAlign: "center" }}>
        <div className="loading-spinner-wrapper" style={{ margin: "2rem auto" }}>
          <div className="spinner"></div>
        </div>
        <h2 className="section-heading" style={{ color: "var(--accent)" }}>Verifying transaction...</h2>
        <p className="hero-copy" style={{ fontSize: "0.95rem" }}>
          Please hold on while we confirm your payment and set up your premium dashboard.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="completion-card form-card" style={{ maxWidth: "500px", margin: "4rem auto", textAlign: "center", border: "1px solid var(--error-soft)" }}>
        <div className="completion-orb" style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--error)" }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
        <h2 className="section-heading" style={{ color: "var(--error)", marginTop: "1.5rem" }}>Verification Failed</h2>
        <p className="hero-copy" style={{ fontSize: "0.95rem", marginBlock: "0.75rem 2rem" }}>
          {error}
        </p>
        <div className="hero-actions" style={{ justifyContent: "center" }}>
          <Link href="/dashboard" className="primary-button">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="completion-card form-card" style={{ maxWidth: "600px", margin: "4rem auto", padding: "3rem 2rem", textAlign: "center" }}>
      <div className="completion-orb" style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--success)" }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <div className="section-title" style={{ color: "var(--success)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Payment Successful</div>
      <h1 className="hero-title" style={{ fontSize: "2.2rem", marginBlock: "0.75rem 1.5rem", maxWidth: "none" }}>
        Welcome to {planTitles[plan || ""] || "Premium"}!
      </h1>
      <p className="hero-copy" style={{ fontSize: "1.05rem", marginInline: "auto", maxWidth: "45ch" }}>
        Your account has been upgraded successfully. You now have complete access to all {planTitles[plan || ""] || "Premium"} workout builders, multi-agent AI features, and analytics logs.
      </p>

      <div className="success-details-card" style={{ background: "var(--bg-soft)", border: "1px solid var(--border-soft)", borderRadius: "12px", padding: "1.5rem", marginBlock: "2rem", textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-soft)", marginBottom: "0.75rem" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Member</span>
          <span style={{ fontWeight: 600, color: "var(--text)" }}>{user?.name || "Athlete"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-soft)", marginBottom: "0.75rem" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Active Plan</span>
          <span style={{ fontWeight: 700, color: "var(--accent)" }}>{planTitles[plan || ""] || "Premium"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Transaction ID</span>
          <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            {sessionId ? sessionId.slice(0, 16) + "..." : "N/A"}
          </span>
        </div>
      </div>

      <div className="hero-actions" style={{ justifyContent: "center", gap: "1rem" }}>
        <Link href="/dashboard" className="primary-button" style={{ minWidth: "200px" }}>
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="completion-card form-card" style={{ maxWidth: "500px", margin: "4rem auto", textAlign: "center" }}>
        <div className="loading-spinner-wrapper" style={{ margin: "2rem auto" }}>
          <div className="spinner"></div>
        </div>
        <h2 className="section-heading" style={{ color: "var(--accent)" }}>Loading transaction...</h2>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
