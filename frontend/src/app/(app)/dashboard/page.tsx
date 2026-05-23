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
  recentSessions: Array<{
    id: string;
    muscle: string;
    date: string;
    volume: number;
    xp: number;
    sets: number;
  }>;
};

type RecoveryResponse = {
  recovery: Record<string, number>;
};

const MEMBERSHIP_PLANS = [
  {
    name: "Lift Start",
    price: "$9/mo",
    blurb: "For solo lifters who want smart logging and daily motivation.",
    features: ["Workout logging", "History and XP", "Daily training brief"],
  },
  {
    name: "Momentum Pro",
    price: "$19/mo",
    blurb: "For serious gym users who want PulsePilot adapting the workout to how they actually feel.",
    features: ["PulsePilot agent", "Recovery dashboard", "Adaptive day plans"],
  },
  {
    name: "Coach Console",
    price: "$49/mo",
    blurb: "For trainers managing clients with structure, accountability, and shared plans.",
    features: ["Multi-athlete support", "Client progress view", "Program oversight"],
  },
];

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getSessionToken();
    if (!token) return;

    Promise.all([
      apiFetch<DashboardResponse>(`/api/dashboard?token=${encodeURIComponent(token)}`),
      apiFetch<RecoveryResponse>(`/api/agents/recovery?token=${encodeURIComponent(token)}`),
    ])
      .then(([dashboardResponse, recoveryResponse]) => {
        setDashboard(dashboardResponse);
        setRecovery(recoveryResponse.recovery);
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
  const currentLevelXp = (level - 1) * 500;
  const nextLevelXp = level * 500;
  const progress = nextLevelXp === currentLevelXp ? 0 : ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
  const weeklyVolume = dashboard?.weeklyVolumeKg ?? 0;

  return (
    <div className="page">
      <section className="hero-panel">
        <div className="hero-grid">
          <div>
            <div className="hero-eyebrow pill">Daily training brief</div>
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
            </div>
          </div>

          <div className="hero-stats">
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
          <div className="kpi-value">{level}</div>
          <div className="helper-text">{xp.toLocaleString()} XP accumulated</div>
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
              <div className="section-title">Pattern analysis</div>
              <div className="section-heading">Consistency heatmap</div>
            </div>
            <div className="panel-note">A compact rhythm view to reinforce daily accountability.</div>
          </div>
          <div className="heatmap">
            {Array.from({ length: 26 }).map((_, week) => (
              <div key={week} className="heatmap-week">
                {Array.from({ length: 7 }).map((_, day) => {
                  const value = HEATMAP_DATA[week * 7 + day];
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
        <div className="plans-grid">
          {MEMBERSHIP_PLANS.map((plan) => (
            <article key={plan.name} className="plan-card">
              <div className="plan-name">{plan.name}</div>
              <div className="plan-price">{plan.price}</div>
              <p className="helper-text" style={{ lineHeight: 1.6 }}>{plan.blurb}</p>
              <div className="plan-feature-list">
                {plan.features.map((feature) => (
                  <span key={feature} className="pill">{feature}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
