"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { SUBSCRIPTION_PLANS } from "@/lib/paymentPlans";

type PaymentStatusResponse = {
  order: {
    status: string;
    gateway_order_id: string;
    gateway_payment_id?: string | null;
    amount_paise: number;
    plan_id: string;
  };
  subscription?: {
    status: string;
    plan_id: string;
    activated_at?: string | null;
    failure_reason?: string | null;
  } | null;
};

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("Waiting for the gateway to confirm the payment...");

  const orderId = searchParams.get("order_id");
  const paymentId = searchParams.get("payment_id");
  const planId = searchParams.get("plan") || "momentum_pro";
  const plan = useMemo(() => {
    return SUBSCRIPTION_PLANS[planId in SUBSCRIPTION_PLANS ? (planId as keyof typeof SUBSCRIPTION_PLANS) : "momentum_pro"];
  }, [planId]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function pollStatus() {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("nextyra-session-token") : null;

      if (!token) {
        if (active) {
          setLoading(false);
          setError("Sign in to confirm your subscription after payment.");
        }
        return;
      }

      if (!orderId) {
        if (active) {
          setLoading(false);
          setError("Missing order identifier in the confirmation link.");
        }
        return;
      }

      try {
        const response = await apiFetch<PaymentStatusResponse>(`/api/payments/orders/${encodeURIComponent(orderId)}?token=${encodeURIComponent(token)}`);

        if (!active) return;

        if (response.subscription?.status === "active" || response.order.status === "active") {
          await refreshUser();
          setStatusMessage("Payment verified. Your subscription is now active.");
          setLoading(false);
          if (timer) clearInterval(timer);
          return;
        }

        if (response.subscription?.status === "failed" || response.order.status === "failed") {
          setError(response.subscription?.failure_reason || "The gateway reported a failed payment.");
          setLoading(false);
          if (timer) clearInterval(timer);
          return;
        }

        setStatusMessage("Payment received. Waiting for webhook confirmation...");
      } catch (err: any) {
        if (!active) return;
        setStatusMessage("Waiting for the secure webhook confirmation...");
        setError(err?.status === 404 ? "We could not find the payment order yet." : "");
      }
    }

    pollStatus();
    timer = setInterval(pollStatus, 1800);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [orderId, refreshUser]);

  if (loading) {
    return (
      <div className="completion-card form-card" style={{ maxWidth: "560px", margin: "4rem auto", textAlign: "center" }}>
        <div className="loading-spinner-wrapper" style={{ margin: "2rem auto" }}>
          <div className="spinner"></div>
        </div>
        <h2 className="section-heading" style={{ color: "var(--accent)" }}>Verifying payment...</h2>
        <p className="hero-copy" style={{ fontSize: "0.95rem" }}>{statusMessage}</p>
        {paymentId && <p className="helper-text" style={{ marginTop: "0.75rem" }}>Gateway payment ID: {paymentId}</p>}
      </div>
    );
  }

  if (error) {
    return (
      <div className="completion-card form-card" style={{ maxWidth: "560px", margin: "4rem auto", textAlign: "center", border: "1px solid var(--error-soft)" }}>
        <div className="completion-orb" style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--error)" }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
        <h2 className="section-heading" style={{ color: "var(--error)", marginTop: "1.5rem" }}>Verification Pending</h2>
        <p className="hero-copy" style={{ fontSize: "0.95rem", marginBlock: "0.75rem 2rem" }}>{error}</p>
        <div className="hero-actions" style={{ justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
          <button onClick={() => router.refresh()} className="primary-button">Check again</button>
          <Link href="/billing" className="secondary-button">Back to billing</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="completion-card form-card" style={{ maxWidth: "640px", margin: "4rem auto", padding: "3rem 2rem", textAlign: "center" }}>
      <div className="completion-orb" style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--success)" }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <div className="section-title" style={{ color: "var(--success)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Payment Successful</div>
      <h1 className="hero-title" style={{ fontSize: "2.2rem", marginBlock: "0.75rem 1.5rem", maxWidth: "none" }}>
        Welcome to {plan.name}!
      </h1>
      <p className="hero-copy" style={{ fontSize: "1.05rem", marginInline: "auto", maxWidth: "48ch" }}>
        {statusMessage} Your subscription tier will update from the backend webhook, not from the frontend alone.
      </p>

      <div className="success-details-card" style={{ background: "var(--bg-soft)", border: "1px solid var(--border-soft)", borderRadius: "12px", padding: "1.5rem", marginBlock: "2rem", textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-soft)", marginBottom: "0.75rem" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Member</span>
          <span style={{ fontWeight: 600, color: "var(--text)" }}>{user?.name || "Athlete"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-soft)", marginBottom: "0.75rem" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Active Plan</span>
          <span style={{ fontWeight: 700, color: "var(--accent)" }}>{plan.name}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-soft)", marginBottom: "0.75rem" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Order ID</span>
          <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--text-muted)" }}>{orderId || "N/A"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Payment ID</span>
          <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--text-muted)" }}>{paymentId || "N/A"}</span>
        </div>
      </div>

      <div className="hero-actions" style={{ justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
        <Link href="/dashboard" className="primary-button" style={{ minWidth: "200px" }}>
          Go to Dashboard
        </Link>
        <Link href="/billing" className="secondary-button" style={{ minWidth: "200px" }}>
          View billing
        </Link>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="completion-card form-card" style={{ maxWidth: "500px", margin: "4rem auto", textAlign: "center" }}>Loading transaction...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}