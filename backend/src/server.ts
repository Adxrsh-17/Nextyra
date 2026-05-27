import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { stripe } from "./lib/stripe";
import { generateText } from "./lib/llm";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const prisma = new PrismaClient();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json({
  verify: (req: any, _res, buf) => {
    if (req.originalUrl.startsWith("/api/payments/webhook")) {
      req.rawBody = buf;
    }
  }
}));

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
    subscriptionTier: user.subscription_tier,
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

app.get("/api/notifications/streak-risk", async (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const { getStreakRiskNotification } = await import("./lib/gamification");
    const notification = await getStreakRiskNotification(prisma, auth.user.id);
    return res.json(notification);
  } catch (e) {
    console.error("Streak notification error:", e);
    return res.status(500).json({ error: "Failed to compute streak risk" });
  }
});

app.post("/api/cron/gamification", async (req, res) => {
  const token = req.body?.token as string | undefined;
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const { getOrCreateDailyMissions, getStreakRiskNotification, buildMonthlyChallenge } = await import("./lib/gamification");
    const missions = await getOrCreateDailyMissions(prisma, auth.user.id);
    const streakNotification = await getStreakRiskNotification(prisma, auth.user.id);
    const monthlyChallenge = await buildMonthlyChallenge(prisma, auth.user.id);
    return res.json({ missions, streakNotification, monthlyChallenge });
  } catch (e) {
    console.error("Gamification cron error:", e);
    return res.status(500).json({ error: "Failed to run gamification cron" });
  }
});

app.post("/api/streak-freezes/use", async (req, res) => {
  const { token } = req.body as { token?: string };
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const { useStreakFreeze } = await import("./lib/gamification");
    const result = await useStreakFreeze(prisma, auth.user.id);
    return res.json(result);
  } catch (e) {
    console.error("Use streak freeze error:", e);
    return res.status(500).json({ error: "Failed to use streak freeze" });
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
    const { awardSessionXp } = await import("./lib/gamification");
    const result = await awardSessionXp(prisma, auth.user.id, req.params.id);
    const updatedSession = await prisma.workoutSession.findUnique({ where: { id: req.params.id } });

    const { computeUserPatterns } = await import("./lib/agents");
    computeUserPatterns(prisma, auth.user).catch((err: any) => {
      console.error("Async user pattern computation failed:", err);
    });

    return res.json({ session: updatedSession, ...result, message: "Session completed!" });
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

// Planner endpoint - generate a weekly plan for the authenticated user
app.post("/api/agents/planner", async (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const { generateWeeklyPlan } = await import("./lib/agents");
    const result = await generateWeeklyPlan(prisma, auth.user);
    return res.json(result);
  } catch (e) {
    console.error("Planner error:", e);
    return res.status(500).json({ error: "Planner failed" });
  }
});

// Orchestrator endpoint - run planner + analysis and synthesize outputs
app.post("/api/agents/orchestrator", async (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const { orchestrate } = await import("./lib/agents");
    const context = req.body?.context ?? {};
    const result = await orchestrate(prisma, auth.user, context);
    return res.json(result);
  } catch (e) {
    console.error("Orchestrator error:", e);
    return res.status(500).json({ error: "Orchestrator failed" });
  }
});

// Performance analysis endpoint - detect plateaus/flags
app.get("/api/agents/performance", async (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const { analyzePerformance } = await import("./lib/agents");
    const report = await analyzePerformance(prisma, auth.user);
    return res.json(report);
  } catch (e) {
    console.error("Performance analysis error:", e);
    return res.status(500).json({ error: "Performance analysis failed" });
  }
});

// Predictive intelligence endpoint - forecast strength, consistency, plateaus, and body trends
app.get("/api/agents/predictive", async (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const { buildPredictiveSummary } = await import("./lib/predictive");
    const result = await buildPredictiveSummary(prisma, auth.user);
    return res.json(result);
  } catch (e) {
    console.error("Predictive analysis error:", e);
    return res.status(500).json({ error: "Predictive analysis failed" });
  }
});

// Motivation endpoint - produce motivational messages / streak alerts
app.get("/api/agents/motivation", async (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const { generateMotivation } = await import("./lib/agents");
    const result = await generateMotivation(prisma, auth.user);
    return res.json(result);
  } catch (e) {
    console.error("Motivation agent error:", e);
    return res.status(500).json({ error: "Motivation agent failed" });
  }
});

// Critic endpoint - review a provided plan and return approval/corrections
app.post("/api/agents/critic", async (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const plan = req.body?.plan;
    const { critiquePlan } = await import("./lib/agents");
    const result = await critiquePlan(prisma, auth.user, plan);
    return res.json(result);
  } catch (e) {
    console.error("Critic agent error:", e);
    return res.status(500).json({ error: "Critic agent failed" });
  }
});

