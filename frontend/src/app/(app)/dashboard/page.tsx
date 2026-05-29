"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";

type DashboardResponse = {
  totalSessions: number;
  totalXP: number;
  level: number;
  totalVolumeKg: number;
  weeklyVolumeKg: number;
  streak?: number;
  streakFreezes?: number;
  streakFreezeAvailable?: boolean;
  levelProgress?: {
    level: number;
    progress: number;
    currentMin: number;
    nextMin: number | null;
  };
  badges?: Array<{
    id: string;
    name: string;
    description?: string | null;
    icon?: string | null;
    earnedAt: string;
  }>;
  missions?: Array<{
    id: string;
    description?: string | null;
    xp_reward?: number | null;
    is_completed: boolean;
    mission_date: string;
  }>;
  weeklyChallenge?: {
    title: string;
    description: string;
    targetVolumeKg: number;
    currentVolumeKg: number;
  };
  monthlyChallenge?: {
    title: string;
    description: string;
    targetSessions: number;
    currentSessions: number;
    shareText?: string;
  };
  recentSessions: Array<{
    id: string;
    muscle: string;
    date: string;
    volume: number;
    xp: number;
    sets: number;
  }>;
  heatmapData?: number[];
};

type RecoveryResponse = {
  recovery: Record<string, number>;
};

type PredictiveResponse = {
  generatedAt: string;
  strengthForecasts: Array<{
    exerciseName: string;
    current1Rm: number;
    projected1Rm: number;
    weeklyGain: number;
    sampleCount: number;
    targetDate: string;
    trend: string;
  }>;
  consistency: {
    daysAnalyzed: number;
    sessionsLogged: number;
    weeklyAverage: number;
    mostSkippedDay: string;
    streakContinuationProbability: number;
    insight: string;
  };
  plateauInsights: Array<{
    exerciseName: string;
    daysSinceLastPR: number;
    suggestion: string;
    current1Rm: number;
  }>;
  bodyProjection: {
    latestWeightKg: number | null;
    latestBodyFatPct: number | null;
    projectedWeightKg: number | null;
    projectedBodyFatPct: number | null;
    projectedDate: string;
    divergingFromGoal: boolean;
  } | null;
  bodyRecommendation: string;
  summaryCards: Array<{
    label: string;
    value: string;
    note: string;
  }>;
};

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

const HEATMAP_DATA = Array.from({ length: 26 * 7 }, (_, index) => {
  const rng = Math.sin(index * 9301 + 49297) * 0.5 + 0.5;
  if (rng > 0.82) return 3;
  if (rng > 0.65) return 2;
  if (rng > 0.52) return 1;
  return 0;
});

const heatmapColor = (value: number) => {
  if (value === 0) return "rgba(255,255,255,0.04)";
  if (value === 1) return "rgba(208, 162, 74, 0.26)";
  if (value === 2) return "rgba(208, 162, 74, 0.5)";
  return "linear-gradient(135deg, #b33a1f, #f0c46d)";
};

function formatMuscleName(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000)));

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
}

function getSessionToken() {
  return typeof window === "undefined" ? "" : window.localStorage.getItem("nextyra-session-token") ?? "";
}

