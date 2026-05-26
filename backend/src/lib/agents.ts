import { generateText } from "./llm";

// Lightweight, dependency-free agent helpers. Keep logic simple and resilient.
export async function generateWeeklyPlan(prisma: any, user: any) {
  const muscleGroups = ["chest", "back", "shoulders", "legs", "biceps", "triceps", "core"];

  // Build recovery map (same heuristic as server recovery endpoint)
  const recovery: Record<string, number> = {};
  for (const muscleGroup of muscleGroups) {
    const lastSession = await prisma.workoutSession.findFirst({
      where: { user_id: user.id, muscle_group: muscleGroup.toLowerCase(), completed_at: { not: null } },
      orderBy: { completed_at: "desc" },
    });

    if (!lastSession) {
      recovery[muscleGroup] = 100;
      continue;
    }
    const hoursElapsed = (Date.now() - new Date(lastSession.completed_at).getTime()) / 3_600_000;
    const volumeFactor = Math.min(Number(lastSession.total_volume_kg || 0) / 5000, 1.5);
    const RECOVERY_HOURS: Record<string, number> = { legs: 96, back: 72, chest: 72, shoulders: 48, biceps: 48, triceps: 48, core: 24 };
    const score = Math.max(0, 100 - (hoursElapsed / RECOVERY_HOURS[muscleGroup]) * 100 * (volumeFactor || 1));
    recovery[muscleGroup] = Math.round(score);
  }

  // Build prompt for LLM planner
  const systemPrompt = `You are a professional workout planning agent. Given the user's profile and recovery map, generate a 7-day plan. Output strict JSON array of days with keys: day (0-6), muscleGroup, exercises:[{name, sets, reps, weightKg}]. Use available exercises from the exercise library when possible.`;

  const userPrompt = `User: ${user.name ?? "Athlete"}\nGoal: ${user.fitness_goal ?? "general"}\nExperience: ${user.experience_level ?? "intermediate"}\nRecovery: ${JSON.stringify(recovery)}\nPlease return only JSON.`;

  try {
    const llmText = await generateText(systemPrompt, userPrompt);
    // Try to parse JSON from LLM response
    let parsed: any = null;
    try {
      parsed = JSON.parse(llmText);
    } catch (e) {
      // If LLM didn't return strict JSON, attempt to extract first JSON block
      const match = llmText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) parsed = JSON.parse(match[0]);
    }

    // If parsed looks valid, persist and return
    if (parsed && Array.isArray(parsed)) {
      const plan = parsed;
      await prisma.aiWorkoutPlan.create({ data: { user_id: user.id, plan_json: plan, week_start: new Date() } });
      return { plan, recovery, source: "llm" };
    }
  } catch (e) {
    console.error("Planner LLM failed:", e);
  }

  // Fallback heuristic: build a simple plan from most-recovered muscle groups
  const sorted = Object.entries(recovery).sort((a, b) => b[1] - a[1]).map(([m]) => m);
  const plan: any[] = [];
  for (let day = 0; day < 7; day++) {
    const muscle = sorted[day % sorted.length];
    // pick 3 exercises from DB for this muscle (best-effort)
    const exercises = await prisma.exercise.findMany({ where: { muscle_group: muscle }, take: 3 });
    plan.push({ day, muscleGroup: muscle, exercises: exercises.map((e: any) => ({ name: e.name, sets: 3, reps: 8, weightKg: null })) });
  }

  await prisma.aiWorkoutPlan.create({ data: { user_id: user.id, plan_json: plan, week_start: new Date() } });
  return { plan, recovery, source: "heuristic" };
}