// Adaptive planning endpoint - adapt the latest plan given skipped sessions or lifestyle
app.post("/api/agents/adaptive", async (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const context = req.body?.context ?? {};
    const { adaptivePlan } = await import("./lib/agents");
    const result = await adaptivePlan(prisma, auth.user, context);
    return res.json(result);
  } catch (e) {
    console.error("Adaptive agent error:", e);
    return res.status(500).json({ error: "Adaptive agent failed" });
  }
});

// Long-term memory utilities
app.post('/api/agents/embeddings', async (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const { sessionId, vector } = req.body;
    if (!sessionId || !vector) return res.status(400).json({ error: 'sessionId and vector required' });
    const { persistSessionEmbedding } = await import('./lib/agents');
    const row = await persistSessionEmbedding(prisma, sessionId, auth.user.id, vector);
    return res.json(row);
  } catch (e) {
    console.error('Embedding persist error:', e);
    return res.status(500).json({ error: 'Failed to persist embedding' });
  }
});

app.post('/api/agents/patterns/compute', async (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const { computeUserPatterns } = await import('./lib/agents');
    const row = await computeUserPatterns(prisma, auth.user);
    return res.json(row);
  } catch (e) {
    console.error('Compute patterns error:', e);
    return res.status(500).json({ error: 'Failed to compute patterns' });
  }
});

app.get('/api/agents/patterns', async (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const pattern = await prisma.userPattern.findFirst({ where: { user_id: auth.user.id } });
    return res.json(pattern ?? { message: "No patterns calculated yet." });
  } catch (e) {
    console.error('Fetch patterns error:', e);
    return res.status(500).json({ error: 'Failed to retrieve patterns' });
  }
});

