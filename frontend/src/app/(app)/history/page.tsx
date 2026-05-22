import Link from "next/link";

const SESSIONS = [
  { id: "1", muscle: "Chest", date: "May 22, 2026", volume: "4,200", xp: 120, sets: 12, exercises: ["Barbell Bench Press", "Cable Crossovers", "Push-ups"] },
  { id: "2", muscle: "Back", date: "May 21, 2026", volume: "6,800", xp: 160, sets: 16, exercises: ["Deadlift", "Pull-ups", "Lat Pulldown"] },
  { id: "3", muscle: "Legs", date: "May 18, 2026", volume: "9,400", xp: 200, sets: 18, exercises: ["Squat", "Leg Press", "Lunges"] },
  { id: "4", muscle: "Shoulders", date: "May 17, 2026", volume: "3,100", xp: 90, sets: 10, exercises: ["Overhead Press", "Lateral Raises"] },
  { id: "5", muscle: "Biceps", date: "May 15, 2026", volume: "1,800", xp: 80, sets: 10, exercises: ["Barbell Curl", "Hammer Curls"] },
];

const muscleColor: Record<string, { bg: string; text: string }> = {
  Chest: { bg: "rgba(139,92,246,0.15)", text: "var(--accent)" },
  Back: { bg: "rgba(109,40,217,0.15)", text: "#a78bfa" },
  Legs: { bg: "rgba(245,158,11,0.12)", text: "var(--warning)" },
  Shoulders: { bg: "rgba(167,139,250,0.15)", text: "#c4b5fd" },
  Biceps: { bg: "rgba(239,68,68,0.12)", text: "var(--danger)" },
  Triceps: { bg: "rgba(16,185,129,0.12)", text: "var(--success)" },
  Core: { bg: "rgba(249,115,22,0.12)", text: "var(--streak)" },
};

export default function HistoryPage() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "30px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "6px" }}>Workout History</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>All your sessions, sets, and progress.</p>
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

      {/* Total Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "28px" }}>
        {[
          { label: "Total Sessions", value: "47" },
          { label: "Total Sets", value: "632" },
          { label: "Total Volume", value: "142K kg" },
          { label: "Total XP", value: "3,540" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{ padding: "16px", borderRadius: "14px", background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", textAlign: "center" }}
          >
            <p style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>{stat.label}</p>
            <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Session list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {SESSIONS.map((session) => {
          const colors = muscleColor[session.muscle] || { bg: "rgba(255,255,255,0.08)", text: "#94a3b8" };
          return (
            <div
              key={session.id}
              style={{
                padding: "20px 24px",
                borderRadius: "14px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                alignItems: "center",
                gap: "20px",
              }}
            >
              {/* Muscle Badge */}
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "14px",
                  background: colors.bg,
                  border: `1px solid ${colors.text}40`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: "11px", fontWeight: 800, color: colors.text, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {session.muscle.slice(0, 3)}
                </span>
              </div>

              {/* Main info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>{session.muscle} Day</span>
                  <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: colors.bg, color: colors.text, fontWeight: 600 }}>
                    +{session.xp} XP
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>{session.date}</p>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{session.exercises.join(" · ")}</p>
              </div>

              {/* Stats */}
              <div style={{ display: "flex", gap: "24px", flexShrink: 0 }}>
                {[
                  { label: "Volume", value: `${session.volume} kg` },
                  { label: "Sets", value: String(session.sets) },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "2px" }}>{s.label}</p>
                    <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
