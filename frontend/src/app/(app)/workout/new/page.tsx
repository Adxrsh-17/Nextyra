"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";

const MUSCLE_GROUPS = [
  { id: "chest", label: "Chest", icon: "CH", note: "Push strength and chest volume" },
  { id: "back", label: "Back", icon: "BK", note: "Rows, pulls, and posterior chain" },
  { id: "shoulders", label: "Shoulders", icon: "SH", note: "Pressing power and stability" },
  { id: "legs", label: "Legs", icon: "LG", note: "Primary lower-body session" },
  { id: "biceps", label: "Biceps", icon: "BI", note: "Accessory arm work" },
  { id: "triceps", label: "Triceps", icon: "TR", note: "Lockout and extension focus" },
  { id: "core", label: "Core", icon: "CR", note: "Bracing and trunk control" },
];

const DEFAULT_EXERCISES: Record<string, string[]> = {
  chest: ["Barbell Bench Press", "Incline Dumbbell Press", "Cable Crossovers"],
  back: ["Deadlift", "Pull-ups", "Lat Pulldown"],
  shoulders: ["Overhead Press", "Lateral Raises", "Arnold Press"],
  legs: ["Squat", "Leg Press", "Lunges"],
  biceps: ["Barbell Curl", "Hammer Curls", "Preacher Curl"],
  triceps: ["Tricep Pushdown", "Skull Crushers", "Dips"],
  core: ["Plank", "Russian Twists", "Cable Crunches"],
};

const COACH_STARTERS = [
  "I feel tired but want to train legs today",
  "I'm feeling strong, give me a chest session",
  "I'm stressed and want a lighter recovery day",
];

const AGENT_NAME = "PulsePilot";
const COACH_WELCOME =
  "I am PulsePilot, your adaptive training agent. Tell me how your body and mind feel today, and I will rebuild the session intensity, movement choice, and set structure for you.";

type SetRow = { weight: string; reps: string; completed: boolean };
type ExerciseResponse = { exercises: Array<{ id: string; name: string }> };
type CoachMessage = { role: "assistant" | "user"; content: string };
type Mood = "recovery" | "steady" | "push";

function readToken() {
  return typeof window === "undefined" ? "" : window.localStorage.getItem("nextyra-session-token") ?? "";
}

function createSetPlan(mood: Mood): SetRow[] {
  if (mood === "recovery") {
    return [
      { weight: "40", reps: "12", completed: false },
      { weight: "40", reps: "12", completed: false },
      { weight: "35", reps: "15", completed: false },
    ];
  }

  if (mood === "push") {
    return [
      { weight: "70", reps: "6", completed: false },
      { weight: "70", reps: "6", completed: false },
      { weight: "65", reps: "8", completed: false },
      { weight: "60", reps: "10", completed: false },
    ];
  }

  return [
    { weight: "60", reps: "8", completed: false },
    { weight: "60", reps: "8", completed: false },
    { weight: "55", reps: "10", completed: false },
  ];
}

function inferMuscle(prompt: string) {
  const lower = prompt.toLowerCase();
  return MUSCLE_GROUPS.find((group) => lower.includes(group.id) || lower.includes(group.label.toLowerCase()))?.id ?? "legs";
}

function inferMood(prompt: string): Mood {
  const lower = prompt.toLowerCase();
  if (["tired", "sore", "stressed", "low", "recovery", "light"].some((word) => lower.includes(word))) {
    return "recovery";
  }
  if (["strong", "energetic", "great", "push", "intense", "hard"].some((word) => lower.includes(word))) {
    return "push";
  }
  return "steady";
}

function buildCoachReply(muscle: string, mood: Mood, exercise: string) {
  const label = muscle.charAt(0).toUpperCase() + muscle.slice(1);

  if (mood === "recovery") {
    return `You sound a bit drained, so I shifted today into a lighter ${label} session. I picked ${exercise} with higher reps and lower weight to keep momentum without frying recovery.`;
  }

  if (mood === "push") {
    return `You sound ready to push, so I built a heavier ${label} day around ${exercise}. I set it up with lower-rep working sets first, then back-off volume to finish strong.`;
  }

  return `You sound balanced, so I built a standard ${label} session around ${exercise}. It is a solid productive workout without overcomplicating the day.`;
}

function buildPlanLabel(mood: Mood) {
  if (mood === "recovery") return "Recovery-preserving plan";
  if (mood === "push") return "Performance push plan";
  return "Balanced progression plan";
}

