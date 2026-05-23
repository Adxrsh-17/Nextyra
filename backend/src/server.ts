import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  goal: string;
  createdAt: string;
};

type WorkoutSet = {
  exerciseName: string;
  weight: number;
  reps: number;
  setNumber: number;
};

type Session = {
  id: string;
  userId: string;
  muscleGroup: string;
  startedAt: string;
  completedAt?: string;
  totalVolumeKg?: number;
  xpEarned?: number;
  sets: WorkoutSet[];
};

const users: User[] = [
  {
    id: "demo-user",
    name: "Athlete",
    email: "athlete@nextyra.com",
    password: "demo1234",
    goal: "Build muscle",
    createdAt: new Date().toISOString(),
  },
];

const sessions: Session[] = [];
const sessionTokens = new Map<string, string>();

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

const RECOVERY_HOURS: Record<string, number> = {
  legs: 96,
  back: 72,
  chest: 72,
  shoulders: 48,
  biceps: 48,
  triceps: 48,
  core: 24,
};

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    goal: user.goal,
  };
}

function resolveUser(token?: string) {
  if (!token) return null;
  const userId = sessionTokens.get(token);
  if (!userId) return null;
  return users.find((candidate) => candidate.id === userId) ?? null;
}

function requireUser(token?: string) {
  const user = resolveUser(token);
  if (!user) {
    return { error: { error: "Unauthorized" }, user: null };
  }

  return { error: null, user };
}

function userSessions(userId: string) {
  return sessions.filter((session) => session.userId === userId);
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/auth/signup", (req, res) => {
  const { name, email, password, goal } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    goal?: string;
  };

  if (!name || !email || !password || !goal) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const existingUser = users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const user: User = {
    id: generateId(),
    name,
    email,
    password,
    goal,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  const sessionToken = generateId();
  sessionTokens.set(sessionToken, user.id);

  return res.status(201).json({ sessionToken, user: publicUser(user) });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  const user = users.find((candidate) => candidate.email.toLowerCase() === email?.toLowerCase());

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const sessionToken = generateId();
  sessionTokens.set(sessionToken, user.id);
  return res.json({ sessionToken, user: publicUser(user) });
});

app.get("/api/auth/me", (req, res) => {
  const token = req.query.token as string | undefined;
  const user = resolveUser(token);

  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return res.json({ user: publicUser(user) });
});

app.get("/api/exercises", (req, res) => {
  const { muscleGroup, search } = req.query as { muscleGroup?: string; search?: string };
  let results = EXERCISES;
  if (muscleGroup) results = results.filter((exercise) => exercise.muscle_group === muscleGroup.toLowerCase());
  if (search) results = results.filter((exercise) => exercise.name.toLowerCase().includes(search.toLowerCase()));
  res.json({ exercises: results });
});

app.post("/api/sessions", (req, res) => {
  const { token, muscleGroup } = req.body as { token?: string; muscleGroup?: string };
  const auth = requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  if (!muscleGroup) {
    return res.status(400).json({ error: "muscleGroup is required" });
  }

  const session: Session = {
    id: generateId(),
    userId: auth.user.id,
    muscleGroup,
    startedAt: new Date().toISOString(),
    sets: [],
  };

  sessions.push(session);
  return res.status(201).json({ session });
});

app.post("/api/sets", (req, res) => {
  const { token, sessionId, exerciseName, weight, reps, setNumber } = req.body as {
    token?: string;
    sessionId?: string;
    exerciseName?: string;
    weight?: number;
    reps?: number;
    setNumber?: number;
  };
  const auth = requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  const session = sessions.find((candidate) => candidate.id === sessionId && candidate.userId === auth.user.id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  if (!exerciseName || !weight || !reps || !setNumber) {
    return res.status(400).json({ error: "Missing set fields." });
  }

  const set: WorkoutSet = { exerciseName, weight, reps, setNumber };
  session.sets.push(set);
  return res.status(201).json({ set });
});

app.patch("/api/sessions/:id/complete", (req, res) => {
  const { token } = req.body as { token?: string };
  const auth = requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  const session = sessions.find((candidate) => candidate.id === req.params.id && candidate.userId === auth.user.id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const totalVolumeKg = session.sets.reduce((accumulator, set) => accumulator + set.weight * set.reps, 0);
  const xpEarned = session.sets.length * 10 + 100;

  session.completedAt = new Date().toISOString();
  session.totalVolumeKg = totalVolumeKg;
  session.xpEarned = xpEarned;

  return res.json({ session, xpEarned, totalVolumeKg, message: "Session completed!" });
});

app.get("/api/sessions", (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  const completed = userSessions(auth.user.id).filter((session) => !!session.completedAt);
  res.json({ sessions: completed.sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()) });
});

app.get("/api/agents/recovery", (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  const muscleGroups = ["chest", "back", "shoulders", "legs", "biceps", "triceps", "core"];
  const recovery: Record<string, number> = {};

  for (const muscleGroup of muscleGroups) {
    const lastSession = userSessions(auth.user.id)
      .filter((session) => session.muscleGroup === muscleGroup && !!session.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];

    if (!lastSession) {
      recovery[muscleGroup] = 100;
      continue;
    }

    const hoursElapsed = (Date.now() - new Date(lastSession.completedAt!).getTime()) / 3_600_000;
    const volumeFactor = Math.min((lastSession.totalVolumeKg || 0) / 5000, 1.5);
    const score = Math.max(0, 100 - (hoursElapsed / RECOVERY_HOURS[muscleGroup]) * 100 * (volumeFactor || 1));
    recovery[muscleGroup] = Math.round(score);
  }

  res.json({ recovery });
});

app.get("/api/dashboard", (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  const completed = userSessions(auth.user.id).filter((session) => !!session.completedAt);
  const totalXP = completed.reduce((accumulator, session) => accumulator + (session.xpEarned || 0), 0);
  const level = Math.floor(totalXP / 500) + 1;
  const totalVolume = completed.reduce((accumulator, session) => accumulator + (session.totalVolumeKg || 0), 0);
  const thisWeekVolume = completed
    .filter((session) => Date.now() - new Date(session.completedAt!).getTime() <= 7 * 24 * 60 * 60 * 1000)
    .reduce((accumulator, session) => accumulator + (session.totalVolumeKg || 0), 0);

  res.json({
    totalSessions: completed.length,
    totalXP,
    level,
    totalVolumeKg: totalVolume,
    weeklyVolumeKg: thisWeekVolume,
    recentSessions: completed.slice(0, 5).map((session) => ({
      id: session.id,
      muscle: session.muscleGroup,
      date: session.completedAt,
      volume: session.totalVolumeKg || 0,
      xp: session.xpEarned || 0,
      sets: session.sets.length,
    })),
  });
});

app.listen(port, () => {
  console.log(`\n  Nextyra API running at http://localhost:${port}`);
  console.log(`  Health: http://localhost:${port}/health`);
  console.log(`  Exercises: http://localhost:${port}/api/exercises`);
  console.log(`  Recovery: http://localhost:${port}/api/agents/recovery\n`);
});
