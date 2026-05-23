"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type Session = {
  id: string;
  muscleGroup: string;
  completedAt: string;
  totalVolumeKg?: number;
  xpEarned?: number;
  sets: Array<{
    exerciseName: string;
    weight: number;
    reps: number;
    setNumber: number;
  }>;
};

function formatRelativeDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatMuscleName(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    const token = window.localStorage.getItem("nextyra-session-token");
    if (!token) return;

    apiFetch<{ sessions: Session[] }>(`/api/sessions?token=${encodeURIComponent(token)}`).then((response) => {
      setSessions(response.sessions);
    });
  }, []);

  const totals = useMemo(() => {
    return sessions.reduce(
      (accumulator, session) => {
        accumulator.totalSessions += 1;
        accumulator.totalSets += session.sets.length;
        accumulator.totalVolume += session.totalVolumeKg ?? 0;
        accumulator.totalXP += session.xpEarned ?? 0;
        return accumulator;
      },
      { totalSessions: 0, totalSets: 0, totalVolume: 0, totalXP: 0 }
    );
  }, [sessions]);

  return (
    <div className="page">
      <section className="hero-panel">
        <div className="history-hero">
          <div>
            <div className="section-title">Training archive</div>
            <h1 className="hero-title" style={{ fontSize: "clamp(2rem, 3vw, 3.4rem)", maxWidth: "13ch" }}>
              Real sessions. Real volume. Real momentum.
            </h1>
            <p className="hero-copy">
              This page now reflects the workouts you actually complete, so progress feels earned instead of mocked up.
            </p>
          </div>
          <div className="section-actions">
            <Link href="/workout/new" className="primary-button">
              Log a new workout
            </Link>
          </div>
        </div>
      </section>

      <section className="kpi-grid">
        {[
          { label: "Total sessions", value: String(totals.totalSessions), note: "Saved from completed workouts" },
          { label: "Total sets", value: String(totals.totalSets), note: "All sets logged through the workout flow" },
          { label: "Total volume", value: `${(totals.totalVolume / 1000).toFixed(1)}K`, note: "Kilograms tracked across all sessions" },
          { label: "Total XP", value: totals.totalXP.toLocaleString(), note: "Earned from completed set volume" },
        ].map((item) => (
          <div className="panel kpi-card" key={item.label}>
            <div className="kpi-label">{item.label}</div>
            <div className="kpi-value">{item.value}</div>
            <div className="helper-text" style={{ marginTop: "0.65rem" }}>
              {item.note}
            </div>
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="section-title">Session timeline</div>
            <div className="section-heading">Recent workout history</div>
          </div>
        </div>

        <div className="history-list">
          {sessions.map((session) => (
            <article className="timeline-card" key={session.id}>
              <div className="timeline-layout">
                <div className="badge-box" style={{ background: "var(--bg-soft)", color: "var(--accent)", border: "1px solid var(--border-strong)" }}>
                  {session.muscleGroup.slice(0, 3).toUpperCase()}
                </div>

                <div>
                  <div className="timeline-top">
                    <div>
                      <div className="timeline-title">{formatMuscleName(session.muscleGroup)} focus session</div>
                      <div className="timeline-date">{formatRelativeDate(session.completedAt)}</div>
                    </div>
                    <div className="pill">+{session.xpEarned ?? 0} XP</div>
                  </div>
                  <div className="timeline-exercises">
                    {session.sets.map((set) => set.exerciseName).filter((value, index, values) => values.indexOf(value) === index).join(" • ")}
                  </div>
                </div>

                <div className="history-stats">
                  <div className="history-stat-box">
                    <div className="metric-label">Volume</div>
                    <div className="metric-value">{(session.totalVolumeKg ?? 0).toLocaleString()} kg</div>
                  </div>
                  <div className="history-stat-box">
                    <div className="metric-label">Sets</div>
                    <div className="metric-value">{session.sets.length}</div>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {!sessions.length ? <div className="panel-empty">No completed workouts yet. Log a session to build your history.</div> : null}
        </div>
      </section>
    </div>
  );
}
