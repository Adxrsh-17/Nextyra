"use client";

import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

type ExerciseHistoryItem = {
  date: string;
  weight: number;
  reps: number;
  estimated1Rm: number;
  volume: number;
};

type StatsResponse = {
  exerciseHistory: Record<string, ExerciseHistoryItem[]>;
};

type VolumeResponse = {
  volumeByMuscle: Record<string, number>;
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

function getSessionToken() {
  return typeof window === "undefined" ? "" : window.localStorage.getItem("nextyra-session-token") ?? "";
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function StatsPage() {
  const [exerciseHistory, setExerciseHistory] = useState<Record<string, ExerciseHistoryItem[]>>({});
  const [volumeByMuscle, setVolumeByMuscle] = useState<Record<string, number>>({});
  const [predictive, setPredictive] = useState<PredictiveResponse | null>(null);
  const [selectedExercise, setSelectedExercise] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getSessionToken();
    if (!token) return;

    Promise.all([
      apiFetch<StatsResponse>(`/api/stats/exercises?token=${encodeURIComponent(token)}`),
      apiFetch<VolumeResponse>(`/api/stats/volume?token=${encodeURIComponent(token)}`),
      apiFetch<PredictiveResponse>(`/api/agents/predictive?token=${encodeURIComponent(token)}`),
    ])
      .then(([statsData, volumeData, predictiveData]) => {
        setExerciseHistory(statsData.exerciseHistory);
        setVolumeByMuscle(volumeData.volumeByMuscle);
        setPredictive(predictiveData);

        const exercises = Object.keys(statsData.exerciseHistory);
        if (exercises.length > 0) {
          setSelectedExercise(exercises[0]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const exerciseOptions = useMemo(() => Object.keys(exerciseHistory), [exerciseHistory]);

  const activeHistory = useMemo(() => {
    if (!selectedExercise) return [];
    return exerciseHistory[selectedExercise] ?? [];
  }, [selectedExercise, exerciseHistory]);

  // Compute the SVG Line Chart Path for 1RM
  const lineChartData = useMemo(() => {
    if (activeHistory.length === 0) return null;

    const width = 500;
    const height = 200;
    const padding = 30;

    const values = activeHistory.map((h) => h.estimated1Rm);
    const maxVal = Math.max(...values, 10);
    const minVal = Math.min(...values, 0);
    const valRange = maxVal - minVal === 0 ? 10 : maxVal - minVal;

    const points = activeHistory.map((h, i) => {
      const x = padding + (i / Math.max(activeHistory.length - 1, 1)) * (width - 2 * padding);
      const y = height - padding - ((h.estimated1Rm - minVal) / valRange) * (height - 2 * padding);
      return { x, y, value: h.estimated1Rm, date: h.date };
    });

    let pathD = "";
    if (points.length > 0) {
      pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        pathD += ` L ${points[i].x} ${points[i].y}`;
      }
    }

    return { points, pathD, width, height, minVal, maxVal };
  }, [activeHistory]);

  const maxVolume = useMemo(() => {
    const values = Object.values(volumeByMuscle);
    if (values.length === 0) return 1000;
    return Math.max(...values, 1000);
  }, [volumeByMuscle]);

  const selectedForecast = useMemo(() => {
    if (!predictive?.strengthForecasts?.length || !selectedExercise) return null;
    return predictive.strengthForecasts.find((forecast) => forecast.exerciseName === selectedExercise) ?? predictive.strengthForecasts[0] ?? null;
  }, [predictive, selectedExercise]);

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-card">
          <div className="auth-loading-mark">NX</div>
          <p>Compiling stats and performance trends...</p>
        </div>
      </div>
    );
  }

  const hasHistory = exerciseOptions.length > 0;

  return (
    <div className="page">
      <section className="hero-panel">
        <div className="history-hero">
          <div>
            <div className="section-title">Performance analytics</div>
            <h1 className="hero-title gradient-text" style={{ fontSize: "clamp(2rem, 3.5vw, 3.8rem)", maxWidth: "15ch" }}>
              Strength progression and load analysis.
            </h1>
            <p className="hero-copy">
              Track estimated 1RM overload trajectories and analyze weekly muscle distribution targets dynamically.
            </p>
          </div>
          <div className="hero-actions" style={{ marginTop: "1rem" }}>
            <Link href="/workout/new" className="primary-button">
              Start new session
            </Link>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="section-title">Predictive intelligence</div>
            <div className="section-heading">Forecasts from your latest training and body data</div>
          </div>
          <div className="pill">Phase 4 active</div>
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
            <div className="feature-kicker">Strength forecast</div>
            <p className="feature-story-copy">
              {selectedForecast
                ? `${selectedForecast.exerciseName}: ${selectedForecast.current1Rm} kg today, ${selectedForecast.projected1Rm} kg projected by ${new Date(selectedForecast.targetDate).toLocaleDateString()}.`
                : "Train more sets to unlock lift-specific forecasts."}
            </p>
          </div>
          <div className="feature-story-card">
            <div className="feature-kicker">Consistency trend</div>
            <p className="feature-story-copy">{predictive?.consistency?.insight ?? "Consistency insights appear once the system has enough workout history."}</p>
          </div>
          <div className="feature-story-card">
            <div className="feature-kicker">Body composition</div>
            <p className="feature-story-copy">{predictive?.bodyRecommendation ?? "Add at least two body metric check-ins to generate projections."}</p>
          </div>
        </div>
      </section>

      {!hasHistory ? (
        <section className="panel" style={{ textAlign: "center", paddingBlock: "3rem" }}>
          <div className="panel-empty" style={{ maxWidth: "420px", margin: "0 auto" }}>
            No completed training sessions found. Log your first workout to begin generating estimated 1RM progression charts and volume distribution mapping.
          </div>
        </section>
      ) : (
        <div className="content-grid">
          <section className="panel" style={{ display: "flex", flexDirection: "column" }}>
            <div className="panel-header">
              <div>
                <div className="section-title">Overload progression</div>
                <div className="section-heading">Estimated 1RM trend</div>
              </div>
              {selectedForecast ? (
                <div className="pill" style={{ background: "var(--bg-soft)", color: "var(--accent)" }}>
                  Forecast {selectedForecast.trend === "up" ? "+" : ""}{selectedForecast.weeklyGain} kg / week
                </div>
              ) : null}
              <div>
                <select
                  value={selectedExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  style={{
                    background: "var(--bg-soft)",
                    color: "var(--fg)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "0.55rem 1rem",
                    outline: "none",
                    fontWeight: 700,
                  }}
                >
                  {exerciseOptions.map((ex) => (
                    <option key={ex} value={ex}>
                      {ex}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {lineChartData && (
              <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
                <svg
                  viewBox={`0 0 ${lineChartData.width} ${lineChartData.height}`}
                  style={{ width: "100%", height: "auto", minWidth: "450px" }}
                >
                  {/* Grid Lines */}
                  <line
                    x1="30"
                    y1="30"
                    x2="470"
                    y2="30"
                    stroke="var(--border)"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                  <line
                    x1="30"
                    y1="100"
                    x2="470"
                    y2="100"
                    stroke="var(--border)"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                  <line
                    x1="30"
                    y1="170"
                    x2="470"
                    y2="170"
                    stroke="var(--border)"
                    strokeWidth="1"
                  />

                  {/* Chart Path */}
                  <path
                    d={lineChartData.pathD}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Gradient Area Below Line */}
                  {lineChartData.points.length > 0 && (
                    <path
                      d={`${lineChartData.pathD} L ${lineChartData.points[lineChartData.points.length - 1].x} 170 L ${lineChartData.points[0].x} 170 Z`}
                      fill="url(#chart-gradient)"
                      opacity="0.12"
                    />
                  )}

                  {/* Definition of Gradients */}
                  <defs>
                    <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Data Points */}
                  {lineChartData.points.map((p, index) => (
                    <g key={index}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="5"
                        fill="#16110a"
                        stroke="var(--accent)"
                        strokeWidth="3"
                      />
                      <text
                        x={p.x}
                        y={p.y - 12}
                        textAnchor="middle"
                        fill="var(--text)"
                        fontSize="10"
                        fontWeight="700"
                      >
                        {p.value}kg
                      </text>
                      <text
                        x={p.x}
                        y="188"
                        textAnchor="middle"
                        fill="var(--text-soft)"
                        fontSize="9"
                      >
                        {formatDate(p.date)}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            )}

            <div style={{ marginTop: "1.5rem" }}>
              <div className="helper-text" style={{ lineHeight: 1.6 }}>
                💡 <strong>1RM (One-Rep Max)</strong> calculation uses the Epley formula: <code>weight × (1 + reps/30)</code>. Maintaining a steady upward line signals progressive overloading.
              </div>
              {selectedForecast ? (
                <div className="summary-card" style={{ marginTop: "1rem", border: "1px solid var(--border-strong)" }}>
                  <div className="metric-label">Projected next milestone</div>
                  <div className="metric-value" style={{ fontSize: "1.7rem" }}>{selectedForecast.projected1Rm} kg</div>
                  <div className="helper-text">Based on {selectedForecast.sampleCount} logged top sets and a simple regression trend.</div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="panel" style={{ display: "flex", flexDirection: "column" }}>
            <div className="panel-header">
              <div>
                <div className="section-title">Distribution</div>
                <div className="section-heading">Muscle group volume (30 days)</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              {Object.entries(volumeByMuscle).map(([muscle, volume]) => {
                const percent = maxVolume > 0 ? (volume / maxVolume) * 100 : 0;
                return (
                  <div key={muscle} style={{ display: "grid", gap: "0.35rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                      <span style={{ textTransform: "capitalize", fontWeight: 700 }}>{muscle}</span>
                      <span style={{ color: "var(--text-soft)" }}>{volume.toLocaleString()} kg</span>
                    </div>
                    <div className="progress-track" style={{ height: "0.85rem", marginTop: 0 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${percent}%`,
                          transition: "width 500ms ease-out",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel" style={{ display: "flex", flexDirection: "column" }}>
            <div className="panel-header">
              <div>
                <div className="section-title">Plateau detection</div>
                <div className="section-heading">Breakthrough suggestions</div>
              </div>
            </div>

            {predictive?.plateauInsights?.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {predictive.plateauInsights.map((flag) => (
                  <div key={flag.exerciseName} className="summary-card">
                    <div className="timeline-top">
                      <div>
                        <div className="timeline-title">{flag.exerciseName}</div>
                        <div className="timeline-date">No PR in {flag.daysSinceLastPR} days</div>
                      </div>
                      <div className="pill">{flag.current1Rm} kg 1RM</div>
                    </div>
                    <p className="helper-text" style={{ lineHeight: 1.55, marginTop: "0.5rem" }}>{flag.suggestion}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="panel-empty">No plateaus detected yet. Keep logging PR attempts and the system will flag stalls after 3 weeks.</div>
            )}
          </section>

          <section className="panel" style={{ display: "flex", flexDirection: "column" }}>
            <div className="panel-header">
              <div>
                <div className="section-title">Body projections</div>
                <div className="section-heading">Weight and body-fat trend forecast</div>
              </div>
            </div>

            {predictive?.bodyProjection ? (
              <div style={{ display: "grid", gap: "0.85rem" }}>
                <div className="summary-card">
                  <div className="metric-label">Projected by {new Date(predictive.bodyProjection.projectedDate).toLocaleDateString()}</div>
                  <div className="metric-value" style={{ fontSize: "1.8rem" }}>
                    {predictive.bodyProjection.projectedWeightKg !== null ? `${predictive.bodyProjection.projectedWeightKg} kg` : "Weight N/A"}
                  </div>
                  <div className="helper-text">
                    {predictive.bodyProjection.latestWeightKg !== null ? `Latest: ${predictive.bodyProjection.latestWeightKg} kg` : "Weight trend unavailable"}
                  </div>
                </div>
                <div className="summary-card">
                  <div className="metric-label">Body fat projection</div>
                  <div className="metric-value" style={{ fontSize: "1.8rem" }}>
                    {predictive.bodyProjection.projectedBodyFatPct !== null ? `${predictive.bodyProjection.projectedBodyFatPct}%` : "N/A"}
                  </div>
                  <div className="helper-text">
                    {predictive.bodyProjection.latestBodyFatPct !== null ? `Latest: ${predictive.bodyProjection.latestBodyFatPct}%` : "Body-fat trend unavailable"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="panel-empty">Add at least two body metric check-ins to enable body composition forecasting.</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
