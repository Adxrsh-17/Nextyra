import { generateText } from "./llm";

// Memory cache store mimicking Redis for local environments
const cacheStore: Record<string, { value: any; expires: number }> = {};

export async function getCachedAgentOutput(key: string): Promise<any | null> {
  const item = cacheStore[key];
  if (!item) return null;
  if (Date.now() > item.expires) {
    delete cacheStore[key];
    return null;
  }
  return item.value;
}

export async function setCachedAgentOutput(key: string, value: any, ttlSeconds = 300) {
  cacheStore[key] = {
    value,
    expires: Date.now() + ttlSeconds * 1000,
  };
}

// 2.3 Recovery Agent
export async function calculateDetailedRecovery(prisma: any, user: any) {
  const muscleGroups = ["chest", "back", "shoulders", "legs", "biceps", "triceps", "core"];
  const RECOVERY_HOURS: Record<string, number> = { legs: 96, back: 72, chest: 72, shoulders: 48, biceps: 48, triceps: 48, core: 24 };

  const fatigue: Record<string, number> = {};
  const overtrainedFlags: Record<string, boolean> = {};
  const nextSafeDates: Record<string, string> = {};
  const recoveryMap: Record<string, number> = {}; // Freshness (100 - fatigue)

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let totalFatigue = 0;

  for (const muscle of muscleGroups) {
    // 1. Calculate fatigue based on volume in last 7 days
    const recentSessions = await prisma.workoutSession.findMany({
      where: {
        user_id: user.id,
        muscle_group: muscle.toLowerCase(),
        completed_at: { gte: sevenDaysAgo }
      },
      include: {
        workout_sets: true
      }
    });

    let muscleVolume = 0;
    for (const session of recentSessions) {
      muscleVolume += session.workout_sets.reduce(
        (acc: number, set: any) => acc + Number(set.weight_kg || 0) * Number(set.reps || 0),
        0
      );
    }

    // Scale fatigue score (0 - 100). Higher volume = higher fatigue
    const fatigueScore = Math.min(100, Math.round(muscleVolume / 50));
    fatigue[muscle] = fatigueScore;
    recoveryMap[muscle] = 100 - fatigueScore;
    totalFatigue += fatigueScore;

    // 2. Check for overtraining (3+ days in a row of the same muscle)
    const allRecentSessions = await prisma.workoutSession.findMany({
      where: {
        user_id: user.id,
        muscle_group: muscle.toLowerCase(),
        completed_at: { not: null }
      },
      orderBy: { completed_at: "asc" }
    });

    const completionDates = allRecentSessions.map((s: any) => {
      const d = new Date(s.completed_at);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    });

    const uniqueDates = Array.from(new Set(completionDates)).sort() as number[];
    let consecutiveDays = 0;
    let isOvertrained = false;
    for (let i = 0; i < uniqueDates.length; i++) {
      if (i > 0 && uniqueDates[i] - uniqueDates[i - 1] === 24 * 60 * 60 * 1000) {
        consecutiveDays++;
      } else {
        consecutiveDays = 1;
      }
      if (consecutiveDays >= 3) {
        isOvertrained = true;
        break;
      }
    }
    overtrainedFlags[muscle] = isOvertrained;

    // 3. Compute Next Safe Training Date
    const lastSession = allRecentSessions[allRecentSessions.length - 1];
    if (lastSession) {
      const completionTime = new Date(lastSession.completed_at).getTime();
      const safeTime = completionTime + RECOVERY_HOURS[muscle] * 60 * 60 * 1000;
      nextSafeDates[muscle] = new Date(safeTime).toISOString();
    } else {
      nextSafeDates[muscle] = new Date().toISOString();
    }
  }

  const recommendDeload = totalFatigue > 350;

  return {
    recoveryMap,
    fatigueScores: fatigue,
    overtrainedFlags,
    nextSafeDates,
    recommendDeload,
    cumulativeFatigue: totalFatigue,
  };
}

