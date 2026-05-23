import Link from "next/link";

const SESSIONS = [
  { id: "1", muscle: "Chest", date: "May 22, 2026", volume: "4,200", xp: 120, sets: 12, exercises: ["Barbell Bench Press", "Cable Crossovers", "Push-ups"] },
  { id: "2", muscle: "Back", date: "May 21, 2026", volume: "6,800", xp: 160, sets: 16, exercises: ["Deadlift", "Pull-ups", "Lat Pulldown"] },
  { id: "3", muscle: "Legs", date: "May 18, 2026", volume: "9,400", xp: 200, sets: 18, exercises: ["Squat", "Leg Press", "Lunges"] },
  { id: "4", muscle: "Shoulders", date: "May 17, 2026", volume: "3,100", xp: 90, sets: 10, exercises: ["Overhead Press", "Lateral Raises"] },
  { id: "5", muscle: "Biceps", date: "May 15, 2026", volume: "1,800", xp: 80, sets: 10, exercises: ["Barbell Curl", "Hammer Curls"] },
];

const muscleColor: Record<string, { bg: string; color: string }> = {
  Chest: { bg: "rgba(55, 199, 234, 0.16)", color: "#77d8ff" },
  Back: { bg: "rgba(110, 231, 200, 0.14)", color: "#8cf2d2" },
  Legs: { bg: "rgba(241, 124, 69, 0.14)", color: "#ffb286" },
  Shoulders: { bg: "rgba(130, 159, 255, 0.14)", color: "#b9c8ff" },
  Biceps: { bg: "rgba(255, 125, 125, 0.14)", color: "#ffaaaa" },
};

export default function HistoryPage() {
  return (
    <div className="page">
      <section className="hero-panel">
        <div className="history-hero">
          <div>
            <div className="section-title">Performance archive</div>
            <h1 className="hero-title" style={{ fontSize: "clamp(2rem, 3vw, 3.4rem)", maxWidth: "14ch" }}>
              Every workout, organized like a product dashboard.
            </h1>
            <p className="hero-copy">
              This view is designed to feel less like a table dump and more like a premium training timeline. You can scan signal, volume, and effort quickly.
            </p>
          </div>
          <div className="section-actions">
            <Link href="/workout/new" className="primary-button">
              Log a new session
            </Link>
          </div>
        </div>
      </section>

      <section className="kpi-grid">
        {[
          { label: "Total sessions", value: "47", note: "4 in the last 7 days" },
          { label: "Total sets", value: "632", note: "Average 13.4 per workout" },
          { label: "Total volume", value: "142K", note: "Tracked across all muscle groups" },
          { label: "Total XP", value: "3,540", note: "Gamified reward loop is active" },
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
          <div className="panel-note">Designed for quick review, not spreadsheet fatigue.</div>
        </div>

        <div className="history-list">
          {SESSIONS.map((session) => {
            const colors = muscleColor[session.muscle] ?? { bg: "rgba(255,255,255,0.08)", color: "var(--text)" };

            return (
              <article className="timeline-card" key={session.id}>
                <div className="timeline-layout">
                  <div className="badge-box" style={{ background: colors.bg, color: colors.color, border: `1px solid ${colors.color}33` }}>
                    {session.muscle.slice(0, 3).toUpperCase()}
                  </div>

                  <div>
                    <div className="timeline-top">
                      <div>
                        <div className="timeline-title">{session.muscle} focus session</div>
                        <div className="timeline-date">{session.date}</div>
                      </div>
                      <div className="pill" style={{ color: colors.color, background: colors.bg }}>
                        +{session.xp} XP
                      </div>
                    </div>
                    <div className="timeline-exercises">{session.exercises.join(" • ")}</div>
                  </div>

                  <div className="history-stats">
                    <div className="history-stat-box">
                      <div className="metric-label">Volume</div>
                      <div className="metric-value">{session.volume} kg</div>
                    </div>
                    <div className="history-stat-box">
                      <div className="metric-label">Sets</div>
                      <div className="metric-value">{session.sets}</div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