export default function NewWorkoutPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedMuscle, setSelectedMuscle] = useState("");
  const [selectedExercise, setSelectedExercise] = useState("");
  const [search, setSearch] = useState("");
  const [exerciseOptions, setExerciseOptions] = useState<string[]>([]);
  const [sets, setSets] = useState<SetRow[]>([{ weight: "60", reps: "8", completed: false }]);
  const [totalXP, setTotalXP] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [coachInput, setCoachInput] = useState("");
  const [coachMood, setCoachMood] = useState<Mood>("steady");
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([{ role: "assistant", content: COACH_WELCOME }]);

  const token = readToken();
  const selectedMuscleMeta = MUSCLE_GROUPS.find((group) => group.id === selectedMuscle);
  const completedCount = sets.filter((set) => set.completed).length;

  useEffect(() => {
    if (!selectedMuscle) return;

    const query = new URLSearchParams({
      muscleGroup: selectedMuscle,
      search,
    });

    apiFetch<ExerciseResponse>(`/api/exercises?${query.toString()}`).then((response) => {
      const items = response.exercises.map((exercise) => exercise.name);
      setExerciseOptions(items.length ? items : DEFAULT_EXERCISES[selectedMuscle] ?? []);
    });
  }, [search, selectedMuscle]);

  const sessionVolume = useMemo(() => {
    return sets.reduce((total, set) => total + Number(set.weight || 0) * Number(set.reps || 0), 0);
  }, [sets]);

  async function startSession(muscleGroup: string) {
    const response = await apiFetch<{ session: { id: string } }>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ token, muscleGroup }),
    });

    setSessionId(response.session.id);
  }

  async function prepareWorkout(muscleGroup: string, exercise: string, nextSets: SetRow[], mood?: Mood) {
    setError("");
    setSelectedMuscle(muscleGroup);
    setSelectedExercise(exercise);
    setExerciseOptions(DEFAULT_EXERCISES[muscleGroup] ?? [exercise]);
    setSets(nextSets);
    setSessionId("");
    setTotalXP(0);
    setStep(3);
    if (mood) setCoachMood(mood);
    await startSession(muscleGroup);
  }

  async function runCoach(prompt: string) {
    const muscle = inferMuscle(prompt);
    const mood = inferMood(prompt);
    const exercise = DEFAULT_EXERCISES[muscle][0];
    const nextSets = createSetPlan(mood);

    setCoachMessages((current) => [...current, { role: "user", content: prompt }]);
    await prepareWorkout(muscle, exercise, nextSets, mood);
    setCoachMessages((current) => [...current, { role: "assistant", content: buildCoachReply(muscle, mood, exercise) }]);
    setCoachInput("");
  }

  function addSet() {
    const template = coachMood === "recovery" ? { weight: "35", reps: "15", completed: false } : coachMood === "push" ? { weight: "60", reps: "8", completed: false } : { weight: "55", reps: "10", completed: false };
    setSets((previous) => [...previous, template]);
  }

  function updateSet(index: number, field: "weight" | "reps", value: string) {
    setSets((previous) => previous.map((set, currentIndex) => (currentIndex === index ? { ...set, [field]: value } : set)));
  }

  async function completeSet(index: number) {
    if (!sessionId || !selectedExercise) return;

    const set = sets[index];
    try {
      await apiFetch("/api/sets", {
        method: "POST",
        body: JSON.stringify({
          token,
          sessionId,
          exerciseName: selectedExercise,
          weight: Number(set.weight),
          reps: Number(set.reps),
          setNumber: index + 1,
        }),
      });

      setSets((previous) => previous.map((entry, currentIndex) => (currentIndex === index ? { ...entry, completed: true } : entry)));
      setTotalXP((currentXp) => currentXp + 10);
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Unable to save the set.");
    }
  }

  async function finishSession() {
    if (!sessionId) return;
    setSaving(true);
    setError("");

    try {
      const response = await apiFetch<{ xpEarned: number }>("/api/sessions/" + sessionId + "/complete", {
        method: "PATCH",
        body: JSON.stringify({ token }),
      });

      setTotalXP(response.xpEarned);
      setSessionDone(true);
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Unable to finish the session.");
    } finally {
      setSaving(false);
    }
  }

  function resetFlow() {
    setStep(1);
    setSelectedMuscle("");
    setSelectedExercise("");
    setSearch("");
    setExerciseOptions([]);
    setSets([{ weight: "60", reps: "8", completed: false }]);
    setTotalXP(0);
    setSessionDone(false);
    setSessionId("");
    setError("");
    setCoachMood("steady");
    setCoachMessages([{ role: "assistant", content: COACH_WELCOME }]);
    setCoachInput("");
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
        <div className="section-title">Workout complete</div>
        <h1 className="hero-title" style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", maxWidth: "none" }}>
          Saved, scored, and ready for tomorrow&apos;s coaching.
        </h1>
        <p className="hero-copy" style={{ marginInline: "auto" }}>
          You completed {completedCount} sets of {selectedExercise}, tracked {sessionVolume.toLocaleString()} kg of volume, and earned {totalXP} XP.
        </p>
        <div className="hero-actions" style={{ justifyContent: "center" }}>
          <button type="button" onClick={resetFlow} className="secondary-button">
            Log another workout
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
              Tell PulsePilot how you feel and let the workout adapt.
            </h1>
            <p className="hero-copy">
              This is not a generic chat tool. PulsePilot reads your state, decides the training mode, and builds the day around that decision so the workout changes with the athlete.
            </p>
          </div>
          <div className="pill">{AGENT_NAME} active • Live XP: +{totalXP}</div>
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
                    onClick={async () => {
                      await prepareWorkout(muscle.id, DEFAULT_EXERCISES[muscle.id][0], createSetPlan("steady"), "steady");
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
                <input className="search-field" type="text" placeholder="Search exercises" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>

              <div className="exercise-list" style={{ marginTop: "1rem" }}>
                {exerciseOptions.map((exercise) => (
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
                    {buildPlanLabel(coachMood)}: {coachMood === "recovery" ? "lighter recovery session" : coachMood === "push" ? "higher intensity push session" : "balanced standard session"}.
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
                        <input className="number-input" type="number" value={set.weight} disabled={set.completed} onChange={(event) => updateSet(index, "weight", event.target.value)} />
                      </div>
                      <div>
                        <div className="form-label">Reps</div>
                        <input className="number-input" type="number" value={set.reps} disabled={set.completed} onChange={(event) => updateSet(index, "reps", event.target.value)} />
                      </div>
                      <div>
                        <div className="form-label">Action</div>
                        {set.completed ? (
                          <div className="pill" style={{ marginTop: "0.45rem", color: "var(--success)" }}>
                            Completed
                          </div>
                        ) : (
                          <button type="button" onClick={() => completeSet(index)} className="primary-button" style={{ marginTop: "0.45rem", width: "100%" }}>
                            Save set
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {error ? <p className="auth-error">{error}</p> : null}

              <div className="hero-actions">
                <button type="button" onClick={addSet} className="secondary-button">
                  Add set
                </button>
                <button type="button" onClick={finishSession} disabled={completedCount === 0 || saving} className="primary-button" style={{ opacity: completedCount === 0 || saving ? 0.55 : 1 }}>
                  {saving ? "Finishing..." : `Finish workout (${completedCount}/${sets.length})`}
                </button>
              </div>
            </section>
          )}
        </div>

        <aside className="panel sidebar-metric coach-cockpit">
          <div className="coach-feature-head">
            <div className="coach-feature-badge">{AGENT_NAME}</div>
            <div>
              <div className="section-title">Signature feature</div>
              <div className="section-heading">Adaptive workout agent</div>
            </div>
          </div>

          <div className="coach-value-card">
            <div className="metric-label">What makes it premium</div>
            <div className="coach-value-copy">
              PulsePilot changes the workout based on fatigue, stress, and readiness instead of forcing the same plan every day.
            </div>
          </div>

          <div className="coach-decision-grid">
            <div className="summary-card">
              <div className="metric-label">Today&apos;s mode</div>
              <div className="metric-value">{buildPlanLabel(coachMood)}</div>
            </div>
            <div className="summary-card">
              <div className="metric-label">Decision basis</div>
              <div className="metric-value" style={{ fontSize: "1rem" }}>
                {coachMood === "recovery" ? "Fatigue or stress detected" : coachMood === "push" ? "High-energy push signal" : "Stable readiness signal"}
              </div>
            </div>
          </div>

          <div className="coach-chat">
            {coachMessages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`coach-bubble ${message.role === "assistant" ? "coach-bubble-assistant" : "coach-bubble-user"}`}>
                {message.content}
              </div>
            ))}
          </div>

          <div className="coach-suggestions">
            {COACH_STARTERS.map((starter) => (
              <button key={starter} type="button" className="coach-chip" onClick={() => void runCoach(starter)}>
                {starter}
              </button>
            ))}
          </div>

          <form
            className="coach-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!coachInput.trim()) return;
              void runCoach(coachInput.trim());
            }}
          >
            <textarea
              className="coach-input"
              placeholder="Example: I feel sore and low energy, but I still want to train back."
              value={coachInput}
              onChange={(event) => setCoachInput(event.target.value)}
            />
            <button type="submit" className="primary-button" style={{ width: "100%" }}>
              Let {AGENT_NAME} build today&apos;s workout
            </button>
          </form>

          <div className="summary-card">
            <div className="metric-label">Muscle group</div>
            <div className="metric-value">{selectedMuscleMeta?.label ?? "Not selected"}</div>
          </div>
          <div className="summary-card">
            <div className="metric-label">Exercise</div>
            <div className="metric-value" style={{ fontSize: "1.1rem" }}>
              {selectedExercise || "Coach will pick a movement"}
            </div>
          </div>
          <div className="summary-card">
            <div className="metric-label">Completed sets</div>
            <div className="kpi-value">{completedCount}</div>
          </div>
          <div className="summary-card">
            <div className="metric-label">Session volume</div>
            <div className="kpi-value" style={{ color: "var(--accent)" }}>
              {sessionVolume.toLocaleString()}
            </div>
          </div>
          <Link href="/dashboard" className="ghost-button">
            Exit to dashboard
          </Link>
        </aside>
      </div>
    </div>
  );
}
