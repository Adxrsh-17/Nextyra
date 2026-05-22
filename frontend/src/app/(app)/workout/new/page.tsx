"use client";

import { useState } from "react";
import Link from "next/link";

const MUSCLE_GROUPS = [
  { id: "chest", label: "Chest", emoji: "🏋️" },
  { id: "back", label: "Back", emoji: "🔙" },
  { id: "shoulders", label: "Shoulders", emoji: "💪" },
  { id: "legs", label: "Legs", emoji: "🦵" },
  { id: "biceps", label: "Biceps", emoji: "💪" },
  { id: "triceps", label: "Triceps", emoji: "✊" },
  { id: "core", label: "Core", emoji: "🎯" },
];

const EXERCISES: Record<string, string[]> = {
  chest: ["Barbell Bench Press", "Incline Dumbbell Press", "Cable Crossovers", "Push-ups", "Dumbbell Flyes"],
  back: ["Deadlift", "Pull-ups", "Barbell Row", "Lat Pulldown", "Seated Cable Row"],
  shoulders: ["Overhead Press", "Lateral Raises", "Front Raises", "Face Pulls", "Arnold Press"],
  legs: ["Squat", "Leg Press", "Lunges", "Leg Extensions", "Leg Curls"],
  biceps: ["Barbell Curl", "Hammer Curls", "Preacher Curl", "Concentration Curls"],
  triceps: ["Tricep Pushdown", "Skull Crushers", "Overhead Tricep Extension", "Dips"],
  core: ["Crunches", "Plank", "Russian Twists", "Leg Raises", "Cable Crunches"],
};

type Set = { weight: string; reps: string; completed: boolean };

