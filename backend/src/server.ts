import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// ────────────────────────────────────────────────
// HEALTH
// ────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ────────────────────────────────────────────────
// EXERCISES
// ────────────────────────────────────────────────
const EXERCISES = [
  { id: "1", name: "Barbell Bench Press", muscle_group: "chest", equipment: "barbell", difficulty: "intermediate" },
  { id: "2", name: "Incline Dumbbell Press", muscle_group: "chest", equipment: "dumbbell", difficulty: "intermediate" },
  { id: "3", name: "Cable Crossovers", muscle_group: "chest", equipment: "cable", difficulty: "beginner" },
  { id: "4", name: "Push-ups", muscle_group: "chest", equipment: "bodyweight", difficulty: "beginner" },
  { id: "5", name: "Dumbbell Flyes", muscle_group: "chest", equipment: "dumbbell", difficulty: "beginner" },
  { id: "6", name: "Deadlift", muscle_group: "back", equipment: "barbell", difficulty: "advanced" },
  { id: "7", name: "Pull-ups", muscle_group: "back", equipment: "bodyweight", difficulty: "intermediate" },
  { id: "8", name: "Barbell Row", muscle_group: "back", equipment: "barbell", difficulty: "intermediate" },
  { id: "9", name: "Lat Pulldown", muscle_group: "back", equipment: "cable", difficulty: "beginner" },
  { id: "10", name: "Seated Cable Row", muscle_group: "back", equipment: "cable", difficulty: "beginner" },
  { id: "11", name: "Overhead Press", muscle_group: "shoulders", equipment: "barbell", difficulty: "intermediate" },
  { id: "12", name: "Lateral Raises", muscle_group: "shoulders", equipment: "dumbbell", difficulty: "beginner" },
  { id: "13", name: "Front Raises", muscle_group: "shoulders", equipment: "dumbbell", difficulty: "beginner" },
  { id: "14", name: "Face Pulls", muscle_group: "shoulders", equipment: "cable", difficulty: "beginner" },
  { id: "15", name: "Arnold Press", muscle_group: "shoulders", equipment: "dumbbell", difficulty: "intermediate" },
  { id: "16", name: "Squat", muscle_group: "legs", equipment: "barbell", difficulty: "advanced" },
  { id: "17", name: "Leg Press", muscle_group: "legs", equipment: "machine", difficulty: "beginner" },
  { id: "18", name: "Lunges", muscle_group: "legs", equipment: "dumbbell", difficulty: "intermediate" },
  { id: "19", name: "Leg Extensions", muscle_group: "legs", equipment: "machine", difficulty: "beginner" },
  { id: "20", name: "Leg Curls", muscle_group: "legs", equipment: "machine", difficulty: "beginner" },
  { id: "21", name: "Barbell Curl", muscle_group: "biceps", equipment: "barbell", difficulty: "beginner" },
  { id: "22", name: "Hammer Curls", muscle_group: "biceps", equipment: "dumbbell", difficulty: "beginner" },
  { id: "23", name: "Preacher Curl", muscle_group: "biceps", equipment: "machine", difficulty: "intermediate" },
  { id: "24", name: "Concentration Curls", muscle_group: "biceps", equipment: "dumbbell", difficulty: "beginner" },
  { id: "25", name: "Tricep Pushdown", muscle_group: "triceps", equipment: "cable", difficulty: "beginner" },
  { id: "26", name: "Skull Crushers", muscle_group: "triceps", equipment: "barbell", difficulty: "intermediate" },
  { id: "27", name: "Overhead Tricep Extension", muscle_group: "triceps", equipment: "dumbbell", difficulty: "intermediate" },
  { id: "28", name: "Dips", muscle_group: "triceps", equipment: "bodyweight", difficulty: "advanced" },
  { id: "29", name: "Crunches", muscle_group: "core", equipment: "bodyweight", difficulty: "beginner" },
  { id: "30", name: "Plank", muscle_group: "core", equipment: "bodyweight", difficulty: "beginner" },
  { id: "31", name: "Russian Twists", muscle_group: "core", equipment: "bodyweight", difficulty: "intermediate" },
  { id: "32", name: "Leg Raises", muscle_group: "core", equipment: "bodyweight", difficulty: "intermediate" },
  { id: "33", name: "Cable Crunches", muscle_group: "core", equipment: "cable", difficulty: "intermediate" },
];

