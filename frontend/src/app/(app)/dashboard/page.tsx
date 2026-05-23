import Link from "next/link";

const RECOVERY_MAP: Record<string, { score: number; lastTrained: string; target: string }> = {
  Chest: { score: 32, lastTrained: "Yesterday", target: "Explosive push" },
  Back: { score: 76, lastTrained: "2 days ago", target: "Strength volume" },
  Shoulders: { score: 48, lastTrained: "Yesterday", target: "Stability work" },
  Legs: { score: 93, lastTrained: "4 days ago", target: "Power block" },
  Biceps: { score: 61, lastTrained: "2 days ago", target: "Accessory sets" },
  Triceps: { score: 40, lastTrained: "Yesterday", target: "Lockout work" },
  Core: { score: 88, lastTrained: "3 days ago", target: "Trunk control" },
};

const RECENT_SESSIONS = [
  { muscle: "Chest", date: "Today", volume: "4,200 kg", xp: 120, sets: 12 },
  { muscle: "Back", date: "Yesterday", volume: "6,800 kg", xp: 160, sets: 16 },
  { muscle: "Legs", date: "4 days ago", volume: "9,400 kg", xp: 200, sets: 18 },
];

const HEATMAP_DATA = Array.from({ length: 26 * 7 }, (_, i) => {
  const rng = Math.sin(i * 9301 + 49297) * 0.5 + 0.5;
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

const recoveryState = (score: number) => {
  if (score >= 80) return { label: "Ready", color: "var(--success)" };
  if (score >= 55) return { label: "Building", color: "var(--warning)" };
  return { label: "Recovering", color: "var(--danger)" };
};

export default function DashboardPage() {
  const xp = 3540;
  const level = Math.floor(xp / 500) + 1;
  const currentLevelXp = (level - 1) * 500;
  const nextLevelXp = level * 500;
  const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

  return (
    <div className="page">
      <section className="hero-panel">
        <div className="hero-grid">
          <div>
            <div className="hero-eyebrow pill">Adaptive performance system</div>
            <h1 className="hero-title gradient-text">Train with clearer signals, not just more volume.</h1>
            <p className="hero-copy">
              Nextyra turns workout logging into a command center for recovery, consistency, and momentum. The goal is to make every training decision feel intentional.
            </p>
            <div className="hero-actions">
              <Link href="/workout/new" className="primary-button">
                Start a session
              </Link>
              <Link href="/history" className="secondary-button">
                Review performance log
              </Link>
            </div>
            <div className="summary-grid">
              <span className="pill">
                <strong>12 day streak</strong>
              </span>
              <span className="pill">Recovery score trending up this week</span>
              <span className="pill">Best window for lower body today</span>
            </div>
          </div>

          <div className="hero-stats">
            <div className="mini-stat">
              <div className="mini-stat-label">Training readiness</div>
              <div className="mini-stat-value is-accent">81%</div>
              <div className="helper-text">You are primed for a high-quality session today.</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat-label">Weekly load</div>
              <div className="mini-stat-value">14.2K kg</div>
              <div className="helper-text">Up 12% from last week without a recovery dip.</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat-label">Momentum</div>
              <div className="mini-stat-value is-warm">+420 XP</div>
              <div className="helper-text">One more full session pushes you into level {level + 1}.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="kpi-grid">
        <div className="panel kpi-card">
          <div className="kpi-label">Current streak</div>
          <div className="kpi-value" style={{ color: "var(--accent-warm)" }}>
            12
          </div>
          <div className="kpi-trend">No missed training days this week</div>
        </div>
        <div className="panel kpi-card">
          <div className="kpi-label">Level and XP</div>
          <div className="kpi-value">{level}</div>
          <div className="helper-text">{xp.toLocaleString()} XP accumulated</div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="panel kpi-card">
          <div className="kpi-label">Recovery window</div>
          <div className="kpi-value">Legs</div>
          <div className="kpi-trend">93% ready for your next heavy block</div>
        </div>
        <div className="panel kpi-card">
          <div className="kpi-label">Consistency rate</div>
          <div className="kpi-value">89%</div>
          <div className="helper-text">You logged 16 sessions in the last 18 days</div>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="section-title">Pattern analysis</div>
              <div className="section-heading">Consistency heatmap</div>
            </div>
            <div className="panel-note">A compressed 6-month view of your output rhythm.</div>
          </div>
          <div className="heatmap">
            {Array.from({ length: 26 }).map((_, week) => (
              <div key={week} className="heatmap-week">
                {Array.from({ length: 7 }).map((_, day) => {
                  const value = HEATMAP_DATA[week * 7 + day];
                  return (
                    <div
                      key={day}
                      className="heatmap-cell"
                      title={`${value} session(s)`}
                      style={{ background: heatmapColor(value) }}
                    />
                  );
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
            {Object.entries(RECOVERY_MAP).map(([muscle, data]) => {
              const state = recoveryState(data.score);
              return (
                <div className="recovery-row" key={muscle}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{muscle}</div>
                    <div className="helper-text">
                      {data.lastTrained} • Suggested focus: {data.target}
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${data.score}%` }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem" }}>{data.score}%</div>
                    <div style={{ color: state.color, fontWeight: 700, fontSize: "0.82rem" }}>{state.label}</div>
                  </div>
                </div>
              );
            })}
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
          {RECENT_SESSIONS.map((session) => (
            <article className="session-card" key={`${session.muscle}-${session.date}`}>
              <div className="session-top">
                <div className="session-title">{session.muscle} day</div>
                <div className="pill">+{session.xp} XP</div>
              </div>
              <div className="timeline-date" style={{ marginTop: "0.35rem" }}>
                {session.date}
              </div>
              <div className="session-stats">
                <div className="summary-card">
                  <div className="metric-label">Volume</div>
                  <div className="metric-value">{session.volume}</div>
                </div>
                <div className="summary-card">
                  <div className="metric-label">Sets</div>
                  <div className="metric-value">{session.sets}</div>
                </div>
                <div className="summary-card">
                  <div className="metric-label">Status</div>
                  <div className="metric-value">Locked</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