export default function NewWorkoutPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedMuscle, setSelectedMuscle] = useState<string>("");
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [sets, setSets] = useState<Set[]>([{ weight: "60", reps: "8", completed: false }]);
  const [totalXP, setTotalXP] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);

  const filteredExercises = (EXERCISES[selectedMuscle] || []).filter((ex) =>
    ex.toLowerCase().includes(search.toLowerCase())
  );

  function addSet() {
    setSets((prev) => [...prev, { weight: "60", reps: "8", completed: false }]);
  }

  function updateSet(idx: number, field: "weight" | "reps", value: string) {
    setSets((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  function completeSet(idx: number) {
    setSets((prev) => prev.map((s, i) => (i === idx ? { ...s, completed: true } : s)));
    setTotalXP((xp) => xp + 10);
  }

  function finishSession() {
    setSessionDone(true);
  }

  const completedCount = sets.filter((s) => s.completed).length;

  if (sessionDone) {
    return (
      <div style={{ maxWidth: "520px", margin: "0 auto", textAlign: "center", paddingTop: "40px" }}>
        <div style={{ fontSize: "72px", marginBottom: "24px" }}>🏆</div>
        <h1 style={{ fontSize: "32px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "12px" }}>
          Session Complete!
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "16px", marginBottom: "32px" }}>
          You crushed {completedCount} sets of {selectedExercise}
        </p>
        <div
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(109,40,217,0.2))",
            border: "1px solid var(--border-accent)",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "32px",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "8px", fontWeight: 600 }}>XP EARNED</p>
          <p style={{ fontSize: "48px", fontWeight: 900, color: "var(--accent)" }}>+{totalXP}</p>
        </div>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={() => { setStep(1); setSelectedMuscle(""); setSelectedExercise(""); setSets([{ weight: "60", reps: "8", completed: false }]); setTotalXP(0); setSessionDone(false); }}
            style={{ padding: "12px 24px", borderRadius: "12px", background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}
          >
            Log Another
          </button>
          <Link href="/dashboard" style={{ padding: "12px 24px", borderRadius: "12px", background: "linear-gradient(135deg, var(--accent), var(--accent-hover))", color: "var(--accent-text)", fontWeight: 600, textDecoration: "none", fontSize: "14px", display: "inline-flex", alignItems: "center", boxShadow: "var(--shadow-md)" }}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "30px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "6px" }}>
          Log Workout
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>
          Track your sets, hit new PRs, and earn XP.
        </p>
      </div>

      {/* Step Indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "36px" }}>
        {[
          { n: 1, label: "Muscle Group" },
          { n: 2, label: "Exercise" },
          { n: 3, label: "Log Sets" },
        ].map(({ n, label }, i) => (
          <div key={n} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: step >= n ? "linear-gradient(135deg, var(--accent), var(--accent-hover))" : "var(--bg-subtle)",
                  border: step >= n ? "none" : "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: step >= n ? "var(--accent-text)" : "var(--text-muted)",
                  boxShadow: step >= n ? "var(--shadow-md)" : "none",
                  flexShrink: 0,
                  transition: "all 0.2s",
                }}
              >
                {n}
              </div>
              <span style={{ fontSize: "13px", fontWeight: 600, color: step >= n ? "var(--text-secondary)" : "var(--text-muted)" }}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div style={{ width: "48px", height: "1px", background: step > n ? "var(--accent)" : "var(--border)", margin: "0 12px" }} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Muscle Group */}
      {step === 1 && (
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>
            Select Muscle Group
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px" }}>
            {MUSCLE_GROUPS.map((mg) => (
              <button
                key={mg.id}
                onClick={() => { setSelectedMuscle(mg.id); setStep(2); }}
                style={{
                  padding: "20px 16px",
                  borderRadius: "16px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                  fontWeight: 600,
                  fontSize: "14px",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-accent)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-card)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                }}
              >
                <span style={{ fontSize: "28px" }}>{mg.emoji}</span>
                {mg.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Exercise Picker */}
      {step === 2 && (
        <div>
          <button
            onClick={() => setStep(1)}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "13px", fontWeight: 500, marginBottom: "16px", display: "flex", alignItems: "center", gap: "4px" }}
          >
            ← Back
          </button>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>
            Select Exercise
          </h2>
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <input
              type="text"
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px 12px 44px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f8fafc",
                fontSize: "14px",
                outline: "none",
              }}
            />
            <svg style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#475569" }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filteredExercises.map((ex) => (
              <button
                key={ex}
                onClick={() => { setSelectedExercise(ex); setStep(3); }}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontWeight: 500,
                  fontSize: "14px",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.1)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99,102,241,0.3)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)";
                }}
              >
                <span>{ex}</span>
                <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.06)", color: "#64748b", textTransform: "capitalize" }}>
                  {selectedMuscle}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Log Sets */}
      {step === 3 && (
        <div>
          <button
            onClick={() => setStep(2)}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "13px", fontWeight: 500, marginBottom: "16px", display: "flex", alignItems: "center", gap: "4px" }}
          >
            ← Back
          </button>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
            <div>
              <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>
                {selectedExercise}
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "13px", textTransform: "capitalize" }}>{selectedMuscle}</p>
            </div>
            <div style={{ padding: "6px 14px", borderRadius: "999px", background: "var(--accent-subtle)", border: "1px solid var(--border-accent)", color: "var(--accent)", fontSize: "13px", fontWeight: 600 }}>
              +{totalXP} XP
            </div>
          </div>

          {/* Sets */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 120px", gap: "10px", padding: "0 8px", marginBottom: "4px" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Set</span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Weight (kg)</span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Reps</span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Action</span>
            </div>

            {sets.map((set, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 1fr 1fr 120px",
                  gap: "10px",
                  alignItems: "center",
                  padding: "12px",
                  borderRadius: "12px",
                  background: set.completed ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)",
                  border: set.completed ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(255,255,255,0.08)",
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-muted)" }}>{idx + 1}</span>
                <input
                  type="number"
                  value={set.weight}
                  disabled={set.completed}
                  onChange={(e) => updateSet(idx, "weight", e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "var(--bg-subtle)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    fontSize: "15px",
                    fontWeight: 700,
                    textAlign: "center",
                    outline: "none",
                    opacity: set.completed ? 0.5 : 1,
                  }}
                />
                <input
                  type="number"
                  value={set.reps}
                  disabled={set.completed}
                  onChange={(e) => updateSet(idx, "reps", e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "var(--bg-subtle)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    fontSize: "15px",
                    fontWeight: 700,
                    textAlign: "center",
                    outline: "none",
                    opacity: set.completed ? 0.5 : 1,
                  }}
                />
                {set.completed ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--success)", fontSize: "13px", fontWeight: 600 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    Done
                  </div>
                ) : (
                  <button
                    onClick={() => completeSet(idx)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
                      border: "none",
                      color: "var(--accent-text)",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      boxShadow: "var(--shadow-md)",
                    }}
                  >
                    ✓ Complete
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={addSet}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "12px",
                background: "var(--bg-subtle)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Add Set
            </button>
            <button
              onClick={finishSession}
              disabled={completedCount === 0}
              style={{
                flex: 2,
                padding: "12px",
                borderRadius: "12px",
                background: completedCount > 0 ? "linear-gradient(135deg, var(--accent), var(--accent-hover))" : "var(--bg-subtle)",
                border: completedCount > 0 ? "none" : "1px solid var(--border)",
                color: completedCount > 0 ? "var(--accent-text)" : "var(--text-muted)",
                fontSize: "14px",
                fontWeight: 700,
                cursor: completedCount > 0 ? "pointer" : "not-allowed",
                boxShadow: completedCount > 0 ? "var(--shadow-md)" : "none",
                transition: "all 0.2s",
              }}
            >
              Finish Session ({completedCount}/{sets.length} sets)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
