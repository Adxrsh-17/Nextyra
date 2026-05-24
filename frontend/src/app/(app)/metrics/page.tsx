"use client";

import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

type BodyMetric = {
  id: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  chestCm: number | null;
  waistCm: number | null;
  armCm: number | null;
  legCm: number | null;
  recordedAt: string;
};

type MetricsResponse = {
  metrics: BodyMetric[];
};

function getSessionToken() {
  return typeof window === "undefined" ? "" : window.localStorage.getItem("nextyra-session-token") ?? "";
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [weightKg, setWeightKg] = useState("");
  const [bodyFatPct, setBodyFatPct] = useState("");
  const [chestCm, setChestCm] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [armCm, setArmCm] = useState("");
  const [legCm, setLegCm] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = getSessionToken();

  function fetchMetrics() {
    if (!token) return;
    setLoading(true);
    apiFetch<MetricsResponse>(`/api/metrics?token=${encodeURIComponent(token)}`)
      .then((data) => {
        setMetrics(data.metrics);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchMetrics();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    if (!weightKg) {
      setError("Weight is required to submit a check-in.");
      setSubmitting(false);
      return;
    }

    try {
      await apiFetch("/api/metrics", {
        method: "POST",
        body: JSON.stringify({
          token,
          weightKg: parseFloat(weightKg),
          bodyFatPct: bodyFatPct ? parseFloat(bodyFatPct) : undefined,
          chestCm: chestCm ? parseFloat(chestCm) : undefined,
          waistCm: waistCm ? parseFloat(waistCm) : undefined,
          armCm: armCm ? parseFloat(armCm) : undefined,
          legCm: legCm ? parseFloat(legCm) : undefined,
        }),
      });

      setSuccess("Check-in saved successfully!");
      setWeightKg("");
      setBodyFatPct("");
      setChestCm("");
      setWaistCm("");
      setArmCm("");
      setLegCm("");
      fetchMetrics();
    } catch (submitError) {
      setError("Unable to save your metric details.");
    } finally {
      setSubmitting(false);
    }
  }

  const latestMetric = useMemo(() => {
    if (metrics.length === 0) return null;
    return metrics[metrics.length - 1];
  }, [metrics]);

  // Compute SVG coordinates for Weight Trend
  const weightChartData = useMemo(() => {
    const validMetrics = metrics.filter((m) => m.weightKg !== null);
    if (validMetrics.length === 0) return null;

    const width = 500;
    const height = 180;
    const padding = 30;

    const weights = validMetrics.map((m) => m.weightKg as number);
    const maxVal = Math.max(...weights);
    const minVal = Math.min(...weights);
    const valRange = maxVal - minVal === 0 ? 10 : maxVal - minVal;

    const points = validMetrics.map((m, i) => {
      const x = padding + (i / Math.max(validMetrics.length - 1, 1)) * (width - 2 * padding);
      const y = height - padding - (((m.weightKg as number) - minVal) / valRange) * (height - 2 * padding);
      return { x, y, value: m.weightKg as number, date: m.recordedAt };
    });

    let pathD = "";
    if (points.length > 1) {
      pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        pathD += ` L ${points[i].x} ${points[i].y}`;
      }
    }

    return { points, pathD, width, height };
  }, [metrics]);

  // Compute SVG coordinates for Body Fat Trend
  const bodyFatChartData = useMemo(() => {
    const validMetrics = metrics.filter((m) => m.bodyFatPct !== null);
    if (validMetrics.length === 0) return null;

    const width = 500;
    const height = 180;
    const padding = 30;

    const fats = validMetrics.map((m) => m.bodyFatPct as number);
    const maxVal = Math.max(...fats);
    const minVal = Math.min(...fats);
    const valRange = maxVal - minVal === 0 ? 5 : maxVal - minVal;

    const points = validMetrics.map((m, i) => {
      const x = padding + (i / Math.max(validMetrics.length - 1, 1)) * (width - 2 * padding);
      const y = height - padding - (((m.bodyFatPct as number) - minVal) / valRange) * (height - 2 * padding);
      return { x, y, value: m.bodyFatPct as number, date: m.recordedAt };
    });

    let pathD = "";
    if (points.length > 1) {
      pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        pathD += ` L ${points[i].x} ${points[i].y}`;
      }
    }

    return { points, pathD, width, height };
  }, [metrics]);

  if (loading && metrics.length === 0) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-card">
          <div className="auth-loading-mark">NX</div>
          <p>Loading check-ins and body dimensions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="hero-panel">
        <div className="history-hero">
          <div>
            <div className="section-title">Body composition</div>
            <h1 className="hero-title gradient-text" style={{ fontSize: "clamp(2rem, 3.5vw, 3.8rem)", maxWidth: "15ch" }}>
              Check-in and metric tracking.
            </h1>
            <p className="hero-copy">
              Log your body metrics periodically to calibrate training volumes and track changes in lean mass and dimensions.
            </p>
          </div>
        </div>
      </section>

      <div className="content-grid">
        <div className="page" style={{ gap: "1.25rem" }}>
          {/* Charts panel */}
          {metrics.length === 0 ? (
            <section className="panel" style={{ display: "grid", placeItems: "center", paddingBlock: "3rem" }}>
              <div className="panel-empty" style={{ maxWidth: "360px", textAlign: "center" }}>
                No metrics recorded yet. Complete your first check-in using the sidebar panel to see weight and body fat trends.
              </div>
            </section>
          ) : (
            <div style={{ display: "grid", gap: "1.25rem" }}>
              {/* Weight Trend Chart */}
              {weightChartData && (
                <section className="panel">
                  <div className="panel-header">
                    <div>
                      <div className="section-title">Timeline</div>
                      <div className="section-heading">Weight trend (kg)</div>
                    </div>
                    {latestMetric?.weightKg && (
                      <div className="pill" style={{ color: "var(--accent-warm)" }}>
                        Latest: {latestMetric.weightKg} kg
                      </div>
                    )}
                  </div>

                  <svg viewBox={`0 0 ${weightChartData.width} ${weightChartData.height}`} style={{ width: "100%", height: "auto" }}>
                    <line x1="30" y1="150" x2="470" y2="150" stroke="var(--border)" strokeWidth="1" />
                    <line x1="30" y1="90" x2="470" y2="90" stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4" />
                    <line x1="30" y1="30" x2="470" y2="30" stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4" />

                    {weightChartData.pathD && (
                      <>
                        <path d={weightChartData.pathD} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
                        <path d={`${weightChartData.pathD} L ${weightChartData.points[weightChartData.points.length - 1].x} 150 L ${weightChartData.points[0].x} 150 Z`} fill="url(#weight-gradient)" opacity="0.1" />
                      </>
                    )}

                    <defs>
                      <linearGradient id="weight-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {weightChartData.points.map((p, index) => (
                      <g key={index}>
                        <circle cx={p.x} cy={p.y} r="4.5" fill="#16110a" stroke="var(--accent)" strokeWidth="2.5" />
                        <text x={p.x} y={p.y - 10} textAnchor="middle" fill="var(--text)" fontSize="9" fontWeight="700">
                          {p.value}
                        </text>
                        <text x={p.x} y="165" textAnchor="middle" fill="var(--text-soft)" fontSize="8.5">
                          {formatDate(p.date)}
                        </text>
                      </g>
                    ))}
                  </svg>
                </section>
              )}

              {/* Body Fat Trend Chart */}
              {bodyFatChartData && (
                <section className="panel">
                  <div className="panel-header">
                    <div>
                      <div className="section-title">Timeline</div>
                      <div className="section-heading">Body fat percentage (%)</div>
                    </div>
                    {latestMetric?.bodyFatPct && (
                      <div className="pill" style={{ color: "var(--accent)" }}>
                        Latest: {latestMetric.bodyFatPct}%
                      </div>
                    )}
                  </div>

                  <svg viewBox={`0 0 ${bodyFatChartData.width} ${bodyFatChartData.height}`} style={{ width: "100%", height: "auto" }}>
                    <line x1="30" y1="150" x2="470" y2="150" stroke="var(--border)" strokeWidth="1" />
                    <line x1="30" y1="90" x2="470" y2="90" stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4" />
                    <line x1="30" y1="30" x2="470" y2="30" stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4" />

                    {bodyFatChartData.pathD && (
                      <>
                        <path d={bodyFatChartData.pathD} fill="none" stroke="var(--accent-strong)" strokeWidth="3" strokeLinecap="round" />
                        <path d={`${bodyFatChartData.pathD} L ${bodyFatChartData.points[bodyFatChartData.points.length - 1].x} 150 L ${bodyFatChartData.points[0].x} 150 Z`} fill="url(#fat-gradient)" opacity="0.1" />
                      </>
                    )}

                    <defs>
                      <linearGradient id="fat-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-strong)" />
                        <stop offset="100%" stopColor="var(--accent-strong)" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {bodyFatChartData.points.map((p, index) => (
                      <g key={index}>
                        <circle cx={p.x} cy={p.y} r="4.5" fill="#16110a" stroke="var(--accent-strong)" strokeWidth="2.5" />
                        <text x={p.x} y={p.y - 10} textAnchor="middle" fill="var(--text)" fontSize="9" fontWeight="700">
                          {p.value}%
                        </text>
                        <text x={p.x} y="165" textAnchor="middle" fill="var(--text-soft)" fontSize="8.5">
                          {formatDate(p.date)}
                        </text>
                      </g>
                    ))}
                  </svg>
                </section>
              )}

              {/* Tape Measurements Summary */}
              {latestMetric && (latestMetric.chestCm || latestMetric.waistCm || latestMetric.armCm || latestMetric.legCm) && (
                <section className="panel">
                  <div className="panel-header">
                    <div>
                      <div className="section-title">Latest tape check</div>
                      <div className="section-heading">Tape measurements</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "0.85rem" }}>
                    {latestMetric.chestCm && (
                      <div className="summary-card">
                        <div className="metric-label">Chest</div>
                        <div className="metric-value" style={{ fontSize: "1.5rem", marginTop: "0.3rem" }}>{latestMetric.chestCm} cm</div>
                      </div>
                    )}
                    {latestMetric.waistCm && (
                      <div className="summary-card">
                        <div className="metric-label">Waist</div>
                        <div className="metric-value" style={{ fontSize: "1.5rem", marginTop: "0.3rem" }}>{latestMetric.waistCm} cm</div>
                      </div>
                    )}
                    {latestMetric.armCm && (
                      <div className="summary-card">
                        <div className="metric-label">Arms</div>
                        <div className="metric-value" style={{ fontSize: "1.5rem", marginTop: "0.3rem" }}>{latestMetric.armCm} cm</div>
                      </div>
                    )}
                    {latestMetric.legCm && (
                      <div className="summary-card">
                        <div className="metric-label">Legs</div>
                        <div className="metric-value" style={{ fontSize: "1.5rem", marginTop: "0.3rem" }}>{latestMetric.legCm} cm</div>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        <aside className="panel sidebar-metric" style={{ alignContent: "start" }}>
          <div className="panel-header" style={{ marginBottom: "0.75rem" }}>
            <div>
              <div className="section-title">Check-in</div>
              <div className="section-heading">Log body metrics</div>
            </div>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} style={{ marginTop: 0 }}>
            <label className="auth-field">
              <span>Weight (kg) *</span>
              <input
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                type="number"
                step="0.05"
                min="10"
                max="500"
                required
                placeholder="e.g. 75.25"
              />
            </label>

            <label className="auth-field">
              <span>Body fat % (Optional)</span>
              <input
                value={bodyFatPct}
                onChange={(e) => setBodyFatPct(e.target.value)}
                type="number"
                step="0.1"
                min="1"
                max="90"
                placeholder="e.g. 14.5"
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <label className="auth-field">
                <span>Chest cm</span>
                <input
                  value={chestCm}
                  onChange={(e) => setChestCm(e.target.value)}
                  type="number"
                  step="0.1"
                  placeholder="100.5"
                />
              </label>
              <label className="auth-field">
                <span>Waist cm</span>
                <input
                  value={waistCm}
                  onChange={(e) => setWaistCm(e.target.value)}
                  type="number"
                  step="0.1"
                  placeholder="82.0"
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <label className="auth-field">
                <span>Arm cm</span>
                <input
                  value={armCm}
                  onChange={(e) => setArmCm(e.target.value)}
                  type="number"
                  step="0.1"
                  placeholder="37.5"
                />
              </label>
              <label className="auth-field">
                <span>Leg cm</span>
                <input
                  value={legCm}
                  onChange={(e) => setLegCm(e.target.value)}
                  type="number"
                  step="0.1"
                  placeholder="58.2"
                />
              </label>
            </div>

            {error ? <p className="auth-error">{error}</p> : null}
            {success ? <p style={{ color: "var(--success)", fontSize: "0.9rem" }}>{success}</p> : null}

            <button type="submit" className="primary-button auth-submit" disabled={submitting} style={{ marginBlockStart: "0.75rem" }}>
              {submitting ? "Saving..." : "Log Check-in"}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