// GET /api/exercises?muscleGroup=chest&search=bench
app.get("/api/exercises", (req, res) => {
  const { muscleGroup, search } = req.query as { muscleGroup?: string; search?: string };
  let results = EXERCISES;
  if (muscleGroup) results = results.filter((e) => e.muscle_group === muscleGroup.toLowerCase());
  if (search) results = results.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));
  res.json({ exercises: results });
});

// ────────────────────────────────────────────────
// SESSIONS (in-memory for MVP — swap with Prisma when DB is ready)
// ────────────────────────────────────────────────
type WorkoutSet = { exerciseName: string; weight: number; reps: number; setNumber: number };
type Session = {
  id: string;
  muscleGroup: string;
  startedAt: string;
  completedAt?: string;
  totalVolumeKg?: number;
  xpEarned?: number;
  sets: WorkoutSet[];
};

const sessions: Session[] = [];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

// POST /api/sessions — start a session
app.post("/api/sessions", (req, res) => {
  const { muscleGroup } = req.body as { muscleGroup: string };
  if (!muscleGroup) {
    return res.status(400).json({ error: "muscleGroup is required" });
  }
  const session: Session = {
    id: generateId(),
    muscleGroup,
    startedAt: new Date().toISOString(),
    sets: [],
  };
  sessions.push(session);
  return res.status(201).json({ session });
});

// POST /api/sets — log a set
app.post("/api/sets", (req, res) => {
  const { sessionId, exerciseName, weight, reps, setNumber } = req.body as {
    sessionId: string; exerciseName: string; weight: number; reps: number; setNumber: number;
  };
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  const set: WorkoutSet = { exerciseName, weight, reps, setNumber };
  session.sets.push(set);
  return res.status(201).json({ set });
});

// PATCH /api/sessions/:id/complete — finalize session, award XP
app.patch("/api/sessions/:id/complete", (req, res) => {
  const session = sessions.find((s) => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  const totalVolumeKg = session.sets.reduce((acc, s) => acc + s.weight * s.reps, 0);
  const xpEarned = session.sets.length * 10 + 100; // 10 XP per set + 100 base
  session.completedAt = new Date().toISOString();
  session.totalVolumeKg = totalVolumeKg;
  session.xpEarned = xpEarned;
  return res.json({ session, xpEarned, totalVolumeKg, message: "Session completed!" });
});

// GET /api/sessions — list sessions
app.get("/api/sessions", (_req, res) => {
  const completed = sessions.filter((s) => !!s.completedAt);
  res.json({ sessions: completed });
});

// ────────────────────────────────────────────────
// RECOVERY AGENT
// ────────────────────────────────────────────────
const RECOVERY_HOURS: Record<string, number> = {
  legs: 96, back: 72, chest: 72, shoulders: 48, biceps: 48, triceps: 48, core: 24,
};

app.get("/api/agents/recovery", (_req, res) => {
  const muscleGroups = ["chest", "back", "shoulders", "legs", "biceps", "triceps", "core"];
  const recovery: Record<string, number> = {};
  for (const mg of muscleGroups) {
    const lastSession = sessions
      .filter((s) => s.muscleGroup === mg && !!s.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];
    if (!lastSession) {
      recovery[mg] = 100;
    } else {
      const hoursElapsed = (Date.now() - new Date(lastSession.completedAt!).getTime()) / 3_600_000;
      const volumeFactor = Math.min((lastSession.totalVolumeKg || 0) / 5000, 1.5);
      const score = Math.max(0, 100 - (hoursElapsed / RECOVERY_HOURS[mg]) * 100 * (volumeFactor || 1));
      recovery[mg] = Math.round(score);
    }
  }
  res.json({ recovery });
});

// ────────────────────────────────────────────────
// DASHBOARD SUMMARY
// ────────────────────────────────────────────────
app.get("/api/dashboard", (_req, res) => {
  const completed = sessions.filter((s) => !!s.completedAt);
  const totalXP = completed.reduce((acc, s) => acc + (s.xpEarned || 0), 0);
  const level = Math.floor(totalXP / 500) + 1;
  const totalVolume = completed.reduce((acc, s) => acc + (s.totalVolumeKg || 0), 0);
  res.json({
    totalSessions: completed.length,
    totalXP,
    level,
    totalVolumeKg: totalVolume,
    recentSessions: completed.slice(-5).reverse(),
  });
});

app.listen(port, () => {
  console.log(`\n  🚀 Nextyra API running at http://localhost:${port}`);
  console.log(`  📋 Health: http://localhost:${port}/health`);
  console.log(`  💪 Exercises: http://localhost:${port}/api/exercises`);
  console.log(`  📊 Recovery: http://localhost:${port}/api/agents/recovery\n`);
});