export async function analyzePerformance(prisma: any, user: any) {
  // Look for exercises with recent sessions but no PR improvements in last 21 days
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days
  const sessions = await prisma.workoutSession.findMany({ where: { user_id: user.id, completed_at: { gte: since } }, include: { workout_sets: { include: { exercise: true } } } });

  const exerciseSetCounts: Record<string, number> = {};
  for (const s of sessions) {
    for (const set of s.workout_sets) {
      const name = set.exercise.name;
      exerciseSetCounts[name] = (exerciseSetCounts[name] || 0) + 1;
    }
  }

  const flags: any[] = [];
  const allExercises = Object.keys(exerciseSetCounts);
  for (const name of allExercises) {
    // Find personal records for this exercise
    const prs = await prisma.personalRecord.findMany({ where: { user_id: user.id }, include: { exercise: true } });
    const relevantPrs = prs.filter((p: any) => p.exercise.name === name).sort((a: any, b: any) => new Date(b.achieved_at).getTime() - new Date(a.achieved_at).getTime());
    const latest = relevantPrs[0];
    if (!latest) continue;
    const daysSince = (Date.now() - new Date(latest.achieved_at).getTime()) / (24 * 3600 * 1000);
    if (daysSince > 21) {
      // create a plateau flag
      flags.push({ exerciseName: name, flag_type: "plateau", daysSinceLastPR: Math.round(daysSince) });
      // persist flag to DB (best-effort: link exercise)
      try {
        const exerciseRow = await prisma.exercise.findFirst({ where: { name } });
        if (exerciseRow) await prisma.performanceFlag.create({ data: { user_id: user.id, exercise_id: exerciseRow.id, flag_type: "plateau" } });
      } catch (e) {
        console.error("Could not persist performance flag:", e);
      }
    }
  }

  return { flags, scannedExercises: allExercises.length };
}

export async function orchestrate(prisma: any, user: any, context: any = {}) {
  // Decide which agents to run. For now always run planner + performance analysis.
  const planner = await generateWeeklyPlan(prisma, user);
  const performance = await analyzePerformance(prisma, user);

  // Run critic on the generated plan
  const critic = await critiquePlan(prisma, user, planner.plan);

  // Lightweight synthesis
  const synthesis = {
    plan: planner.plan,
    recovery: planner.recovery,
    performanceFlags: performance.flags,
    critic,
    notes: "Plan generated, performance analyzed, and critiqued",
  };

  return synthesis;
}