// 2.2 Workout Planning Agent
export async function generateWeeklyPlan(prisma: any, user: any) {
  // Use our detailed recovery scores
  const recoveryData = await calculateDetailedRecovery(prisma, user);
  const recovery = recoveryData.recoveryMap;

  const systemPrompt = `You are a professional workout planning agent. Given the user's profile and recovery map, generate a 7-day plan. Output strict JSON array of days with keys: day (0-6), muscleGroup, exercises:[{name, sets, reps, weightKg}]. Use available exercises from the exercise library when possible.`;
  const userPrompt = `User: ${user.name ?? "Athlete"}\nGoal: ${user.fitness_goal ?? "general"}\nExperience: ${user.experience_level ?? "intermediate"}\nRecovery: ${JSON.stringify(recovery)}\nPlease return only JSON.`;

  try {
    const llmText = await generateText(systemPrompt, userPrompt);
    let parsed: any = null;
    try {
      parsed = JSON.parse(llmText);
    } catch (e) {
      const match = llmText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) parsed = JSON.parse(match[0]);
    }

    if (parsed && Array.isArray(parsed)) {
      const plan = parsed;
      await prisma.aiWorkoutPlan.create({ data: { user_id: user.id, plan_json: plan, week_start: new Date() } });
      return { plan, recovery, source: "llm" };
    }
  } catch (e) {
    console.error("Planner LLM failed:", e);
  }

  // Fallback heuristic
  const sorted = Object.entries(recovery).sort((a, b) => b[1] - a[1]).map(([m]) => m);
  const plan: any[] = [];
  for (let day = 0; day < 7; day++) {
    const muscle = sorted[day % sorted.length];
    const exercises = await prisma.exercise.findMany({ where: { muscle_group: muscle }, take: 3 });
    plan.push({ day, muscleGroup: muscle, exercises: exercises.map((e: any) => ({ name: e.name, sets: 3, reps: 8, weightKg: null })) });
  }

  await prisma.aiWorkoutPlan.create({ data: { user_id: user.id, plan_json: plan, week_start: new Date() } });
  return { plan, recovery, source: "heuristic" };
}

// 2.4 Performance Analysis Agent
export async function analyzePerformance(prisma: any, user: any) {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days
  const sessions = await prisma.workoutSession.findMany({
    where: { user_id: user.id, completed_at: { gte: since } },
    include: { workout_sets: { include: { exercise: true } } }
  });

  const exerciseSetCounts: Record<string, number> = {};
  const muscleSetCounts: Record<string, number> = {};

  for (const s of sessions) {
    const muscle = s.muscle_group?.toLowerCase();
    if (muscle) {
      const daysAgo = (Date.now() - new Date(s.completed_at!).getTime()) / (24 * 3600 * 1000);
      if (daysAgo <= 7) {
        muscleSetCounts[muscle] = (muscleSetCounts[muscle] || 0) + s.workout_sets.length;
      }
    }
    for (const set of s.workout_sets) {
      const name = set.exercise.name;
      exerciseSetCounts[name] = (exerciseSetCounts[name] || 0) + 1;
    }
  }

  const flags: any[] = [];
  const allExercises = Object.keys(exerciseSetCounts);
  for (const name of allExercises) {
    const prs = await prisma.personalRecord.findMany({ where: { user_id: user.id }, include: { exercise: true } });
    const relevantPrs = prs.filter((p: any) => p.exercise.name === name).sort((a: any, b: any) => new Date(b.achieved_at).getTime() - new Date(a.achieved_at).getTime());
    const latest = relevantPrs[0];
    if (!latest) continue;
    const daysSince = (Date.now() - new Date(latest.achieved_at).getTime()) / (24 * 3600 * 1000);
    if (daysSince > 21) {
      flags.push({ exerciseName: name, flag_type: "plateau", daysSinceLastPR: Math.round(daysSince) });
      try {
        const exerciseRow = await prisma.exercise.findFirst({ where: { name } });
        if (exerciseRow) await prisma.performanceFlag.create({ data: { user_id: user.id, exercise_id: exerciseRow.id, flag_type: "plateau" } });
      } catch (e) {
        console.error("Could not persist performance flag:", e);
      }
    }
  }

  // Goal & Volume checking
  const goal = user.fitness_goal?.toLowerCase() ?? "hypertrophy";
  const underperformingMuscles: string[] = [];
  const muscleGroups = ["chest", "back", "shoulders", "legs", "biceps", "triceps", "core"];
  
  const targetSets = goal === "hypertrophy" || goal === "strength" ? 10 : 6;
  for (const muscle of muscleGroups) {
    const setsCompleted = muscleSetCounts[muscle] || 0;
    if (setsCompleted < targetSets) {
      underperformingMuscles.push(muscle);
    }
  }

  // Spot inconsistency patterns
  const pattern = await prisma.userPattern.findUnique({ where: { user_id: user.id } });
  const mostSkipped = pattern?.most_skipped_day;

  return {
    flags,
    scannedExercises: allExercises.length,
    underperformingMuscles,
    mostSkippedDay: mostSkipped ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][Number(mostSkipped)] : "None",
    weeklyTargetSets: targetSets,
    completedSetsPerMuscle: muscleSetCounts,
  };
}