function getDailyBrief(day: number, bestRecoveryMuscle: string, totalSessions: number) {
  const playbook = [
    `Open with intention. ${bestRecoveryMuscle} is your best recovery window today.`,
    `Your edge today is consistency. Keep the streak alive even if the session is short.`,
    `Focus on quality reps. Precision today beats random volume.`,
    `Your dashboard should drive action, not decoration. Log one meaningful session today.`,
    `Momentum compounds. Use today's session to reinforce your weekly goal.`,
    `If energy is low, reduce friction and win with a shorter workout.`,
    `Review, recover, reset. Use today to plan the next strong block.`,
  ];

  const summary =
    totalSessions === 0
      ? "Start with your first tracked session to unlock real recovery and progress signals."
      : `You have ${totalSessions} tracked sessions so far. The more you log, the smarter the dashboard gets.`;

  return {
    title: playbook[day % playbook.length],
    summary,
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [recovery, setRecovery] = useState<Record<string, number>>({});
  const [predictive, setPredictive] = useState<PredictiveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingPlan, setSubmittingPlan] = useState<string | null>(null);
  const [completingMissionId, setCompletingMissionId] = useState<string | null>(null);
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

  async function completeMission(missionId: string) {
    const token = getSessionToken();
    if (!token) return;

    setCompletingMissionId(missionId);
    try {
      await apiFetch(`/api/missions/${missionId}/complete`, {
        method: "PATCH",
        body: JSON.stringify({ token }),
      });
      window.location.reload();
    } catch (err) {
      console.error("Mission completion failed:", err);
    } finally {
      setCompletingMissionId(null);
    }
  }

  const [checkedIn, setCheckedIn] = useState<boolean>(true);
  const [showCheckinModal, setShowCheckinModal] = useState<boolean>(false);
  const [energyLevel, setEnergyLevel] = useState<number>(3);
  const [stressLevel, setStressLevel] = useState<number>(3);
  const [sleepQuality, setSleepQuality] = useState<number>(3);
  const [checkinNotes, setCheckinNotes] = useState<string>("");
  const [submittingCheckin, setSubmittingCheckin] = useState<boolean>(false);
  const [adaptationMessage, setAdaptationMessage] = useState<string | null>(null);
  const [todayCheckin, setTodayCheckin] = useState<any>(null);

  async function handleCheckin(e: React.FormEvent) {
    e.preventDefault();
    const token = getSessionToken();
    if (!token) return;

    setSubmittingCheckin(true);
    try {
      const res = await apiFetch<{ success: boolean; checkin: any; adaptation: { note: string } }>("/api/lifestyle/checkin", {
        method: "POST",
        body: JSON.stringify({
          token,
          energyLevel,
          stressLevel,
          sleepQuality,
          freeText: checkinNotes,
        }),
      });

      if (res.success) {
        setCheckedIn(true);
        setTodayCheckin(res.checkin);
        setShowCheckinModal(false);
        setAdaptationMessage(res.adaptation.note);
        
        const freshDashboard = await apiFetch<DashboardResponse>(`/api/dashboard?token=${encodeURIComponent(token)}`);
        setDashboard(freshDashboard);
        const freshPredictive = await apiFetch<PredictiveResponse>(`/api/agents/predictive?token=${encodeURIComponent(token)}`);
        setPredictive(freshPredictive);
        const freshRecovery = await apiFetch<RecoveryResponse>(`/api/agents/recovery?token=${encodeURIComponent(token)}`);
        setRecovery(freshRecovery.recovery);
      }
    } catch (err) {
      console.error("Check-in submission failed:", err);
    } finally {
      setSubmittingCheckin(false);
    }
  }

  useEffect(() => {
    const token = getSessionToken();
    if (!token) return;

    Promise.all([
      apiFetch<DashboardResponse>(`/api/dashboard?token=${encodeURIComponent(token)}`),
      apiFetch<RecoveryResponse>(`/api/agents/recovery?token=${encodeURIComponent(token)}`),
      apiFetch<PredictiveResponse>(`/api/agents/predictive?token=${encodeURIComponent(token)}`),
      apiFetch<{ checkedIn: boolean; checkin: any }>(`/api/lifestyle/today?token=${encodeURIComponent(token)}`),
    ])
      .then(([dashboardResponse, recoveryResponse, predictiveResponse, checkinResponse]) => {
        setDashboard(dashboardResponse);
        setRecovery(recoveryResponse.recovery);
        setPredictive(predictiveResponse);
        setCheckedIn(checkinResponse.checkedIn);
        setTodayCheckin(checkinResponse.checkin);
        if (!checkinResponse.checkedIn) {
          setShowCheckinModal(true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const bestRecovery = useMemo(() => {
    const entries = Object.entries(recovery);
    if (!entries.length) return { muscle: "Legs", score: 100 };
    const [muscle, score] = entries.sort((a, b) => b[1] - a[1])[0];
    return { muscle: formatMuscleName(muscle), score };
  }, [recovery]);

  const dailyBrief = useMemo(() => {
    return getDailyBrief(new Date().getDay(), bestRecovery.muscle, dashboard?.totalSessions ?? 0);
  }, [bestRecovery.muscle, dashboard?.totalSessions]);

  const xp = dashboard?.totalXP ?? 0;
  const level = dashboard?.level ?? 1;
  const progress = dashboard?.levelProgress?.progress ?? 0;
  const nextLevelXp = dashboard?.levelProgress?.nextMin ?? null;
  const weeklyVolume = dashboard?.weeklyVolumeKg ?? 0;

  const renderCheckinModal = () => {
    if (!showCheckinModal) return null;

    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(10, 10, 10, 0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1.5rem",
      }}>
        <div className="panel" style={{
          maxWidth: "500px",
          width: "100%",
          padding: "2rem",
          background: "var(--bg-panel)",
          border: "1px solid var(--border-strong)",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          boxShadow: "var(--shadow-lg)",
        }}>
          <div>
            <div className="hero-eyebrow pill" style={{ display: "inline-block", marginBottom: "0.5rem" }}>
              ☀️ Good Morning Check-in
            </div>
            <h2 className="section-heading" style={{ color: "var(--accent-strong)", margin: 0 }}>
              How are you feeling today?
            </h2>
            <p className="helper-text" style={{ marginTop: "0.4rem" }}>
              Let PulsePilot optimize today's training split and intensity weights based on your readiness.
            </p>
          </div>

          <form onSubmit={handleCheckin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-soft)", display: "flex", justifyContent: "space-between" }}>
                <span>⚡ Energy Level</span>
                <span style={{ color: "var(--accent)" }}>{energyLevel}/5</span>
              </label>
              <div style={{ display: "flex", gap: "0.5rem", width: "100%" }}>
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setEnergyLevel(val)}
                    style={{
                      flex: 1,
                      padding: "0.6rem 0.5rem",
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: energyLevel === val ? "var(--accent)" : "var(--border)",
                      background: energyLevel === val ? "var(--bg-strong)" : "transparent",
                      color: energyLevel === val ? "var(--accent-strong)" : "var(--text-soft)",
                      fontWeight: energyLevel === val ? "bold" : "normal",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      transition: "all 150ms ease",
                    }}
                  >
                    {["😴", "🥱", "😐", "⚡", "🔥"][val - 1]} {val}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-soft)", display: "flex", justifyContent: "space-between" }}>
                <span>🤯 Stress Level</span>
                <span style={{ color: "var(--accent)" }}>{stressLevel}/5</span>
              </label>
              <div style={{ display: "flex", gap: "0.5rem", width: "100%" }}>
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setStressLevel(val)}
                    style={{
                      flex: 1,
                      padding: "0.6rem 0.5rem",
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: stressLevel === val ? "var(--accent)" : "var(--border)",
                      background: stressLevel === val ? "var(--bg-strong)" : "transparent",
                      color: stressLevel === val ? "var(--accent-strong)" : "var(--text-soft)",
                      fontWeight: stressLevel === val ? "bold" : "normal",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      transition: "all 150ms ease",
                    }}
                  >
                    {["🧘", "🙂", "😐", "😰", "🌋"][val - 1]} {val}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-soft)", display: "flex", justifyContent: "space-between" }}>
                <span>🌙 Sleep Quality</span>
                <span style={{ color: "var(--accent)" }}>{sleepQuality}/5</span>
              </label>
              <div style={{ display: "flex", gap: "0.5rem", width: "100%" }}>
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSleepQuality(val)}
                    style={{
                      flex: 1,
                      padding: "0.6rem 0.5rem",
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: sleepQuality === val ? "var(--accent)" : "var(--border)",
                      background: sleepQuality === val ? "var(--bg-strong)" : "transparent",
                      color: sleepQuality === val ? "var(--accent-strong)" : "var(--text-soft)",
                      fontWeight: sleepQuality === val ? "bold" : "normal",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      transition: "all 150ms ease",
                    }}
                  >
                    {["☠️", "🥱", "😴", "💤", "👑"][val - 1]} {val}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-soft)" }}>
                📝 Lifestyle Notes / Context
              </label>
              <textarea
                value={checkinNotes}
                onChange={(e) => setCheckinNotes(e.target.value)}
                placeholder="e.g., Sore calves, rough night sleep, heavy workload today..."
                rows={3}
                style={{
                  width: "100%",
                  background: "rgba(255, 255, 255, 0.02)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "0.75rem",
                  fontSize: "0.9rem",
                  outline: "none",
                  resize: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowCheckinModal(false)}
                style={{ flex: 1, justifyContent: "center" }}
              >
                Skip for now
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={submittingCheckin}
                style={{ flex: 1, justifyContent: "center" }}
              >
                {submittingCheckin ? "Optimizing..." : "Log Check-in"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      {renderCheckinModal()}

      {adaptationMessage && (
        <section className="panel" style={{
          background: "linear-gradient(135deg, rgba(208, 162, 74, 0.12), rgba(179, 58, 31, 0.08))",
          border: "1px solid var(--border-strong)",
          padding: "1.25rem 1.5rem",
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          animation: "fadeIn 300ms ease",
        }}>
          <span style={{ fontSize: "1.5rem" }}>🤖</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase", color: "var(--accent-strong)", letterSpacing: "0.05em" }}>
              PulsePilot Adaptation Active
            </div>
            <p style={{ fontSize: "0.95rem", color: "var(--text)", marginTop: "0.2rem", lineHeight: 1.4 }}>
              {adaptationMessage}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAdaptationMessage(null)}
            style={{
              background: "transparent",
              border: 0,
              color: "var(--text-soft)",
              cursor: "pointer",
              fontSize: "1.1rem",
              padding: "0.25rem",
            }}
          >
            ✕
          </button>
        </section>
      )}

      <section className="hero-panel">
        <div className="hero-grid">
          <div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap" }}>
              <div className="hero-eyebrow pill">Daily training brief</div>
              <div className="hero-eyebrow pill" style={{ background: "var(--bg-strong)", color: "var(--accent-strong)", borderColor: "var(--border-strong)", borderWidth: "1px", borderStyle: "solid", fontWeight: 700 }}>
                {formatTier(user?.subscriptionTier)}
              </div>
            </div>
            <h1 className="hero-title gradient-text">{dailyBrief.title}</h1>
            <p className="hero-copy">
              {dailyBrief.summary} {user ? `Current goal: ${user.goal}.` : ""}
            </p>
            <div className="hero-actions">
              <Link href="/workout/new" className="primary-button">
                Start today&apos;s workout
              </Link>
              <Link href="/history" className="secondary-button">
                Review training history
              </Link>
            </div>
            <div className="summary-grid">
              <span className="pill">
                <strong>{bestRecovery.muscle}</strong> is most recovered
              </span>
              <span className="pill">{weeklyVolume.toLocaleString()} kg logged this week</span>
              {typeof dashboard?.streakFreezes === "number" ? <span className="pill">{dashboard.streakFreezes} streak freeze(s)</span> : null}
              {dashboard?.streakFreezeAvailable ? <span className="pill">Streak freeze unlocked</span> : null}
            </div>
          </div>

          <div className="hero-stats">
            {checkedIn && todayCheckin ? (
              <div className="mini-stat" style={{ border: "1px solid var(--border-strong)", background: "rgba(208, 162, 74, 0.04)" }}>
                <div className="mini-stat-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Daily Readiness</span>
                  <button type="button" onClick={() => setShowCheckinModal(true)} style={{ background: "transparent", border: 0, color: "var(--accent)", fontSize: "0.75rem", cursor: "pointer", fontWeight: "bold" }}>Update</button>
                </div>
                <div style={{ display: "flex", gap: "0.8rem", marginTop: "0.6rem", alignItems: "center" }}>
                  <div style={{ fontSize: "1.5rem" }}>
                    {todayCheckin.energyLevel >= 4 ? "🔥" : todayCheckin.energyLevel <= 2 ? "🥱" : "⚡"}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.95rem", fontWeight: "bold" }}>
                      Energy: {todayCheckin.energyLevel}/5 • Stress: {todayCheckin.stressLevel}/5
                    </div>
                    <div className="helper-text" style={{ fontSize: "0.78rem" }}>
                      Sleep: {todayCheckin.sleepQuality}/5 {todayCheckin.notes ? `• "${todayCheckin.notes}"` : ""}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mini-stat" style={{ border: "1px dashed var(--border-strong)", cursor: "pointer", background: "rgba(208, 162, 74, 0.02)" }} onClick={() => setShowCheckinModal(true)}>
                <div className="mini-stat-label">Daily Readiness</div>
                <div className="mini-stat-value" style={{ fontSize: "1.2rem", color: "var(--accent)", marginTop: "0.4rem" }}>
                  ⚠️ Check-in pending
                </div>
                <div className="helper-text">Click to optimize today's split and intensity.</div>
              </div>
            )}
            <div className="mini-stat">
              <div className="mini-stat-label">Readiness focus</div>
              <div className="mini-stat-value is-accent">{bestRecovery.score}%</div>
              <div className="helper-text">{bestRecovery.muscle} is currently your strongest recovery window.</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat-label">Weekly load</div>
              <div className="mini-stat-value">{(weeklyVolume / 1000).toFixed(1)}K</div>
              <div className="helper-text">Tracked from completed sessions in the last 7 days.</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat-label">Momentum</div>
              <div className="mini-stat-value is-warm">+{xp}</div>
              <div className="helper-text">Every completed set now feeds XP, history, and readiness.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="section-title">Predictive intelligence</div>
            <div className="section-heading">Live forecast signals from your recent training data</div>
          </div>
          <div className="pill">Updated {predictive?.generatedAt ? new Date(predictive.generatedAt).toLocaleDateString() : "recently"}</div>
        </div>

        <div className="summary-grid" style={{ marginBottom: "1rem" }}>
          {predictive?.summaryCards?.map((card) => (
            <div key={card.label} className="summary-card">
              <div className="metric-label">{card.label}</div>
              <div className="metric-value" style={{ fontSize: "1.5rem" }}>{card.value}</div>
              <div className="helper-text" style={{ marginTop: "0.4rem" }}>{card.note}</div>
            </div>
          ))}
        </div>

        <div className="feature-spotlight-grid">
          <div className="feature-story-card">
            <div className="feature-kicker">Strength progression</div>
            <p className="feature-story-copy">
              {predictive?.strengthForecasts?.[0]
                ? `${predictive.strengthForecasts[0].exerciseName}: ${predictive.strengthForecasts[0].current1Rm} kg now, ${predictive.strengthForecasts[0].projected1Rm} kg projected by ${new Date(predictive.strengthForecasts[0].targetDate).toLocaleDateString()}.`
                : "Log more sets to unlock lift-by-lift projection estimates."}
            </p>
          </div>
          <div className="feature-story-card">
            <div className="feature-kicker">Consistency trend</div>
            <p className="feature-story-copy">{predictive?.consistency?.insight ?? "Your workout frequency pattern will appear here once enough history is available."}</p>
          </div>
          <div className="feature-story-card">
            <div className="feature-kicker">Body projection</div>
            <p className="feature-story-copy">{predictive?.bodyRecommendation ?? "Add body metrics to see projected weight and body-fat direction."}</p>
          </div>
        </div>
      </section>

      <section className="panel feature-spotlight">
        <div className="panel-header">
          <div>
            <div className="section-title">Premium differentiator</div>
            <div className="section-heading">PulsePilot turns mood and readiness into today&apos;s workout plan</div>
          </div>
          <Link href="/workout/new" className="primary-button">
            Try PulsePilot
          </Link>
        </div>
        <div className="feature-spotlight-grid">
          <div className="feature-story-card">
            <div className="feature-kicker">Why users subscribe</div>
            <p className="feature-story-copy">
              Most fitness apps only store logs. PulsePilot changes the actual workout based on stress, soreness, confidence, and recovery so the product feels like a daily coaching system.
            </p>
          </div>
          <div className="feature-story-card">
            <div className="feature-kicker">What it changes</div>
            <div className="plan-feature-list">
              <span className="pill">Intensity mode</span>
              <span className="pill">Exercise choice</span>
              <span className="pill">Set and rep structure</span>
              <span className="pill">Daily motivation angle</span>
            </div>
          </div>
          <div className="feature-story-card">
            <div className="feature-kicker">Best fit</div>
            <p className="feature-story-copy">
              This is strongest for users who train consistently but do not want a rigid program on low-energy days or random guesses on high-energy days.
            </p>
          </div>
        </div>
      </section>

      <section className="kpi-grid">
        <div className="panel kpi-card">
          <div className="kpi-label">Total sessions</div>
          <div className="kpi-value">{loading ? "..." : dashboard?.totalSessions ?? 0}</div>
          <div className="helper-text">Completed workouts stored in the system.</div>
        </div>
        <div className="panel kpi-card">
          <div className="kpi-label">Level and XP</div>
          <div className="kpi-value">Level {level}</div>
          <div className="helper-text">{xp.toLocaleString()} XP accumulated{nextLevelXp ? ` • next target ${nextLevelXp.toLocaleString()} XP` : ""}</div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
          </div>
        </div>
        <div className="panel kpi-card">
          <div className="kpi-label">Recovery window</div>
          <div className="kpi-value">{bestRecovery.muscle}</div>
          <div className="kpi-trend">{bestRecovery.score}% ready for your next focused session</div>
        </div>
        <div className="panel kpi-card">
          <div className="kpi-label">Total volume</div>
          <div className="kpi-value">{((dashboard?.totalVolumeKg ?? 0) / 1000).toFixed(1)}K</div>
          <div className="helper-text">All tracked volume across completed sessions.</div>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="section-title">Daily missions</div>
              <div className="section-heading">Three targeted wins for today</div>
            </div>
            <div className="panel-note">Each mission is worth XP and resets daily.</div>
          </div>
          <div className="sessions-grid">
            {(dashboard?.missions ?? []).map((mission) => (
              <article className="session-card" key={mission.id}>
                <div className="session-top">
                  <div className="session-title">{mission.is_completed ? "Completed" : "Active"}</div>
                  <div className="pill">+{mission.xp_reward ?? 75} XP</div>
                </div>
                <p className="helper-text" style={{ marginTop: "0.5rem" }}>{mission.description}</p>
                {!mission.is_completed ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => completeMission(mission.id)}
                    disabled={completingMissionId === mission.id}
                    style={{ marginTop: "1rem", width: "100%", justifyContent: "center" }}
                  >
                    {completingMissionId === mission.id ? "Completing..." : "Mark complete"}
                  </button>
                ) : null}
              </article>
            ))}
            {!loading && !(dashboard?.missions?.length ?? 0) ? <div className="panel-empty">No missions generated yet.</div> : null}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="section-title">Badges</div>
              <div className="section-heading">Earned achievements</div>
            </div>
          </div>
          <div className="plan-feature-list" style={{ marginBottom: "1rem" }}>
            {(dashboard?.badges ?? []).length ? dashboard?.badges?.map((badge) => (
              <span key={badge.id} className="pill">{badge.icon ?? "🏅"} {badge.name}</span>
            )) : <span className="pill">No badges yet</span>}
          </div>
          <div className="helper-text">
            Unlocks are automatic once you hit the underlying condition, and the system keeps the badge history for your profile.
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="section-title">Challenge board</div>
            <div className="section-heading">Weekly fitness challenge</div>
          </div>
        </div>
        <div className="feature-story-card">
          <div className="feature-kicker">{dashboard?.weeklyChallenge?.title ?? "Weekly challenge"}</div>
          <p className="feature-story-copy">{dashboard?.weeklyChallenge?.description ?? "Log more volume this week to generate a challenge."}</p>
          {dashboard?.weeklyChallenge ? (
            <div className="progress-track" style={{ marginTop: "1rem" }}>
              <div
                className="progress-fill"
                style={{ width: `${Math.max(0, Math.min(100, (dashboard.weeklyChallenge.currentVolumeKg / Math.max(1, dashboard.weeklyChallenge.targetVolumeKg)) * 100))}%` }}
              />
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="section-title">Monthly challenge</div>
            <div className="section-heading">Long-range progression goal</div>
          </div>
        </div>
        <div className="feature-story-card">
          <div className="feature-kicker">{dashboard?.monthlyChallenge?.title ?? "Monthly challenge"}</div>
          <p className="feature-story-copy">{dashboard?.monthlyChallenge?.description ?? "Monthly challenges are generated from your 30-day trend."}</p>
          {dashboard?.monthlyChallenge ? (
            <div className="progress-track" style={{ marginTop: "1rem" }}>
              <div
                className="progress-fill"
                style={{ width: `${Math.max(0, Math.min(100, (dashboard.monthlyChallenge.currentSessions / Math.max(1, dashboard.monthlyChallenge.targetSessions)) * 100))}%` }}
              />
            </div>
          ) : null}
          {dashboard?.monthlyChallenge?.shareText ? <div className="helper-text" style={{ marginTop: "0.75rem" }}>{dashboard.monthlyChallenge.shareText}</div> : null}
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="section-title">Pattern analysis</div>
              <div className="section-heading">Consistency heatmap</div>
            </div>
            <div className="panel-note">A compact rhythm view to reinforce daily accountability.</div>
          </div>
          <div className="heatmap">
            {Array.from({ length: 26 }).map((_, week) => (
              <div key={week} className="heatmap-week">
                {Array.from({ length: 7 }).map((_, day) => {
                  const value = (dashboard?.heatmapData && dashboard.heatmapData[week * 7 + day]) || 0;
                  return <div key={day} className="heatmap-cell" style={{ background: heatmapColor(value) }} />;
                })}
              </div>
            ))}
          </div>
          <div className="legend">
            <span>Light</span>
            <span className="heatmap-cell" style={{ width: "0.8rem", background: heatmapColor(0) }} />
            <span className="heatmap-cell" style={{ width: "0.8rem", background: heatmapColor(1) }} />
            <span className="heatmap-cell" style={{ width: "0.8rem", background: heatmapColor(2) }} />
            <span className="heatmap-cell" style={{ width: "0.8rem", background: heatmapColor(3) }} />
            <span>Dense</span>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="section-title">Readiness map</div>
              <div className="section-heading">Muscle recovery</div>
            </div>
          </div>
          <div className="recovery-list">
            {Object.entries(recovery).map(([muscle, score]) => (
              <div className="recovery-row" key={muscle}>
                <div>
                  <div style={{ fontWeight: 700 }}>{formatMuscleName(muscle)}</div>
                  <div className="helper-text">Recovery estimate from your recent logged workload.</div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${score}%` }} />
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem" }}>{score}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="section-title">Recent output</div>
            <div className="section-heading">Latest training sessions</div>
          </div>
          <Link href="/history" className="ghost-button">
            See full history
          </Link>
        </div>
        <div className="sessions-grid">
          {(dashboard?.recentSessions ?? []).map((session) => (
            <article className="session-card" key={session.id}>
              <div className="session-top">
                <div className="session-title">{formatMuscleName(session.muscle)} day</div>
                <div className="pill">+{session.xp} XP</div>
              </div>
              <div className="timeline-date" style={{ marginTop: "0.35rem" }}>
                {formatRelativeDate(session.date)}
              </div>
              <div className="session-stats">
                <div className="summary-card">
                  <div className="metric-label">Volume</div>
                  <div className="metric-value">{session.volume.toLocaleString()} kg</div>
                </div>
                <div className="summary-card">
                  <div className="metric-label">Sets</div>
                  <div className="metric-value">{session.sets}</div>
                </div>
                <div className="summary-card">
                  <div className="metric-label">Status</div>
                  <div className="metric-value">Complete</div>
                </div>
              </div>
            </article>
          ))}
          {!loading && !(dashboard?.recentSessions.length ?? 0) ? (
            <div className="panel-empty">No completed sessions yet. Log your first workout to bring this dashboard to life.</div>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="section-title">Plans</div>
            <div className="section-heading">Simple pricing for a real product path</div>
          </div>
          <div className="panel-note">Reasonable early-stage pricing that leaves room to grow with usage.</div>
        </div>

        {paymentError && (
          <div className="auth-error" style={{ marginBottom: "2rem", textAlign: "center", padding: "1rem", borderRadius: "8px", background: "rgba(220, 38, 38, 0.1)", border: "1px solid var(--danger)", color: "var(--danger)" }}>
            {paymentError}
          </div>
        )}

        <div className="plans-grid">
          {MEMBERSHIP_PLANS.map((plan) => {
            const isCurrent = user?.subscriptionTier === plan.id;
            return (
              <article key={plan.name} className="plan-card" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <div className="plan-name">{plan.name}</div>
                <div className="plan-price">{plan.price}</div>
                <p className="helper-text" style={{ lineHeight: 1.6, marginBottom: "1rem" }}>{plan.blurb}</p>
                <div className="plan-feature-list" style={{ marginBottom: "2rem" }}>
                  {plan.features.map((feature) => (
                    <span key={feature} className="pill">{feature}</span>
                  ))}
                </div>
                <div style={{ marginTop: "auto" }}>
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
      </section>
    </div>
  );
}
