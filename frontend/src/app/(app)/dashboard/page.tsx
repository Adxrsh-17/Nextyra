import Link from "next/link";

const RECOVERY_MAP: Record<string, { score: number; lastTrained: string }> = {
  Chest: { score: 25, lastTrained: "Yesterday" },
  Back: { score: 70, lastTrained: "2 days ago" },
  Shoulders: { score: 45, lastTrained: "Yesterday" },
  Legs: { score: 100, lastTrained: "4 days ago" },
  Biceps: { score: 60, lastTrained: "2 days ago" },
  Triceps: { score: 35, lastTrained: "Yesterday" },
  Core: { score: 90, lastTrained: "3 days ago" },
};

const RECENT_SESSIONS = [
  { muscle: "Chest", date: "Today", volume: "4,200 kg", xp: 120, sets: 12 },
  { muscle: "Back", date: "Yesterday", volume: "6,800 kg", xp: 160, sets: 16 },
  { muscle: "Legs", date: "4 days ago", volume: "9,400 kg", xp: 200, sets: 18 },
];

const HEATMAP_DATA = Array.from({ length: 52 * 7 }, (_, i) => {
  const rng = Math.sin(i * 9301 + 49297) * 0.5 + 0.5;
  if (rng > 0.82) return 3;
  if (rng > 0.65) return 2;
  if (rng > 0.52) return 1;
  return 0;
});

const heatmapColor = (v: number) => {
  if (v === 0) return "var(--bg-subtle)";
  if (v === 1) return "rgba(139,92,246,0.3)";
  if (v === 2) return "rgba(139,92,246,0.6)";
  return "var(--accent)";
};

const recoveryColor = (score: number) => {
  if (score >= 80) return { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", text: "var(--success)", label: "Ready" };
  if (score >= 50) return { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "var(--warning)", label: "Partial" };
  return { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", text: "var(--danger)", label: "Recovering" };
};

export default function DashboardPage() {
  const xp = 3540;
  const level = Math.floor(xp / 500) + 1;
  const currentLevelXp = (level - 1) * 500;
  const nextLevelXp = level * 500;
  const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "36px" }}>
        <div>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 800,
              background: "linear-gradient(135deg, #818cf8 0%, #a78bfa 50%, #f472b6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "6px",
            }}
          >
            Dashboard
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>Welcome back, Athlete. Ready to crush it?</p>
        </div>
        <Link
          href="/workout/new"
          style={{
            padding: "12px 22px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
            color: "var(--accent-text)",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "14px",
            boxShadow: "var(--shadow-md)",
          }}
        >
          + Log Workout
        </Link>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {/* Streak */}
        <div style={{ padding: "20px", borderRadius: "16px", background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Streak</p>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "32px" }}>🔥</span>
            <div>
              <p style={{ fontSize: "30px", fontWeight: 900, color: "var(--streak)", lineHeight: 1 }}>12</p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>days in a row</p>
            </div>
          </div>
        </div>

        {/* Level & XP */}
        <div style={{ padding: "20px", borderRadius: "16px", background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Level & XP</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "10px" }}>
            <span style={{ fontSize: "30px", fontWeight: 900, color: "var(--accent)", lineHeight: 1 }}>{level}</span>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 600 }}>Athlete</span>
          </div>
          <div style={{ width: "100%", height: "6px", borderRadius: "999px", background: "var(--bg-hover)", overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", borderRadius: "999px", background: "linear-gradient(90deg, var(--accent), var(--accent-hover))", transition: "width 0.5s ease" }} />
          </div>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>{xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP</p>
        </div>

        {/* Weekly Volume */}
        <div style={{ padding: "20px", borderRadius: "16px", background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Weekly Volume</p>
          <p style={{ fontSize: "30px", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1, marginBottom: "4px" }}>
            14.2<span style={{ fontSize: "15px", color: "var(--text-muted)", fontWeight: 500, marginLeft: "4px" }}>K kg</span>
          </p>
          <p style={{ fontSize: "12px", color: "var(--success)", fontWeight: 600 }}>↑ +12% vs last week</p>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "20px", marginBottom: "20px" }}>
        {/* Heatmap */}
        <div style={{ padding: "24px", borderRadius: "16px", background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>Consistency Heatmap</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(52, 1fr)", gap: "3px" }}>
            {Array.from({ length: 52 }).map((_, week) => (
              <div key={week} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {Array.from({ length: 7 }).map((_, day) => {
                  const v = HEATMAP_DATA[week * 7 + day];
                  return (
                    <div
                      key={day}
                      title={`${v} session(s)`}
                      style={{
                        width: "100%",
                        aspectRatio: "1",
                        borderRadius: "2px",
                        background: heatmapColor(v),
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", justifyContent: "flex-end" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Less</span>
            {[0, 1, 2, 3].map((v) => (
              <div key={v} style={{ width: "10px", height: "10px", borderRadius: "2px", background: heatmapColor(v) }} />
            ))}
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>More</span>
          </div>
        </div>

        {/* Recovery Grid */}
        <div style={{ padding: "24px", borderRadius: "16px", background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>Muscle Recovery</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Object.entries(RECOVERY_MAP).map(([muscle, data]) => {
              const c = recoveryColor(data.score);
              return (
                <div
                  key={muscle}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                  }}
                >
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{muscle}</p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{data.lastTrained}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "15px", fontWeight: 800, color: c.text }}>{data.score}%</p>
                    <p style={{ fontSize: "10px", color: c.text, fontWeight: 600, opacity: 0.8 }}>{c.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div style={{ padding: "24px", borderRadius: "16px", background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>Recent Sessions</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {RECENT_SESSIONS.map((s, i) => (
            <div
              key={i}
              style={{
                padding: "16px",
                borderRadius: "12px",
                background: "var(--bg-subtle)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)" }}>{s.muscle}</span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{s.date}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <div>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>Volume</p>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{s.volume}</p>
                </div>
                <div>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>Sets</p>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{s.sets}</p>
                </div>
                <div>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>XP</p>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent)" }}>+{s.xp}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