app.get("/api/dashboard", async (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const { getGamificationSummary } = await import("./lib/gamification");
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
    const gamification = await getGamificationSummary(prisma, auth.user.id);

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
      badges: gamification.badges,
      missions: gamification.missions,
      weeklyChallenge: gamification.weeklyChallenge,
      levelProgress: {
        level: gamification.level,
        progress: gamification.progress,
        currentMin: gamification.currentMin,
        nextMin: gamification.nextMin,
      },
      streak: gamification.streak,
      streakFreezeAvailable: gamification.streakFreezeAvailable,
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
    const { awardMetricXp } = await import("./lib/gamification");
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

    const reward = await awardMetricXp(prisma, auth.user.id);
    return res.status(201).json({ metric, reward });
  } catch (e) {
    console.error("Save metrics error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/missions/today", async (req, res) => {
  const token = req.query.token as string | undefined;
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const { getOrCreateDailyMissions } = await import("./lib/gamification");
    const missions = await getOrCreateDailyMissions(prisma, auth.user.id);
    return res.json({ missions });
  } catch (e) {
    console.error("Missions fetch error:", e);
    return res.status(500).json({ error: "Failed to load missions" });
  }
});

app.patch("/api/missions/:id/complete", async (req, res) => {
  const { token } = req.body as { token?: string };
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  try {
    const { completeMission } = await import("./lib/gamification");
    const result = await completeMission(prisma, auth.user.id, req.params.id);
    return res.json(result);
  } catch (e) {
    console.error("Mission completion error:", e);
    return res.status(500).json({ error: "Failed to complete mission" });
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

app.post("/api/payments/create-checkout-session", async (req, res) => {
  const { token, plan } = req.body as { token?: string; plan?: string };
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  if (!plan || !["lift_start", "momentum_pro", "coach_console"].includes(plan)) {
    return res.status(400).json({ error: "Invalid plan selection" });
  }

  const planNames: Record<string, string> = {
    lift_start: "Lift Start Membership",
    momentum_pro: "Momentum Pro Membership",
    coach_console: "Coach Console Membership",
  };

  const planPrices: Record<string, number> = {
    lift_start: 900, // $9.00
    momentum_pro: 1900, // $19.00
    coach_console: 4900, // $49.00
  };

  try {
    const isMock = !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith("sk_test_51PxxxxMock");

    if (isMock) {
      const mockSessionUrl = `http://localhost:3000/payment/success?session_id=mock_session_${Date.now()}&plan=${plan}`;
      return res.status(200).json({ url: mockSessionUrl });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: planNames[plan],
              description: `Nextyra Fitness - ${planNames[plan]} subscription`,
            },
            unit_amount: planPrices[plan],
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `http://localhost:3000/payment/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `http://localhost:3000/payment/cancel`,
      metadata: {
        userId: auth.user.id,
        plan,
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error("Create checkout session failed:", e);
    return res.status(500).json({ error: "Payment checkout initialization failed" });
  }
});

app.post("/api/payments/webhook", async (req: any, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return res.status(400).json({ error: "Missing webhook headers" });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;

    if (userId && plan) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscription_tier: plan,
            stripe_customer_id: session.customer?.toString() || null,
            stripe_subscription_id: session.subscription?.toString() || null,
          },
        });
        console.log(`Successfully upgraded user ${userId} to ${plan}`);
      } catch (dbErr) {
        console.error("Database update from webhook failed:", dbErr);
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as any;
    try {
      await prisma.user.update({
        where: { stripe_subscription_id: subscription.id },
        data: {
          subscription_tier: "free",
          stripe_subscription_id: null,
        },
      });
      console.log(`Subscription deleted: ${subscription.id}`);
    } catch (dbErr) {
      console.error("Database subscription delete failed:", dbErr);
    }
  }

  res.json({ received: true });
});

app.post("/api/payments/mock-success", async (req, res) => {
  const { token, plan } = req.body as { token?: string; plan?: string };
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  if (!plan || !["lift_start", "momentum_pro", "coach_console"].includes(plan)) {
    return res.status(400).json({ error: "Invalid plan selection" });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: auth.user.id },
      data: { subscription_tier: plan },
    });
    return res.json({ user: publicUser(updated) });
  } catch (e) {
    console.error("Mock payment success update failed:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/chat", async (req, res) => {
  const { token, message } = req.body as { token?: string; message?: string };
  const auth = await requireUser(token);
  if (!auth.user) return res.status(401).json(auth.error);

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const completedSessions = await prisma.workoutSession.findMany({
      where: { user_id: auth.user.id, completed_at: { not: null } },
      include: { workout_sets: { include: { exercise: true } } },
      orderBy: { completed_at: "desc" },
      take: 10,
    });

    const metrics = await prisma.bodyMetric.findMany({
      where: { user_id: auth.user.id },
      orderBy: { recorded_at: "desc" },
      take: 5,
    });

    const muscleGroups = ["chest", "back", "shoulders", "legs", "biceps", "triceps", "core"];
    const recovery: Record<string, number> = {};
    for (const muscleGroup of muscleGroups) {
      const lastSession = await prisma.workoutSession.findFirst({
        where: { user_id: auth.user.id, muscle_group: muscleGroup.toLowerCase(), completed_at: { not: null } },
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

    const workoutSummary = completedSessions.map(s => {
      const setsDesc = s.workout_sets.map(w => `${w.exercise.name}: ${w.set_number}×${w.reps}×${w.weight_kg}kg`).join(", ");
      return `- Date: ${s.completed_at?.toLocaleDateString()}, Muscle: ${s.muscle_group}, Volume: ${s.total_volume_kg}kg, Sets: [${setsDesc}]`;
    }).join("\n");

    const metricSummary = metrics.map(m => {
      return `- Date: ${m.recorded_at.toLocaleDateString()}, Weight: ${m.weight_kg}kg, Body Fat: ${m.body_fat_pct}%`;
    }).join("\n");

    const systemPrompt = `You are PulsePilot, the Adaptive Multi-Agent Fitness Coach. You act as a sports scientist, motivator, and workout planner.
    
    User Profile:
    - Name: ${auth.user.name ?? "Athlete"}
    - Primary Fitness Goal: ${auth.user.fitness_goal ?? "Hypertrophy"}
    - Experience Level: ${auth.user.experience_level ?? "Intermediate"}
    - Current Level: ${auth.user.level} (XP: ${auth.user.xp})
    - Current Streak: ${auth.user.streak} days
    - Active Subscription Tier: ${auth.user.subscription_tier}

    Current Muscle Group Recovery status (0% = completely fatigued/sore, 100% = fully recovered):
    ${Object.entries(recovery).map(([m, s]) => `- ${m.toUpperCase()}: ${s}%`).join("\n")}

    Recent Workout Logs (last 10 completed sessions):
    ${workoutSummary || "No workout sessions completed yet."}

    Recent Body Metrics Logs:
    ${metricSummary || "No metrics recorded yet."}

    Guidelines:
    1. Be concise, highly professional, encouraging, and science-focused.
    2. Reference the user's recovery percentages and goals when planning/giving advice.
    3. Suggest progressive overload, adjustments for stress/fatigue, and suggest specific exercises from chest, back, shoulders, legs, biceps, triceps, core.
    4. Keep answers short (2-3 paragraphs maximum) so they fit neatly in a chat drawer.`;

    const reply = await generateText(systemPrompt, message);
    return res.json({ reply });
  } catch (e) {
    console.error("Chat error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`\n  Nextyra API running at http://localhost:${port}`);
  console.log(`  Health: http://localhost:${port}/health`);
  console.log(`  Exercises: http://localhost:${port}/api/exercises`);
  console.log(`  Recovery: http://localhost:${port}/api/agents/recovery\n`);
});
