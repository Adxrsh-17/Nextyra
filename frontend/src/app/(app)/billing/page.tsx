"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";

const MEMBERSHIP_PLANS = [
  {
    id: "lift_start",
    name: "Lift Start",
    price: "$9/mo",
    blurb: "For solo lifters who want smart logging and daily motivation.",
    features: ["Workout logging", "History and XP", "Daily training brief"],
  },
  {
    id: "momentum_pro",
    name: "Momentum Pro",
    price: "$19/mo",
    blurb: "For serious gym users who want PulsePilot adapting the workout to how they actually feel.",
    features: ["PulsePilot agent", "Recovery dashboard", "Adaptive day plans"],
  },
  {
    id: "coach_console",
    name: "Coach Console",
    price: "$49/mo",
    blurb: "For trainers managing clients with structure, accountability, and shared plans.",
    features: ["Multi-athlete support", "Client progress view", "Program oversight"],
  },
];

function formatTier(tier?: string | null) {
  if (!tier || tier === "free") return "Free Tier";
  if (tier === "lift_start") return "Lift Start Member";
  if (tier === "momentum_pro") return "Momentum Pro Member";
  if (tier === "coach_console") return "Coach Console Member";
  return tier.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function getSessionToken() {
  return typeof window === "undefined" ? "" : window.localStorage.getItem("nextyra-session-token") ?? "";
}

export default function BillingPage() {
  const { user } = useAuth();
  const [submittingPlan, setSubmittingPlan] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState("");

  async function handleSubscribe(planId: string) {
    const token = getSessionToken();
    if (!token) {
      setPaymentError("Authentication required. Please log in.");
      return;
    }

    setSubmittingPlan(planId);
    setPaymentError("");

    try {
      window.location.href = `/payment/checkout?plan=${planId}`;
    } catch (err: any) {
      console.error("Payment redirect failed:", err);
      setPaymentError(err.message || "Failed to initialize payment checkout. Please try again.");
      setSubmittingPlan(null);
    }
  }

  return (
    <div className="page" style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
      <section className="hero-panel" style={{ marginBottom: "2rem" }}>
        <div style={{ textAlign: "center", paddingBlock: "1.5rem" }}>
          <div className="hero-eyebrow pill" style={{ display: "inline-block", marginBottom: "1rem" }}>Membership Management</div>
          <h1 className="hero-title gradient-text" style={{ fontSize: "2.5rem", maxWidth: "none", margin: "0 auto 1rem" }}>
            Choose Your Progression Plan
          </h1>
          <p className="hero-copy" style={{ margin: "0 auto 1.5rem", maxWidth: "55ch" }}>
            Unlock adaptive AI workout orchestration, recovery maps, multi-agent training briefs, and premium sports science analytics.
          </p>

          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginTop: "1rem" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Current Status:</span>
            <span className="pill" style={{ background: "var(--bg-strong)", color: "var(--accent-strong)", borderColor: "var(--border-strong)", borderWidth: "1px", borderStyle: "solid", fontWeight: 700, fontSize: "0.9rem" }}>
              {formatTier(user?.subscriptionTier)}
            </span>
          </div>
        </div>
      </section>

      {paymentError && (
        <div className="auth-error" style={{ marginBottom: "2rem", textAlign: "center", padding: "1rem", borderRadius: "8px", background: "rgba(220, 38, 38, 0.1)", border: "1px solid var(--danger)", color: "var(--danger)" }}>
          {paymentError}
        </div>
      )}

      <div className="plans-grid">
        {MEMBERSHIP_PLANS.map((plan) => {
          const isCurrent = user?.subscriptionTier === plan.id;
          return (
            <article key={plan.name} className="plan-card" style={{ display: "flex", flexDirection: "column", height: "100%", padding: "2rem" }}>
              <div className="plan-name" style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text)" }}>{plan.name}</div>
              <div className="plan-price" style={{ fontSize: "2.2rem", fontWeight: 800, marginBlock: "0.75rem", color: "var(--accent-strong)" }}>{plan.price}</div>
              <p className="helper-text" style={{ lineHeight: 1.6, marginBottom: "1.5rem", fontSize: "0.92rem", flex: "1" }}>{plan.blurb}</p>
              
              <div style={{ borderTop: "1px solid var(--border)", marginBlock: "1.5rem", paddingTop: "1.5rem" }}>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: "0.75rem" }}>Features Included</div>
                <div className="plan-feature-list" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {plan.features.map((feature) => (
                    <span key={feature} className="pill" style={{ justifySelf: "start", width: "fit-content" }}>{feature}</span>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: "1.5rem" }}>
                {isCurrent ? (
                  <button 
                    className="secondary-button" 
                    disabled 
                    style={{ 
                      width: "100%", 
                      cursor: "not-allowed", 
                      border: "1px solid var(--success)", 
                      color: "var(--success)", 
                      background: "rgba(111, 181, 99, 0.08)",
                      justifyContent: "center"
                    }}
                  >
                    Active Plan
                  </button>
                ) : (
                  <button 
                    onClick={() => handleSubscribe(plan.id)} 
                    disabled={submittingPlan !== null}
                    className="primary-button" 
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    {submittingPlan === plan.id ? "Redirecting..." : `Subscribe to ${plan.name}`}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
