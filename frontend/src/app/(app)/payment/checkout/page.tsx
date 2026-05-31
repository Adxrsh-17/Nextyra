"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanId } from "@/lib/paymentPlans";

declare global {
  interface Window {
    Razorpay?: new (options: any) => { open: () => void; on: (event: string, callback: (payload: any) => void) => void };
  }
}

const PAYMENT_METHODS = [
  { name: "UPI", description: "Open your UPI app or scan the QR inside the gateway" },
  { name: "Cards", description: "Credit and debit cards with OTP or 3DS approval" },
  { name: "Net Banking", description: "Choose from major Indian banks in the checkout" },
  { name: "Wallets", description: "Pay using supported wallets where available" },
];

let razorpayScriptPromise: Promise<boolean> | null = null;

function loadRazorpayScript() {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }
  return razorpayScriptPromise;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const planId = (searchParams.get("plan") || "momentum_pro") as SubscriptionPlanId;
  const plan = SUBSCRIPTION_PLANS[planId] ?? SUBSCRIPTION_PLANS.momentum_pro;

  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState("");
  const [gatewayReady, setGatewayReady] = useState(false);
  const [paymentStyle] = useState<"upi" | "all">("upi");
  const [demoCheckout, setDemoCheckout] = useState(false);
  const [demoUpiIntent, setDemoUpiIntent] = useState("");
  const [demoPayeeVpa, setDemoPayeeVpa] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    let active = true;
    loadRazorpayScript().then((ready) => {
      if (active) setGatewayReady(ready);
    });
    return () => {
      active = false;
    };
  }, []);

  async function startCheckout() {
    setError("");

    const token = window.localStorage.getItem("nextyra-session-token");

    if (!user || !token) {
      const demoUpiIntent = `upi://pay?pa=${encodeURIComponent("demo@nextyra")}&pn=${encodeURIComponent("Nextyra Fitness")}&am=${encodeURIComponent((plan.amountPaise / 100).toFixed(2))}&cu=INR&tn=${encodeURIComponent(plan.name + " subscription")}`;
      const qr = await QRCode.toDataURL(demoUpiIntent, {
        width: 320,
        margin: 1,
        color: {
          dark: "#17120d",
          light: "#f8e3b2",
        },
      });

      setDemoCheckout(true);
      setDemoUpiIntent(demoUpiIntent);
      setDemoPayeeVpa("demo@nextyra");
      setQrDataUrl(qr);
      setIsOpening(false);
      return;
    }

    const RazorpayAvailable = window.Razorpay;
    if (!RazorpayAvailable) {
      const demoUpiIntent = `upi://pay?pa=${encodeURIComponent("demo@nextyra")}&pn=${encodeURIComponent("Nextyra Fitness")}&am=${encodeURIComponent((plan.amountPaise / 100).toFixed(2))}&cu=INR&tn=${encodeURIComponent(plan.name + " subscription")}`;
      const qr = await QRCode.toDataURL(demoUpiIntent, {
        width: 320,
        margin: 1,
        color: {
          dark: "#17120d",
          light: "#f8e3b2",
        },
      });

      setDemoCheckout(true);
      setDemoUpiIntent(demoUpiIntent);
      setDemoPayeeVpa("demo@nextyra");
      setQrDataUrl(qr);
      setIsOpening(false);
      return;
    }

    setIsOpening(true);

    try {
      const response = await apiFetch<{ orderId: string; amount: number; currency: string; keyId: string | null; demoCheckout?: boolean; upiIntent?: string | null; payeeVpa?: string | null }>("/api/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ token, plan: plan.id }),
      });

      if (response.demoCheckout && response.upiIntent) {
        const qr = await QRCode.toDataURL(response.upiIntent, {
          width: 320,
          margin: 1,
          color: {
            dark: "#17120d",
            light: "#f8e3b2",
          },
        });

        setDemoCheckout(true);
        setDemoUpiIntent(response.upiIntent);
        setDemoPayeeVpa(response.payeeVpa || "");
        setQrDataUrl(qr);
        setIsOpening(false);
        return;
      }

      const checkout = new RazorpayAvailable({
        key: response.keyId,
        amount: response.amount,
        currency: response.currency,
        name: "Nextyra Fitness",
        description: `${plan.name} membership`,
        order_id: response.orderId,
        prefill: {
          name: user.name,
          email: user.email,
        },
        notes: {
          plan: plan.id,
          userId: user.id,
        },
        theme: { color: "#d0a24a" },
        handler: (gatewayResponse: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          const query = new URLSearchParams({
            order_id: gatewayResponse.razorpay_order_id,
            payment_id: gatewayResponse.razorpay_payment_id,
            signature: gatewayResponse.razorpay_signature,
            plan: plan.id,
          });

          router.push(`/payment/success?${query.toString()}`);
        },
        modal: {
          ondismiss: () => setIsOpening(false),
        },
        method: paymentStyle === "upi"
          ? {
              upi: true,
              card: false,
              netbanking: false,
              wallet: false,
            }
          : {
              upi: true,
              card: true,
              netbanking: true,
              wallet: true,
            },
      });

      checkout.on("payment.failed", (failure: { error?: { description?: string; reason?: string } }) => {
        setError(failure.error?.description || failure.error?.reason || "Payment failed. Please try again.");
        setIsOpening(false);
      });

      checkout.open();
    } catch (err: any) {
      console.error("Checkout initialization failed:", err);
      setError(err.message || "Unable to start payment checkout.");
      setIsOpening(false);
    }
  }

  async function confirmDemoPayment() {
    setError("");

    const token = window.localStorage.getItem("nextyra-session-token");
    if (!token) {
      setError("Please sign in again to confirm the demo payment.");
      return;
    }

    try {
      await apiFetch("/api/payments/mock-success", {
        method: "POST",
        body: JSON.stringify({ token, plan: plan.id }),
      });

      router.push(`/payment/success?order_id=demo_${Date.now()}&payment_id=demo_paid_${Date.now()}&plan=${plan.id}`);
    } catch (err: any) {
      setError(err.message || "Unable to confirm demo payment.");
    }
  }

  return (
    <div className="page" style={{ maxWidth: "1120px", margin: "0 auto", padding: "1.5rem 1rem 2.5rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)", gap: "1.5rem", alignItems: "start" }}>
        <section className="panel" style={{ position: "relative", overflow: "hidden", padding: "2rem" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(208,162,74,0.09), rgba(255,255,255,0.01))", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <div className="pill" style={{ display: "inline-flex", marginBottom: "1rem", gap: "0.5rem", alignItems: "center" }}>
              Secure Gateway Checkout
            </div>
            <h1 className="hero-title" style={{ maxWidth: "none", marginBottom: "0.75rem" }}>
              Complete {plan.name} by opening a Razorpay UPI QR / intent screen.
            </h1>
            <p className="hero-copy" style={{ maxWidth: "65ch", marginBottom: "1.5rem" }}>
              Your card or UPI details never touch our server. We create a gateway order from the backend, then launch the Razorpay checkout where the user can scan the QR or approve the UPI request inside the secure gateway.
            </p>

            {error && (
              <div className="auth-error" style={{ marginBottom: "1rem" }}>
                {error}
              </div>
            )}

            {!user && (
              <div className="panel-empty" style={{ marginBottom: "1rem" }}>
                <div style={{ fontWeight: 700, marginBottom: "0.35rem" }}>Optional sign in</div>
                <div style={{ marginBottom: "0.85rem" }}>You can scan the QR without logging in. Sign in is only needed if you want the payment attached to your account.</div>
                <Link href="/login" className="primary-button" style={{ width: "fit-content" }}>
                  Sign in to save subscription
                </Link>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.8rem", marginBottom: "1.5rem" }}>
              {PAYMENT_METHODS.map((method) => (
                <div key={method.name} className="panel-empty" style={{ minHeight: "120px" }}>
                  <div style={{ fontWeight: 700, marginBottom: "0.35rem" }}>{method.name}</div>
                  <div style={{ color: "var(--text-soft)", lineHeight: 1.5 }}>{method.description}</div>
                </div>
              ))}
            </div>

            <div className="panel-empty" style={{ marginBottom: "1rem", borderStyle: "dashed" }}>
              <div style={{ fontWeight: 700, marginBottom: "0.35rem" }}>UPI QR flow</div>
              <div style={{ color: "var(--text-soft)", lineHeight: 1.5 }}>
                Click the button below and Razorpay opens directly on the UPI payment screen. On supported devices the user can scan the QR from that secure gateway flow.
              </div>
            </div>

            {demoCheckout && qrDataUrl ? (
              <div className="panel" style={{ marginBottom: "1rem", padding: "1rem", borderStyle: "dashed" }}>
                <div className="section-title">Scan to pay</div>
                <div style={{ display: "grid", gap: "0.85rem", justifyItems: "center", marginTop: "0.75rem" }}>
                  <img src={qrDataUrl} alt="UPI QR code" style={{ width: "240px", maxWidth: "100%", borderRadius: "16px", border: "1px solid var(--border)" }} />
                  <div style={{ fontSize: "0.9rem", color: "var(--text-soft)", textAlign: "center", lineHeight: 1.5 }}>
                    Scan this QR with any UPI app, or open the intent link on a phone.
                  </div>
                  {demoPayeeVpa ? <div className="pill">Payee: {demoPayeeVpa}</div> : null}
                  <a href={demoUpiIntent} className="secondary-button" style={{ width: "100%", justifyContent: "center" }}>
                    Open in UPI app
                  </a>
                  <button onClick={confirmDemoPayment} className="primary-button" style={{ width: "100%", justifyContent: "center" }}>
                    I have paid, continue
                  </button>
                </div>
              </div>
            ) : null}

            <button
              onClick={startCheckout}
              className="primary-button"
              disabled={isOpening}
              style={{ width: "100%", justifyContent: "center", padding: "1rem 1.2rem", fontSize: "1rem" }}
            >
              {isOpening ? "Opening UPI checkout..." : demoCheckout ? "Regenerate UPI QR" : gatewayReady ? `Open UPI QR checkout` : `Open secure checkout`}
            </button>

            <div style={{ marginTop: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.5 }}>
              A webhook confirms the payment after the gateway responds. The backend updates your subscription only after it verifies the gateway signature.
            </div>
          </div>
        </section>

        <aside className="panel" style={{ height: "fit-content", padding: "1.5rem" }}>
          <div className="section-title">Order Summary</div>
          <h2 className="section-heading" style={{ color: "var(--accent-strong)", marginTop: "0.35rem" }}>
            {plan.name}
          </h2>
          <p className="helper-text" style={{ marginTop: "0.5rem", marginBottom: "1.25rem" }}>{plan.blurb}</p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem", marginBottom: "1.5rem" }}>
            {plan.features.map((feature) => (
              <div key={feature} style={{ display: "flex", alignItems: "center", gap: "0.55rem", fontSize: "0.92rem" }}>
                <span style={{ color: "var(--success)" }}>✓</span>
                <span style={{ color: "var(--text-soft)" }}>{feature}</span>
              </div>
            ))}
          </div>

          <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1rem", display: "grid", gap: "0.6rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Subscription</span>
              <span>{plan.priceLabel}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Tax</span>
              <span>Included</span>
            </div>
            <div style={{ height: 1, background: "var(--border)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "var(--accent-strong)" }}>
              <span>Total due</span>
              <span>{plan.priceLabel}</span>
            </div>
          </div>

          <div className="panel-empty" style={{ marginTop: "1rem" }}>
            <div style={{ fontWeight: 700, marginBottom: "0.35rem" }}>Security model</div>
            <div style={{ color: "var(--text-soft)", lineHeight: 1.6 }}>
              Frontend requests a backend-created order, the gateway collects the payment, and the webhook confirms the subscription change.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="page" style={{ maxWidth: "1120px", margin: "0 auto", padding: "2rem" }}>Loading payment details...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}