// 2.1 Agent Orchestrator
export async function orchestrate(prisma: any, user: any, context: any = {}) {
  const cacheKey = `orchestration-${user.id}`;
  const cached = await getCachedAgentOutput(cacheKey);
  if (cached) {
    console.log("Returning cached multi-agent orchestration results.");
    return cached;
  }

  const planner = await generateWeeklyPlan(prisma, user);
  const detailedRecovery = await calculateDetailedRecovery(prisma, user);
  const performance = await analyzePerformance(prisma, user);
  const critic = await critiquePlan(prisma, user, planner.plan);

  const synthesis = {
    plan: planner.plan,
    recovery: detailedRecovery,
    performanceFlags: performance.flags,
    underperformingMuscles: performance.underperformingMuscles,
    mostSkippedDay: performance.mostSkippedDay,
    weeklyTargetSets: performance.weeklyTargetSets,
    completedSetsPerMuscle: performance.completedSetsPerMuscle,
    critic,
    notes: "Plan generated, detailed recovery calculated, performance analyzed, and critiqued",
  };

  await setCachedAgentOutput(cacheKey, synthesis, 180); // 3-minute cache
  return synthesis;
}

// 2.7 Adaptive Planning Agent
export async function adaptivePlan(prisma: any, user: any, context: any = {}) {
  const lastPlan = await prisma.aiWorkoutPlan.findFirst({ where: { user_id: user.id }, orderBy: { generated_at: 'desc' } });
  if (!lastPlan || !lastPlan.plan_json) return { error: 'No existing plan to adapt' };

  const plan: any[] = Array.isArray(lastPlan.plan_json) ? lastPlan.plan_json : lastPlan.plan_json as any[];
  const skipped = context.skippedSessions ?? [];
  const lifestyle = context.lifestyle ?? {};

  for (const s of skipped) {
    const muscle = s.muscleGroup || s.muscle_group || null;
    if (!muscle) continue;

    let target = plan.findIndex((d, i) => {
      const prev = plan[i - 1];
      const curMuscle = (d.muscleGroup || d.muscle_group || '').toLowerCase();
      if (curMuscle === muscle.toLowerCase()) return false;
      const prevMuscle = prev ? (prev.muscleGroup || prev.muscle_group || '').toLowerCase() : null;
      if (prevMuscle === muscle.toLowerCase()) return false;
      return true;
    });

    if (target >= 0) {
      plan[target].exercises = plan[target].exercises.concat([{ name: `(moved) ${muscle}`, sets: 2, reps: 8, weightKg: null }]);
    }
  }

  // Stress-informed intensity scaling
  if (lifestyle.energy !== undefined && lifestyle.energy <= 2) {
    for (const day of plan) {
      if (!Array.isArray(day.exercises)) continue;
      for (const ex of day.exercises) {
        if (ex.sets) ex.sets = Math.max(1, Math.floor(ex.sets * 0.7));
        if (ex.reps) ex.reps = Math.max(4, Math.floor(ex.reps * 0.9));
      }
    }
  }

  const adapted = await prisma.aiWorkoutPlan.create({ data: { user_id: user.id, plan_json: plan, week_start: new Date() } });
  
  // Clear orchestration cache so UI reflects change
  delete cacheStore[`orchestration-${user.id}`];

  return { adaptedPlan: plan, note: 'Adapted from previous plan', adaptedId: adapted.id };
}

// 2.8 Long-Term Memory System
export async function persistSessionEmbedding(prisma: any, sessionId: string, userId: string, vector: any) {
  return prisma.sessionEmbedding.create({ data: { session_id: sessionId, user_id: userId, vector } });
}

