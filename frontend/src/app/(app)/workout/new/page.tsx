"use client";

import { useState } from "react";
import Link from "next/link";

const MUSCLE_GROUPS = [
  { id: "chest", label: "Chest", icon: "CH", note: "Push strength and chest volume" },
  { id: "back", label: "Back", icon: "BK", note: "Rows, pulls, and posterior chain" },
  { id: "shoulders", label: "Shoulders", icon: "SH", note: "Pressing power and stability" },
  { id: "legs", label: "Legs", icon: "LG", note: "Primary lower-body session" },
  { id: "biceps", label: "Biceps", icon: "BI", note: "Accessory arm work" },
  { id: "triceps", label: "Triceps", icon: "TR", note: "Lockout and extension focus" },
  { id: "core", label: "Core", icon: "CR", note: "Bracing and trunk control" },
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
  const [selectedMuscle, setSelectedMuscle] = useState("");
  const [selectedExercise, setSelectedExercise] = useState("");
  const [search, setSearch] = useState("");
  const [sets, setSets] = useState<Set[]>([{ weight: "60", reps: "8", completed: false }]);
  const [totalXP, setTotalXP] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);

  const filteredExercises = (EXERCISES[selectedMuscle] || []).filter((exercise) =>
    exercise.toLowerCase().includes(search.toLowerCase())
  );

  const completedCount = sets.filter((set) => set.completed).length;
  const selectedMuscleMeta = MUSCLE_GROUPS.find((group) => group.id === selectedMuscle);

  function addSet() {
    setSets((previous) => [...previous, { weight: "60", reps: "8", completed: false }]);
  }

  function updateSet(index: number, field: "weight" | "reps", value: string) {
    setSets((previous) => previous.map((set, currentIndex) => (currentIndex === index ? { ...set, [field]: value } : set)));
  }

  function completeSet(index: number) {
    setSets((previous) => previous.map((set, currentIndex) => (currentIndex === index ? { ...set, completed: true } : set)));
    setTotalXP((currentXp) => currentXp + 10);
  }

  function resetFlow() {
    setStep(1);
    setSelectedMuscle("");
    setSelectedExercise("");
    setSearch("");
    setSets([{ weight: "60", reps: "8", completed: false }]);
    setTotalXP(0);
    setSessionDone(false);
  }

  if (sessionDone) {
    return (
      <div className="completion-card form-card">
        <div className="completion-orb">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 12 2 2 4-4" />
            <path d="M12 3a9 9 0 1 0 9 9" />
          </svg>
        </div>
        <div className="section-title">Session completed</div>
        <h1 className="hero-title" style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", maxWidth: "none" }}>
          Clean logging, better momentum.
        </h1>
        <p className="hero-copy" style={{ marginInline: "auto" }}>
          You completed {completedCount} sets of {selectedExercise}. The experience now feels more like a guided workflow than a plain form, which is the right direction for a startup product.
        </p>
        <div className="panel" style={{ maxWidth: "360px", margin: "1.8rem auto 0" }}>
          <div className="metric-label">Session XP earned</div>
          <div className="kpi-value" style={{ color: "var(--accent)" }}>
            +{totalXP}
          </div>
          <div className="helper-text" style={{ marginTop: "0.65rem" }}>
            Logged under {selectedMuscleMeta?.label ?? "your selected group"}
          </div>
        </div>
        <div className="hero-actions" style={{ justifyContent: "center" }}>
          <button type="button" onClick={resetFlow} className="secondary-button">
            Log another session
          </button>
          <Link href="/dashboard" className="primary-button">
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="form-shell">
      <section className="hero-panel">
        <div className="history-hero">
          <div>
            <div className="section-title">Guided workout capture</div>
            <h1 className="hero-title" style={{ fontSize: "clamp(2rem, 3vw, 3.2rem)", maxWidth: "13ch" }}>
              Logging a session should feel fast, focused, and premium.
            </h1>
            <p className="hero-copy">
              The flow below reduces noise, keeps the athlete in motion, and adds enough visual feedback to make the product feel alive.
            </p>
          </div>
          <div className="pill">Live XP: +{totalXP}</div>
        </div>
      </section>

      <div className="workflow-grid">
        <div className="page" style={{ gap: "1.25rem" }}>
          <section className="stepper">
            {[
              { id: 1, title: "Focus", note: "Pick a muscle group" },
              { id: 2, title: "Exercise", note: "Choose the movement" },
              { id: 3, title: "Sets", note: "Capture output" },
            ].map((item) => (
              <div key={item.id} className={`step-card ${step >= item.id ? "is-active" : ""}`}>
                <div className="step-number">{item.id}</div>
                <div style={{ marginTop: "0.85rem", fontWeight: 700 }}>{item.title}</div>
                <div className="helper-text" style={{ marginTop: "0.3rem" }}>
                  {item.note}
                </div>
              </div>
            ))}
          </section>

          {step === 1 && (
            <section className="form-card" style={{ padding: "1.4rem" }}>
              <div className="section-header">
                <div>
                  <div className="section-title">Step 1</div>
                  <div className="section-heading">Select muscle group</div>
                </div>
              </div>
              <div className="muscle-grid">
                {MUSCLE_GROUPS.map((muscle) => (
                  <button
                    type="button"
                    key={muscle.id}
                    className="muscle-card"
                    onClick={() => {
                      setSelectedMuscle(muscle.id);
                      setStep(2);
                    }}
                  >
                    <div className="badge-box" style={{ width: "3rem", height: "3rem", background: "var(--bg-soft)", color: "var(--accent)" }}>
                      {muscle.icon}
                    </div>
                    <div style={{ marginTop: "1rem", fontWeight: 700 }}>{muscle.label}</div>
                    <div className="helper-text" style={{ marginTop: "0.35rem", lineHeight: 1.5 }}>
                      {muscle.note}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="form-card" style={{ padding: "1.4rem" }}>
              <div className="section-header">
                <div>
                  <div className="section-title">Step 2</div>
                  <div className="section-heading">Select exercise</div>
                </div>
                <button type="button" onClick={() => setStep(1)} className="ghost-button">
                  Back
                </button>
              </div>

              <div className="search-wrap">
                <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  className="search-field"
                  type="text"
                  placeholder="Search exercises"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <div className="exercise-list" style={{ marginTop: "1rem" }}>
                {filteredExercises.map((exercise) => (
                  <button
                    type="button"
                    key={exercise}
                    className="exercise-card"
                    onClick={() => {
                      setSelectedExercise(exercise);
                      setStep(3);
                    }}
                  >
                    <div>
                      <div className="exercise-title">{exercise}</div>
                      <div className="helper-text" style={{ marginTop: "0.25rem", textTransform: "capitalize" }}>
                        {selectedMuscleMeta?.note}
                      </div>
                    </div>
                    <div className="pill">{selectedMuscleMeta?.label}</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="form-card" style={{ padding: "1.4rem" }}>
              <div className="section-header">
                <div>
                  <div className="section-title">Step 3</div>
                  <div className="section-heading">{selectedExercise}</div>
                  <div className="helper-text" style={{ marginTop: "0.35rem" }}>
                    Log weight and reps, then lock each completed set.
                  </div>
                </div>
                <button type="button" onClick={() => setStep(2)} className="ghost-button">
                  Back
                </button>
              </div>

              <div className="set-list">
                {sets.map((set, index) => (
                  <div key={index} className={`set-row ${set.completed ? "is-complete" : ""}`}>
                    <div className="set-grid">
                      <div className="set-index">{index + 1}</div>
                      <div>
                        <div className="form-label">Weight (kg)</div>
                        <input
                          className="number-input"
                          type="number"
                          value={set.weight}
                          disabled={set.completed}
                          onChange={(event) => updateSet(index, "weight", event.target.value)}
                        />
                      </div>
                      <div>
                        <div className="form-label">Reps</div>
                        <input
                          className="number-input"
                          type="number"
                          value={set.reps}
                          disabled={set.completed}
                          onChange={(event) => updateSet(index, "reps", event.target.value)}
                        />
                      </div>
                      <div>
                        <div className="form-label">Action</div>
                        {set.completed ? (
                          <div className="pill" style={{ marginTop: "0.45rem", color: "var(--success)" }}>
                            Completed
                          </div>
                        ) : (
                          <button type="button" onClick={() => completeSet(index)} className="primary-button" style={{ marginTop: "0.45rem", width: "100%" }}>
                            Complete set
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hero-actions">
                <button type="button" onClick={addSet} className="secondary-button">
                  Add set
                </button>
                <button
                  type="button"
                  onClick={() => setSessionDone(true)}
                  disabled={completedCount === 0}
                  className="primary-button"
                  style={{
                    opacity: completedCount === 0 ? 0.55 : 1,
                    pointerEvents: completedCount === 0 ? "none" : "auto",
                  }}
                >
                  Finish session ({completedCount}/{sets.length})
                </button>
              </div>
            </section>
          )}
        </div>

        <aside className="panel sidebar-metric">
          <div>
            <div className="section-title">Session snapshot</div>
            <div className="section-heading">Focused progress</div>
          </div>
          <div className="summary-card">
            <div className="metric-label">Muscle group</div>
            <div className="metric-value">{selectedMuscleMeta?.label ?? "Not selected"}</div>
          </div>
          <div className="summary-card">
            <div className="metric-label">Exercise</div>
            <div className="metric-value" style={{ fontSize: "1.1rem" }}>
              {selectedExercise || "Choose a movement"}
            </div>
          </div>
          <div className="summary-card">
            <div className="metric-label">Completed sets</div>
            <div className="kpi-value">{completedCount}</div>
          </div>
          <div className="summary-card">
            <div className="metric-label">XP earned</div>
            <div className="kpi-value" style={{ color: "var(--accent)" }}>
              +{totalXP}
            </div>
          </div>
          <div className="helper-text">
            This side panel gives the flow a stronger product feel and keeps the user oriented while they log.
          </div>
          <Link href="/dashboard" className="ghost-button">
            Exit to dashboard
          </Link>
        </aside>
      </div>
    </div>
  );
}
