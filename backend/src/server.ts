import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const prisma = new PrismaClient();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

const RECOVERY_HOURS: Record<string, number> = {
  legs: 96,
  back: 72,
  chest: 72,
  shoulders: 48,
  biceps: 48,
  triceps: 48,
  core: 24,
};

function publicUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    goal: user.fitness_goal,
    xp: user.xp,
    level: user.level,
    streak: user.streak,
    age: user.age,
    weightKg: user.weight_kg ? Number(user.weight_kg) : null,
    heightCm: user.height_cm ? Number(user.height_cm) : null,
    experienceLevel: user.experience_level,
  };
}

async function resolveUser(token?: string) {
  if (!token) return null;
  try {
    return await prisma.user.findUnique({ where: { id: token } });
  } catch (e) {
    return null;
  }
}

async function requireUser(token?: string) {
  const user = await resolveUser(token);
  if (!user) {
    return { error: { error: "Unauthorized" }, user: null };
  }
  return { error: null, user };
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password, goal } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    goal?: string;
  };

  if (!name || !email || !password || !goal) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password,
        fitness_goal: goal,
        experience_level: "intermediate",
      },
    });

    const sessionToken = user.id;

    return res.status(201).json({ sessionToken, user: publicUser(user) });
  } catch (e) {
    console.error("Signup error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const sessionToken = user.id;
    return res.json({ sessionToken, user: publicUser(user) });
  } catch (e) {
    console.error("Login error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/api/auth/onboard", async (req, res) => {
  const { token, age, weightKg, heightCm, experienceLevel, goal } = req.body as {
    token?: string;
    age?: number;
    weightKg?: number;
    heightCm?: number;
    experienceLevel?: string;
    goal?: string;
  };

  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const updatedUser = await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        ...(age !== undefined ? { age: Number(age) } : {}),
        ...(weightKg !== undefined ? { weight_kg: Number(weightKg) } : {}),
        ...(heightCm !== undefined ? { height_cm: Number(heightCm) } : {}),
        ...(experienceLevel !== undefined ? { experience_level: experienceLevel } : {}),
        ...(goal !== undefined ? { fitness_goal: goal } : {}),
      },
    });

    if (weightKg !== undefined) {
      await prisma.bodyMetric.create({
        data: {
          user_id: auth.user.id,
          weight_kg: Number(weightKg),
          recorded_at: new Date(),
        },
      });
    }

    return res.json({ user: publicUser(updatedUser) });
  } catch (e) {
    console.error("Onboarding update error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/auth/me", async (req, res) => {
  const token = req.query.token as string | undefined;
  const user = await resolveUser(token);

  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return res.json({ user: publicUser(user) });
});

app.get("/api/exercises", async (req, res) => {
  const { muscleGroup, search } = req.query as { muscleGroup?: string; search?: string };
  try {
    const exercises = await prisma.exercise.findMany({
      where: {
        ...(muscleGroup ? { muscle_group: muscleGroup.toLowerCase() } : {}),
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
    });
    res.json({ exercises });
  } catch (e) {
    console.error("Fetch exercises error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/sessions", async (req, res) => {
  const { token, muscleGroup } = req.body as { token?: string; muscleGroup?: string };
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  if (!muscleGroup) {
    return res.status(400).json({ error: "muscleGroup is required" });
  }

  try {
    const session = await prisma.workoutSession.create({
      data: {
        user_id: auth.user.id,
        muscle_group: muscleGroup.toLowerCase(),
        started_at: new Date(),
      },
    });
    return res.status(201).json({ session });
  } catch (e) {
    console.error("Create session error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/sets", async (req, res) => {
  const { token, sessionId, exerciseName, weight, reps, setNumber } = req.body as {
    token?: string;
    sessionId?: string;
    exerciseName?: string;
    weight?: number;
    reps?: number;
    setNumber?: number;
  };
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  if (!sessionId || !exerciseName || weight === undefined || reps === undefined || setNumber === undefined) {
    return res.status(400).json({ error: "Missing set fields." });
  }

  try {
    const session = await prisma.workoutSession.findFirst({
      where: { id: sessionId, user_id: auth.user.id },
    });
    if (!session) return res.status(404).json({ error: "Session not found" });

    const exercise = await prisma.exercise.findFirst({
      where: { name: { equals: exerciseName, mode: "insensitive" } },
    });
    if (!exercise) return res.status(404).json({ error: "Exercise not found" });

    // Auto-detect Personal Records (PR)
    const existingPr = await prisma.personalRecord.findFirst({
      where: {
        user_id: auth.user.id,
        exercise_id: exercise.id,
      },
      orderBy: { weight_kg: "desc" },
    });

    const isPr = !existingPr || weight > Number(existingPr.weight_kg || 0);

    if (isPr) {
      await prisma.personalRecord.create({
        data: {
          user_id: auth.user.id,
          exercise_id: exercise.id,
          weight_kg: weight,
          reps: reps,
          estimated_1rm: weight * (1 + reps / 30), // standard Epley formula for 1RM estimation
          achieved_at: new Date(),
        },
      });
    }

    const set = await prisma.workoutSet.create({
      data: {
        session_id: sessionId,
        exercise_id: exercise.id,
        set_number: setNumber,
        reps: reps,
        weight_kg: weight,
        is_pr: isPr,
        completed_at: new Date(),
      },
    });

    return res.status(201).json({ set });
  } catch (e) {
    console.error("Create set error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/api/sessions/:id/complete", async (req, res) => {
  const { token } = req.body as { token?: string };
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const session = await prisma.workoutSession.findFirst({
      where: { id: req.params.id, user_id: auth.user.id },
      include: { workout_sets: true },
    });

    if (!session) return res.status(404).json({ error: "Session not found" });

    const totalVolumeKg = session.workout_sets.reduce(
      (acc, set) => acc + Number(set.weight_kg || 0) * Number(set.reps || 0),
      0
    );
    const xpEarned = session.workout_sets.length * 10 + 100;

    const updatedSession = await prisma.workoutSession.update({
      where: { id: req.params.id },
      data: {
        completed_at: new Date(),
        total_volume_kg: totalVolumeKg,
        xp_earned: xpEarned,
      },
    });

    const newXp = auth.user.xp + xpEarned;
    const newLevel = Math.floor(newXp / 500) + 1;

    await prisma.xpTransaction.create({
      data: {
        user_id: auth.user.id,
        amount: xpEarned,
        reason: `Completed ${session.muscle_group} session`,
      },
    });

    let newStreak = auth.user.streak;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (auth.user.last_active_date) {
      const lastActive = new Date(auth.user.last_active_date);
      lastActive.setHours(0, 0, 0, 0);
      const diffTime = Math.abs(today.getTime() - lastActive.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        xp: newXp,
        level: newLevel,
        streak: newStreak,
        last_active_date: new Date(),
      },
    });

    return res.json({ session: updatedSession, xpEarned, totalVolumeKg, message: "Session completed!" });
  } catch (e) {
    console.error("Complete session error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/sessions", async (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const sessions = await prisma.workoutSession.findMany({
      where: {
        user_id: auth.user.id,
        completed_at: { not: null },
      },
      include: {
        workout_sets: {
          include: {
            exercise: true,
          },
        },
      },
      orderBy: { completed_at: "desc" },
    });

    const formattedSessions = sessions.map((session) => ({
      id: session.id,
      userId: session.user_id,
      muscleGroup: session.muscle_group,
      startedAt: session.started_at?.toISOString(),
      completedAt: session.completed_at?.toISOString(),
      totalVolumeKg: Number(session.total_volume_kg || 0),
      xpEarned: session.xp_earned,
      sets: session.workout_sets.map((set) => ({
        exerciseName: set.exercise.name,
        weight: Number(set.weight_kg || 0),
        reps: set.reps,
        setNumber: set.set_number,
      })),
    }));

    res.json({ sessions: formattedSessions });
  } catch (e) {
    console.error("Get sessions error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/agents/recovery", async (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  const muscleGroups = ["chest", "back", "shoulders", "legs", "biceps", "triceps", "core"];
  const recovery: Record<string, number> = {};

  try {
    for (const muscleGroup of muscleGroups) {
      const lastSession = await prisma.workoutSession.findFirst({
        where: {
          user_id: auth.user.id,
          muscle_group: muscleGroup.toLowerCase(),
          completed_at: { not: null },
        },
        orderBy: { completed_at: "desc" },
      });

      if (!lastSession) {
        recovery[muscleGroup] = 100;
        continue;
      }

      const hoursElapsed = (Date.now() - new Date(lastSession.completed_at!).getTime()) / 3_600_000;
      const volumeFactor = Math.min(Number(lastSession.total_volume_kg || 0) / 5000, 1.5);
      const score = Math.max(0, 100 - (hoursElapsed / RECOVERY_HOURS[muscleGroup]) * 100 * (volumeFactor || 1));
      recovery[muscleGroup] = Math.round(score);
    }

    res.json({ recovery });
  } catch (e) {
    console.error("Recovery calculation error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/dashboard", async (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const completedSessions = await prisma.workoutSession.findMany({
      where: {
        user_id: auth.user.id,
        completed_at: { not: null },
      },
      include: {
        workout_sets: true,
      },
      orderBy: { completed_at: "desc" },
    });

    const totalXP = auth.user.xp;
    const level = auth.user.level;
    const totalVolume = completedSessions.reduce((acc, session) => acc + Number(session.total_volume_kg || 0), 0);
    const thisWeekVolume = completedSessions
      .filter((session) => Date.now() - new Date(session.completed_at!).getTime() <= 7 * 24 * 60 * 60 * 1000)
      .reduce((acc, session) => acc + Number(session.total_volume_kg || 0), 0);

    const recentSessions = completedSessions.slice(0, 5).map((session) => ({
      id: session.id,
      muscle: session.muscle_group,
      date: session.completed_at?.toISOString(),
      volume: Number(session.total_volume_kg || 0),
      xp: session.xp_earned || 0,
      sets: session.workout_sets.length,
    }));

    res.json({
      totalSessions: completedSessions.length,
      totalXP,
      level,
      totalVolumeKg: totalVolume,
      weeklyVolumeKg: thisWeekVolume,
      recentSessions,
    });
  } catch (e) {
    console.error("Dashboard error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/metrics", async (req, res) => {
  const { token, weightKg, bodyFatPct, chestCm, waistCm, armCm, legCm } = req.body as {
    token?: string;
    weightKg?: number;
    bodyFatPct?: number;
    chestCm?: number;
    waistCm?: number;
    armCm?: number;
    legCm?: number;
  };

  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const metric = await prisma.bodyMetric.create({
      data: {
        user_id: auth.user.id,
        weight_kg: weightKg !== undefined ? Number(weightKg) : null,
        body_fat_pct: bodyFatPct !== undefined ? Number(bodyFatPct) : null,
        chest_cm: chestCm !== undefined ? Number(chestCm) : null,
        waist_cm: waistCm !== undefined ? Number(waistCm) : null,
        arm_cm: armCm !== undefined ? Number(armCm) : null,
        leg_cm: legCm !== undefined ? Number(legCm) : null,
        recorded_at: new Date(),
      },
    });

    if (weightKg !== undefined) {
      await prisma.user.update({
        where: { id: auth.user.id },
        data: { weight_kg: Number(weightKg) },
      });
    }

    return res.status(201).json({ metric });
  } catch (e) {
    console.error("Save metrics error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/metrics", async (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const metrics = await prisma.bodyMetric.findMany({
      where: { user_id: auth.user.id },
      orderBy: { recorded_at: "asc" },
    });

    const formattedMetrics = metrics.map((m) => ({
      id: m.id,
      weightKg: m.weight_kg ? Number(m.weight_kg) : null,
      bodyFatPct: m.body_fat_pct ? Number(m.body_fat_pct) : null,
      chestCm: m.chest_cm ? Number(m.chest_cm) : null,
      waistCm: m.waist_cm ? Number(m.waist_cm) : null,
      armCm: m.arm_cm ? Number(m.arm_cm) : null,
      legCm: m.leg_cm ? Number(m.leg_cm) : null,
      recordedAt: m.recorded_at.toISOString(),
    }));

    res.json({ metrics: formattedMetrics });
  } catch (e) {
    console.error("Get metrics error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/stats/exercises", async (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const sets = await prisma.workoutSet.findMany({
      where: {
        session: {
          user_id: auth.user.id,
          completed_at: { not: null },
        },
      },
      include: {
        exercise: true,
        session: true,
      },
      orderBy: { completed_at: "asc" },
    });

    const exerciseHistory: Record<string, any[]> = {};

    for (const set of sets) {
      const exName = set.exercise.name;
      if (!exerciseHistory[exName]) {
        exerciseHistory[exName] = [];
      }

      const weight = Number(set.weight_kg || 0);
      const reps = set.reps || 0;
      const estimated1Rm = weight * (1 + reps / 30);

      exerciseHistory[exName].push({
        date: set.completed_at ? set.completed_at.toISOString() : set.session.completed_at?.toISOString(),
        weight,
        reps,
        estimated1Rm: Math.round(estimated1Rm * 10) / 10,
        volume: weight * reps,
      });
    }

    res.json({ exerciseHistory });
  } catch (e) {
    console.error("Exercise stats error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/stats/volume", async (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const sessions = await prisma.workoutSession.findMany({
      where: {
        user_id: auth.user.id,
        completed_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        workout_sets: true,
      },
    });

    const volumeByMuscle: Record<string, number> = {};
    const muscleGroups = ["chest", "back", "shoulders", "legs", "biceps", "triceps", "core"];
    for (const muscle of muscleGroups) {
      volumeByMuscle[muscle] = 0;
    }

    for (const session of sessions) {
      if (!session.muscle_group) continue;
      const muscle = session.muscle_group.toLowerCase();
      const vol = session.workout_sets.reduce(
        (acc, set) => acc + Number(set.weight_kg || 0) * Number(set.reps || 0),
        0
      );
      volumeByMuscle[muscle] = (volumeByMuscle[muscle] || 0) + vol;
    }

    res.json({ volumeByMuscle });
  } catch (e) {
    console.error("Volume stats error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`\n  Nextyra API running at http://localhost:${port}`);
  console.log(`  Health: http://localhost:${port}/health`);
  console.log(`  Exercises: http://localhost:${port}/api/exercises`);
  console.log(`  Recovery: http://localhost:${port}/api/agents/recovery\n`);
});