export async function adaptivePlan(prisma: any, user: any, context: any = {}) {
  // context may include skippedSessions: [{ day, sessionId }], lifestyle: { energy, stress, sleep }
  const lastPlan = await prisma.aiWorkoutPlan.findFirst({ where: { user_id: user.id }, orderBy: { generated_at: 'desc' } });
  if (!lastPlan || !lastPlan.plan_json) return { error: 'No existing plan to adapt' };

  const plan: any[] = Array.isArray(lastPlan.plan_json) ? lastPlan.plan_json : lastPlan.plan_json as any[];

  const skipped = context.skippedSessions ?? [];
  const lifestyle = context.lifestyle ?? {};

  // Simple strategy: move skipped day's muscle to next available day that doesn't conflict
  const muscleByDay = plan.map((d) => d.muscleGroup || d.muscle_group);
  for (const s of skipped) {
    const muscle = s.muscleGroup || s.muscle_group || null;
    if (!muscle) continue;
    // try to find a day with lowest frequency for this muscle
    const freq: Record<string, number> = {};
    for (const d of plan) freq[(d.muscleGroup || d.muscle_group || 'unknown').toLowerCase()] = (freq[(d.muscleGroup || d.muscle_group || 'unknown').toLowerCase()] || 0) + 1;
    // find day index to place
    let target = plan.findIndex((d, i) => {
      // avoid consecutive same muscle
      const prev = plan[i - 1];
      const next = plan[i + 1];
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

  // Intensity reduction based on lifestyle
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
  return { adaptedPlan: plan, note: 'Adapted from previous plan', adaptedId: adapted.id };
}

export async function persistSessionEmbedding(prisma: any, sessionId: string, userId: string, vector: any) {
  // store embedding JSON (vector) tied to a session
  return prisma.sessionEmbedding.create({ data: { session_id: sessionId, user_id: userId, vector } });
}

export async function computeUserPatterns(prisma: any, user: any) {
  // build simple patterns: most skipped day, avg session duration, best time window
  const sessions = await prisma.workoutSession.findMany({ where: { user_id: user.id, completed_at: { not: null } }, orderBy: { completed_at: 'desc' } });
  if (!sessions || sessions.length === 0) return { message: 'No sessions' };

  // compute most skipped weekday
  const counts: Record<number, number> = {};
  let totalMinutes = 0;
  for (const s of sessions) {
    const d = new Date(s.completed_at!).getDay();
    counts[d] = (counts[d] || 0) + 1;
    // assume started_at/completed_at exist to compute duration
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

  const up = await prisma.userPattern.upsert({ where: { user_id: user.id }, update: { most_skipped_day: mostActiveDay?.toString(), avg_session_min: avgSessionMin, best_time_of_day: bestTimeOfDay, computed_at: new Date() }, create: { user_id: user.id, most_skipped_day: mostActiveDay?.toString(), avg_session_min: avgSessionMin, best_time_of_day: bestTimeOfDay } });
  return up;
}

export async function generateMotivation(prisma: any, user: any) {
  // Build simple motivational outputs: streak alerts, milestone congrats, mini-workout suggestions
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

  // Suggest a 15-min mini workout based on most recovered muscle
  const muscleGroups = ["chest", "back", "shoulders", "legs", "biceps", "triceps", "core"];
  const recovery: Record<string, number> = {};
  for (const muscleGroup of muscleGroups) {
    const s = await prisma.workoutSession.findFirst({ where: { user_id: user.id, muscle_group: muscleGroup, completed_at: { not: null } }, orderBy: { completed_at: 'desc' } });
    recovery[muscleGroup] = s ? 50 : 100;
  }
  const best = Object.entries(recovery).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'full body';
  messages.push(`Try a 15-min ${best} mini-workout: 3 rounds of 40s work / 20s rest — bodyweight AMRAP focusing on ${best}.`);

  // Use LLM for a personalized message if available
  try {
    const system = `You are a encouraging fitness coach. Produce one concise motivational message tailored to the user.`;
    const userPrompt = `User: ${user.name ?? 'Athlete'}\nStreak: ${streak}\nLastSessionDaysAgo: ${daysSinceLast ?? 'none'}`;
    const llmReply = await generateText(system, userPrompt);
    if (llmReply && llmReply.length < 500) messages.unshift(llmReply);
  } catch (e) {
    // ignore LLM errors — keep templated messages
  }

  return { messages };
}

export async function critiquePlan(prisma: any, user: any, plan: any[]) {
  const issues: string[] = [];
  if (!Array.isArray(plan)) return { approved: false, issues: ['Invalid plan format'] };

  // Count frequency per muscle group
  const freq: Record<string, number> = {};
  for (const day of plan) {
    const m = (day.muscleGroup || day.muscle_group || 'unknown').toLowerCase();
    freq[m] = (freq[m] || 0) + 1;
  }

  const push = (freq['chest'] || 0) + (freq['shoulders'] || 0) + (freq['triceps'] || 0);
  const pull = (freq['back'] || 0) + (freq['biceps'] || 0);
  if (push - pull >= 2) issues.push('Push/pull imbalance: significantly more push work than pull work this week.');

  // Check for back-to-back same muscle days
  for (let i = 1; i < plan.length; i++) {
    const prev = (plan[i - 1].muscleGroup || plan[i - 1].muscle_group || '').toLowerCase();
    const cur = (plan[i].muscleGroup || plan[i].muscle_group || '').toLowerCase();
    if (prev && cur && prev === cur) issues.push(`Consecutive days: ${cur} scheduled two days in a row (day ${i - 1} and ${i}).`);
  }

  // Validate volume heuristics if sets present
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