export async function computeUserPatterns(prisma: any, user: any) {
  const sessions = await prisma.workoutSession.findMany({ where: { user_id: user.id, completed_at: { not: null } }, orderBy: { completed_at: 'desc' } });
  if (!sessions || sessions.length === 0) return { message: 'No sessions recorded yet.' };

  const counts: Record<number, number> = {};
  let totalMinutes = 0;
  for (const s of sessions) {
    const d = new Date(s.completed_at!).getDay();
    counts[d] = (counts[d] || 0) + 1;
    if (s.started_at && s.completed_at) totalMinutes += (new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 60000;
  }
  const mostActiveDay = Object.entries(counts).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0];
  const avgSessionMin = Math.round(totalMinutes / sessions.length);
  const bestTimeOfDay = (() => {
    const hourCounts: Record<number, number> = {};
    for (const s of sessions) {
      const h = new Date(s.completed_at!).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    }
    return Object.entries(hourCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] ?? 'unknown';
  })();

  const up = await prisma.userPattern.upsert({
    where: { user_id: user.id },
    update: { most_skipped_day: mostActiveDay?.toString(), avg_session_min: avgSessionMin, best_time_of_day: bestTimeOfDay, computed_at: new Date() },
    create: { user_id: user.id, most_skipped_day: mostActiveDay?.toString(), avg_session_min: avgSessionMin, best_time_of_day: bestTimeOfDay }
  });
  return up;
}

// 2.5 Motivation Agent
export async function generateMotivation(prisma: any, user: any) {
  const lastSession = await prisma.workoutSession.findFirst({ where: { user_id: user.id, completed_at: { not: null } }, orderBy: { completed_at: 'desc' } });
  const streak = user.streak || 0;
  const messages: string[] = [];

  if (streak >= 7) messages.push(`🔥 Awesome — you're on a ${streak}-day streak! Consider a small reward or active recovery day to sustain momentum.`);

  const daysSinceLast = lastSession ? Math.floor((Date.now() - new Date(lastSession.completed_at).getTime()) / (24 * 3600 * 1000)) : null;
  if (daysSinceLast !== null && daysSinceLast >= 1) {
    messages.push(`Reminder: You haven't logged a session in ${daysSinceLast} day(s). A quick 15-minute mini workout can save your streak.`);
  } else if (!lastSession) {
    messages.push("Welcome — log your first workout today and start earning XP!");
  }

  const recoveryData = await calculateDetailedRecovery(prisma, user);
  const best = Object.entries(recoveryData.recoveryMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'full body';
  messages.push(`Try a 15-min ${best} mini-workout: 3 rounds of 40s work / 20s rest — bodyweight AMRAP focusing on ${best}.`);

  try {
    const system = `You are a encouraging fitness coach. Produce one concise motivational message tailored to the user.`;
    const userPrompt = `User: ${user.name ?? 'Athlete'}\nStreak: ${streak}\nLastSessionDaysAgo: ${daysSinceLast ?? 'none'}`;
    const llmReply = await generateText(system, userPrompt);
    if (llmReply && llmReply.length < 500) messages.unshift(llmReply);
  } catch (e) {
    // Keep templates on failure
  }

  return { messages };
}

// 2.6 Critic Agent
export async function critiquePlan(prisma: any, user: any, plan: any[]) {
  const issues: string[] = [];
  if (!Array.isArray(plan)) return { approved: false, issues: ['Invalid plan format'] };

  const freq: Record<string, number> = {};
  for (const day of plan) {
    const m = (day.muscleGroup || day.muscle_group || 'unknown').toLowerCase();
    freq[m] = (freq[m] || 0) + 1;
  }

  const push = (freq['chest'] || 0) + (freq['shoulders'] || 0) + (freq['triceps'] || 0);
  const pull = (freq['back'] || 0) + (freq['biceps'] || 0);
  if (push - pull >= 2) issues.push('Push/pull imbalance: significantly more push work than pull work this week.');

  for (let i = 1; i < plan.length; i++) {
    const prev = (plan[i - 1].muscleGroup || plan[i - 1].muscle_group || '').toLowerCase();
    const cur = (plan[i].muscleGroup || plan[i].muscle_group || '').toLowerCase();
    if (prev && cur && prev === cur) issues.push(`Consecutive days: ${cur} scheduled two days in a row (day ${i - 1} and ${i}).`);
  }

  for (const day of plan) {
    if (!Array.isArray(day.exercises)) continue;
    for (const ex of day.exercises) {
      if (ex.sets && ex.sets > 6) issues.push(`High set count (${ex.sets}) for ${ex.name} on day ${day.day}.`);
      if (ex.reps && ex.reps > 20) issues.push(`Very high rep range (${ex.reps}) for ${ex.name} on day ${day.day}.`);
    }
  }

  const approved = issues.length === 0;
  return { approved, issues };
}
