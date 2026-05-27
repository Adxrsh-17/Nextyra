"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

type ExercisePlan = {
  name: string;
  sets: number;
  reps: number;
  weightKg: number | null;
};

type DayPlan = {
  day: number;
  muscleGroup: string;
  exercises: ExercisePlan[];
};

type OrchestrateResponse = {
  plan: DayPlan[];
  recovery: {
    recoveryMap: Record<string, number>;
    fatigueScores: Record<string, number>;
    overtrainedFlags: Record<string, boolean>;
    nextSafeDates: Record<string, string>;
    recommendDeload: boolean;
    cumulativeFatigue: number;
  };
  performanceFlags: Array<{
    exerciseName: string;
    flag_type: string;
    daysSinceLastPR: number;
  }>;
  underperformingMuscles: string[];
  mostSkippedDay: string;
  weeklyTargetSets: number;
  completedSetsPerMuscle: Record<string, number>;
  critic: {
    approved: boolean;
    issues: string[];
  };
  notes: string;
};

type MotivationResponse = {
  messages: string[];
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function readToken() {
  return typeof window === "undefined" ? "" : window.localStorage.getItem("nextyra-session-token") ?? "";
}

function formatTier(tier?: string | null) {
  if (!tier || tier === "free") return "Free Tier";
  if (tier === "lift_start") return "Lift Start Member";
  if (tier === "momentum_pro") return "Momentum Pro Member";
  if (tier === "coach_console") return "Coach Console Member";
  return tier.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const renderLockOverlay = (planName: string) => (
  <div style={{
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(10, 10, 10, 0.7)",
    backdropFilter: "blur(5px)",
    WebkitBackdropFilter: "blur(5px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    padding: "2rem",
    borderRadius: "12px",
    textAlign: "center",
    border: "1px solid rgba(255, 255, 255, 0.05)"
  }}>
    <div className="pill" style={{ background: "rgba(208, 162, 74, 0.15)", color: "var(--accent)", border: "1px solid var(--border-strong)", fontSize: "0.8rem", marginBottom: "1rem" }}>
      🔒 REQUIRES {planName.toUpperCase()}
    </div>
    <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text)" }}>Feature Locked</h3>
    <p style={{ fontSize: "0.85rem", color: "var(--text-soft)", maxWidth: "30ch", marginBottom: "1.25rem", lineHeight: 1.4 }}>
      Upgrade your plan to unlock real-time agent tracking and split optimizations.
    </p>
    <Link href="/billing" className="primary-button" style={{ fontSize: "0.8rem", padding: "0.5rem 1.25rem" }}>
      Upgrade Now
    </Link>
  </div>
);

export default function CoachCockpit() {
  const { user } = useAuth();
  const [data, setData] = useState<OrchestrateResponse | null>(null);
  const [motivation, setMotivation] = useState<MotivationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [adapting, setAdapting] = useState(false);
  const [error, setError] = useState("");
  const [energyLevel, setEnergyLevel] = useState(3); // 1-5
  const [lifestyleInput, setLifestyleInput] = useState("");

  const token = readToken();

  const isPro = user?.subscriptionTier === "momentum_pro" || user?.subscriptionTier === "coach_console";
  const isStart = user?.subscriptionTier === "lift_start";
  const isFree = !user?.subscriptionTier || user?.subscriptionTier === "free";

  async function loadData() {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const orchestrateRes = await apiFetch<OrchestrateResponse>(`/api/agents/orchestrator?token=${encodeURIComponent(token)}`, {
        method: "POST",
        body: JSON.stringify({ context: {} }),
      });
      const motivationRes = await apiFetch<MotivationResponse>(`/api/agents/motivation?token=${encodeURIComponent(token)}`);

      setData(orchestrateRes);
      setMotivation(motivationRes);
    } catch (err: any) {
      console.error("Failed to load coach metrics:", err);
      setError(err.message || "Unable to load multi-agent analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [token]);

  async function handleAdaptPlan() {
    if (!token || adapting) return;
    setAdapting(true);
    setError("");

    try {
      const result = await apiFetch<{ note: string }>(`/api/agents/adaptive?token=${encodeURIComponent(token)}`, {
        method: "POST",
        body: JSON.stringify({
          context: {
            skippedSessions: data?.underperformingMuscles.map(m => ({ muscleGroup: m })) ?? [],
            lifestyle: { energy: energyLevel, notes: lifestyleInput }
          }
        }),
      });

      // Reload fresh adapted plan
      await loadData();
      alert(`Plan successfully adapted: ${result.note}`);
    } catch (err: any) {
      console.error("Plan adaptation failed:", err);
      setError(err.message || "Failed to adapt workout splits.");
    } finally {
      setAdapting(false);
    }
  }

  if (loading) {
    return (
      <div className="page" style={{ justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div className="loading-spinner-wrapper" style={{ margin: "2rem auto", textAlign: "center" }}>
          <div className="spinner"></div>
          <h2 className="section-heading" style={{ color: "var(--accent)", marginTop: "1rem" }}>Orchestrating AI Agents...</h2>
          <p className="hero-copy" style={{ fontSize: "0.9rem" }}>PulsePilot is generating recovery maps, analyzing plateaus, and planning splits.</p>
        </div>
      </div>
    );
  }

  if (isFree) {
    return (
      <div className="page" style={{ maxWidth: "800px", margin: "4rem auto", textAlign: "center", gap: "2rem" }}>
        <section className="hero-panel" style={{ padding: "3rem 2rem", background: "linear-gradient(135deg, rgba(20, 20, 20, 0.8), rgba(10, 10, 10, 0.95))", border: "1px solid var(--border-strong)" }}>
          <div className="hero-eyebrow pill" style={{ display: "inline-block", marginBottom: "1.5rem" }}>🔒 Premium Feature</div>
          <h1 className="hero-title gradient-text" style={{ fontSize: "2.8rem", maxWidth: "none", marginBottom: "1rem" }}>PulsePilot AI Cockpit</h1>
          <p className="hero-copy" style={{ fontSize: "1.1rem", margin: "0 auto 2rem", maxWidth: "55ch" }}>
            The multi-agent training operations deck is reserved for upgraded members. Unlock real-time muscle fatigue tracking, performance plateau alerts, push/pull balance checks, and adaptive splits.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
            <Link href="/billing" className="primary-button" style={{ fontSize: "1rem", padding: "0.75rem 2rem" }}>
              View Upgrade Options
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: "1200px", margin: "0 auto", gap: "1.5rem" }}>
      <section className="hero-panel">
        <div className="history-hero" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1.5rem" }}>
          <div>
            <div className="hero-eyebrow pill">AI Agent Operations</div>
            <h1 className="hero-title gradient-text" style={{ fontSize: "2.4rem", maxWidth: "none" }}>PulsePilot Cockpit</h1>
            <p className="hero-copy" style={{ maxWidth: "60ch" }}>
              Your multi-agent coaching system. Specialized sub-agents analyze recovery, audit safety, track plateaus, and output dynamic day-to-day plan modifications.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignSelf: "center" }}>
            <div className="pill" style={{ background: "var(--bg-soft)", borderColor: "var(--border-strong)", borderWidth: "1px", borderStyle: "solid", textAlign: "center" }}>
              Orchestration Active • Cache Hits OK
            </div>
            <div className="pill" style={{ background: "var(--bg-strong)", color: "var(--accent-strong)", borderColor: "var(--border-strong)", borderWidth: "1px", borderStyle: "solid", textAlign: "center", fontWeight: "bold" }}>
              Status: {formatTier(user?.subscriptionTier)}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="auth-error" style={{ padding: "1rem", borderRadius: "8px", background: "rgba(220, 38, 38, 0.1)", border: "1px solid var(--danger)", color: "var(--danger)" }}>
          {error}
        </div>
      )}

      {/* Motivation Banner */}
      {motivation?.messages && motivation.messages.length > 0 && (
        <section className="panel" style={{ background: "linear-gradient(135deg, rgba(208, 162, 74, 0.08), rgba(179, 58, 31, 0.05))", border: "1px solid var(--border-strong)", padding: "1.5rem" }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.75rem" }}>
            <span className="pill" style={{ background: "var(--accent)", color: "#000", fontWeight: 700 }}>MOTIVATION AGENT</span>
            <span style={{ fontWeight: 700, color: "var(--text)" }}>Daily Coaching Brief</span>
          </div>
          <ul style={{ paddingLeft: "1.25rem", color: "var(--text-soft)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {motivation.messages.map((msg, i) => (
              <li key={i} style={{ lineHeight: 1.5 }}>{msg}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="content-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        
        {/* Critic Audits */}
        <section className="panel" style={{ position: "relative" }}>
          {isStart && renderLockOverlay("Momentum Pro")}
          <div className="panel-header">
            <div>
              <div className="section-title">Safety Check</div>
              <div className="section-heading">Critic Agent Audit</div>
            </div>
            <span className="pill" style={{ background: data?.critic.approved ? "rgba(111, 181, 99, 0.15)" : "rgba(220, 38, 38, 0.15)", color: data?.critic.approved ? "var(--success)" : "var(--danger)", border: `1px solid ${data?.critic.approved ? "var(--success)" : "var(--danger)"}` }}>
              {data?.critic.approved ? "APPROVED" : "CORRECTIONS PENDING"}
            </span>
          </div>
          
          <div style={{ marginTop: "1rem" }}>
            {data?.critic.issues && data.critic.issues.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {data.critic.issues.map((issue, idx) => (
                  <div key={idx} style={{ background: "rgba(220, 38, 38, 0.06)", border: "1px solid rgba(220, 38, 38, 0.15)", borderRadius: "8px", padding: "1rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                    <span style={{ color: "var(--danger)", fontWeight: "bold" }}>⚠️</span>
                    <p style={{ fontSize: "0.9rem", color: "var(--text-soft)", lineHeight: 1.4 }}>{issue}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--text-muted)", fontSize: "0.92rem" }}>
                ✔️ No safety, volume, or structural imbalances detected in your split. Plan approved!
              </div>
            )}
          </div>
        </section>

        {/* Plateaus & Targets */}
        <section className="panel" style={{ position: "relative" }}>
          {isStart && renderLockOverlay("Momentum Pro")}
          <div className="panel-header">
            <div>
              <div className="section-title">Performance Agent</div>
              <div className="section-heading">Plateaus & Volume Alerts</div>
            </div>
          </div>

          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="summary-card">
              <div className="metric-label">Most Skipped Day</div>
              <div className="metric-value" style={{ color: "var(--accent)" }}>{data?.mostSkippedDay || "None"}</div>
            </div>

            {data?.performanceFlags && data.performanceFlags.length > 0 ? (
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Detected Plateaus (No PR &gt; 21 days)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {data.performanceFlags.map((flag, i) => (
                    <div key={i} className="pill" style={{ width: "100%", justifyContent: "space-between", background: "rgba(208, 162, 74, 0.08)" }}>
                      <span>🏋️ <strong>{flag.exerciseName}</strong></span>
                      <span style={{ color: "var(--accent)" }}>Stalled: {flag.daysSinceLastPR}d</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pill" style={{ color: "var(--success)" }}>✔️ No training plateaus detected. Consistent progression!</div>
            )}

            {data?.underperformingMuscles && data.underperformingMuscles.length > 0 && (
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Under-Target Volume Muscles (&lt; {data.weeklyTargetSets} sets)</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {data.underperformingMuscles.map((muscle) => (
                    <span key={muscle} className="pill" style={{ background: "rgba(179, 58, 31, 0.1)", color: "var(--accent-warm)" }}>
                      {muscle.toUpperCase()} ({data.completedSetsPerMuscle[muscle] ?? 0} sets)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Detailed Recovery Map */}
      <section className="panel" style={{ position: "relative" }}>
        {isStart && renderLockOverlay("Momentum Pro")}
        <div className="panel-header">
          <div>
            <div className="section-title">Recovery Agent Map</div>
            <div className="section-heading">Detailed Fatigue & Safety Analytics</div>
          </div>
          {data?.recovery.recommendDeload && (
            <span className="pill" style={{ background: "rgba(208, 162, 74, 0.15)", color: "var(--accent-strong)", border: "1px solid var(--border-strong)", fontWeight: 700 }}>
              ⚠️ DELOAD WEEK RECOMMENDED (Fatigue: {data.recovery.cumulativeFatigue})
            </span>
          )}
        </div>

        <div className="recovery-list" style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
          {Object.entries(data?.recovery.recoveryMap ?? {}).map(([muscle, freshness]) => {
            const fatigueScore = data?.recovery.fatigueScores[muscle] ?? 0;
            const isOvertrained = data?.recovery.overtrainedFlags[muscle] ?? false;
            const nextSafe = data?.recovery.nextSafeDates[muscle];
            
            return (
              <div key={muscle} className="summary-card" style={{ padding: "1.25rem", border: isOvertrained ? "1px solid var(--danger)" : "1px solid var(--border)", position: "relative" }}>
                {isOvertrained && (
                  <span className="pill" style={{ position: "absolute", top: "0.75rem", right: "0.75rem", background: "rgba(220, 38, 38, 0.15)", color: "var(--danger)", fontSize: "0.7rem", fontWeight: 700 }}>
                    OVERTRAINED
                  </span>
                )}
                
                <div style={{ fontWeight: 700, fontSize: "1.1rem", textTransform: "capitalize", marginBottom: "0.5rem" }}>{muscle}</div>
                
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.85rem" }}>
                  <span style={{ color: "var(--text-soft)" }}>Freshness Score</span>
                  <span style={{ fontWeight: 700, color: freshness > 70 ? "var(--success)" : freshness > 35 ? "var(--accent)" : "var(--danger)" }}>{freshness}%</span>
                </div>
                
                <div className="progress-track" style={{ marginBottom: "0.75rem" }}>
                  <div className="progress-fill" style={{ width: `${freshness}%`, background: freshness > 70 ? "var(--success)" : freshness > 35 ? "var(--accent)" : "var(--danger)" }} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  <span>Fatigue Level:</span>
                  <span>{fatigueScore}%</span>
                </div>
                
                <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  📅 Next Safe: <span style={{ color: "var(--text-soft)" }}>{nextSafe ? new Date(nextSafe).toLocaleDateString() : "Ready"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Weekly Plan generated by Planner */}
      <section className="panel" style={{ position: "relative" }}>
        {isStart && renderLockOverlay("Momentum Pro")}
        <div className="panel-header">
          <div>
            <div className="section-title">Planner Agent Output</div>
            <div className="section-heading">Dynamic 7-Day Workout Split</div>
          </div>
        </div>

        <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
          {data?.plan && data.plan.map((day) => (
            <article key={day.day} className="summary-card" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
                <span style={{ fontWeight: 700, color: "var(--accent-strong)" }}>{DAY_NAMES[day.day]}</span>
                <span className="pill" style={{ fontSize: "0.75rem", textTransform: "uppercase" }}>{day.muscleGroup}</span>
              </div>
              <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, padding: 0, listStyle: "none" }}>
                {day.exercises.map((ex, i) => (
                  <li key={i} style={{ fontSize: "0.85rem", color: "var(--text-soft)", display: "flex", justifyContent: "space-between" }}>
                    <span>{ex.name}</span>
                    <span style={{ color: "var(--text-muted)" }}>{ex.sets}×{ex.reps}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* Adaptive Agent Split Rescheduler */}
      <section className="panel" style={{ padding: "1.5rem", position: "relative" }}>
        {isStart && renderLockOverlay("Momentum Pro")}
        <div className="panel-header">
          <div>
            <div className="section-title">Adaptive Planning Agent</div>
            <div className="section-heading">Reschedule Missed Workouts & Lifestyle Scaling</div>
          </div>
        </div>
        <p className="hero-copy" style={{ fontSize: "0.9rem", marginBlock: "0.5rem 1.5rem" }}>
          Deviated from your weekly plan or feeling high stress? Feed your current lifestyle scores below and let the Adaptive Agent automatically recalculate set structures, shift missed splits, and safely modify target weights.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>Current Energy Level (1-5)</label>
            <select className="search-field" style={{ width: "200px" }} value={energyLevel} onChange={(e) => setEnergyLevel(Number(e.target.value))}>
              <option value={1}>1 - Completely Exhausted</option>
              <option value={2}>2 - Fatigued / Stressed</option>
              <option value={3}>3 - Balanced energy</option>
              <option value={4}>4 - Feeling energetic</option>
              <option value={5}>5 - Max performance ready</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>Lifestyle Notes (Stressors/Soreness)</label>
            <input type="text" className="search-field" placeholder="e.g. Skipped chest day, very stressful week, lack of sleep" value={lifestyleInput} onChange={(e) => setLifestyleInput(e.target.value)} />
          </div>

          <button onClick={handleAdaptPlan} disabled={adapting} className="primary-button" style={{ minWidth: "180px", justifyContent: "center" }}>
            {adapting ? "Adapting Plan..." : "Trigger Adaptive Split"}
          </button>
        </div>
      </section>
    </div>
  );
}
