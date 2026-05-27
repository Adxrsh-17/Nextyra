type SessionWithSets = {
  id: string;
  muscle_group: string | null;
  completed_at: Date | null;
  started_at: Date | null;
  total_volume_kg: any;
  workout_sets: Array<{
    exercise_id: string;
    exercise: { id: string; name: string; muscle_group: string };
    reps: number | null;
    weight_kg: any;
    is_pr: boolean;
    completed_at: Date | null;
  }>;
};

type BodyMetricRow = {
  id: string;
  weight_kg: any;
  body_fat_pct: any;
  recorded_at: Date;
};

type RegressionPoint = {
  x: number;
  y: number;
};

function epley1rm(weightKg: number, reps: number) {
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps)) return 0;
  return weightKg * (1 + reps / 30);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function dayDiff(start: Date, end: Date) {
  return (end.getTime() - start.getTime()) / 86_400_000;
}

function linearRegression(points: RegressionPoint[]) {
  if (points.length < 2) return { slope: 0, intercept: points[0]?.y ?? 0 };

  const n = points.length;
  const sumX = points.reduce((acc, point) => acc + point.x, 0);
  const sumY = points.reduce((acc, point) => acc + point.y, 0);
  const sumXY = points.reduce((acc, point) => acc + point.x * point.y, 0);
  const sumXX = points.reduce((acc, point) => acc + point.x * point.x, 0);

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function getMostCommonDay(sessions: SessionWithSets[]) {
  const counts = Array.from({ length: 7 }, () => 0);
  for (const session of sessions) {
    if (!session.completed_at) continue;
    counts[session.completed_at.getDay()] += 1;
  }

  const mostCommonIndex = counts.reduce((bestIndex, count, index, array) => {
    return count > array[bestIndex] ? index : bestIndex;
  }, 0);

  const leastCommonIndex = counts.reduce((bestIndex, count, index, array) => {
    return count < array[bestIndex] ? index : bestIndex;
  }, 0);

  return { mostCommonIndex, leastCommonIndex, counts };
}

async function ensurePerformanceFlag(prisma: any, userId: string, exerciseId: string, flagType: string) {
  const existing = await prisma.performanceFlag.findFirst({
    where: { user_id: userId, exercise_id: exerciseId, flag_type: flagType, resolved: false },
  });

  if (existing) return existing;

  return prisma.performanceFlag.create({
    data: { user_id: userId, exercise_id: exerciseId, flag_type: flagType },
  });
}

async function getUserPatternSummary(prisma: any, userId: string) {
  const sessions = await prisma.workoutSession.findMany({
    where: { user_id: userId, completed_at: { not: null } },
    orderBy: { completed_at: "desc" },
  });

  if (sessions.length === 0) {
    return null;
  }

  const totalMinutes = sessions.reduce((acc: number, session: any) => {
    if (!session.started_at || !session.completed_at) return acc;
    return acc + (new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 60000;
  }, 0);

  const dayCounts = Array.from({ length: 7 }, () => 0);
  const hourCounts = Array.from({ length: 24 }, () => 0);

  for (const session of sessions) {
    if (!session.completed_at) continue;
    const completed = new Date(session.completed_at);
    dayCounts[completed.getDay()] += 1;
    hourCounts[completed.getHours()] += 1;
  }

  const mostSkippedDayIndex = dayCounts.reduce((bestIndex, count, index, array) => {
    return count < array[bestIndex] ? index : bestIndex;
  }, 0);

  const bestHour = hourCounts.reduce((bestIndex, count, index, array) => {
    return count > array[bestIndex] ? index : bestIndex;
  }, 0);

  return {
    mostSkippedDay: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][mostSkippedDayIndex],
    avgSessionMin: Math.round(totalMinutes / sessions.length),
    bestTimeOfDay: `${bestHour.toString().padStart(2, "0")}:00`,
  };
}

function buildStrengthForecasts(sessions: SessionWithSets[]) {
  const byExercise = new Map<string, Array<{ date: Date; oneRm: number; weight: number; reps: number }>>();

  for (const session of sessions) {
    for (const set of session.workout_sets) {
      if (!set.completed_at) continue;
      const weight = Number(set.weight_kg || 0);
      const reps = Number(set.reps || 0);
      if (!weight || !reps) continue;

      const key = set.exercise.name;
      const entry = byExercise.get(key) ?? [];
      entry.push({ date: new Date(set.completed_at), oneRm: epley1rm(weight, reps), weight, reps });
      byExercise.set(key, entry);
    }
  }

  const forecasts = Array.from(byExercise.entries())
    .map(([exerciseName, entries]) => {
      const sorted = entries.sort((left, right) => left.date.getTime() - right.date.getTime());
      if (sorted.length < 2) return null;

      const origin = sorted[0].date;
      const points = sorted.map((entry) => ({ x: dayDiff(origin, entry.date), y: entry.oneRm }));
      const regression = linearRegression(points);
      const current = sorted[sorted.length - 1];
      const projected30 = Math.max(current.oneRm, regression.intercept + regression.slope * (points[points.length - 1].x + 30));
      const gainPerWeek = regression.slope * 7;

      const bestDate = new Date(current.date);
      const daysToTarget = gainPerWeek > 0.15 ? Math.round((projected30 - current.oneRm) / Math.max(gainPerWeek, 0.1) * 7) : 30;
      bestDate.setDate(bestDate.getDate() + clamp(daysToTarget, 14, 180));

      return {
        exerciseName,
        current1Rm: Math.round(current.oneRm),
        projected1Rm: Math.round(projected30),
        weeklyGain: Number(gainPerWeek.toFixed(2)),
        sampleCount: sorted.length,
        targetDate: bestDate.toISOString(),
        trend: gainPerWeek >= 0 ? "up" : "flat",
      };
    })
    .filter(Boolean)
    .sort((left: any, right: any) => (right?.sampleCount ?? 0) - (left?.sampleCount ?? 0))
    .slice(0, 4);

  return forecasts;
}

function buildBodyProjection(metrics: BodyMetricRow[]) {
  if (metrics.length < 2) return null;

  const sorted = [...metrics].sort((left, right) => left.recorded_at.getTime() - right.recorded_at.getTime());
  const origin = sorted[0].recorded_at;
  const weightPoints = sorted
    .filter((metric) => metric.weight_kg !== null && metric.weight_kg !== undefined)
    .map((metric) => ({ x: dayDiff(origin, metric.recorded_at), y: Number(metric.weight_kg) }));
  const fatPoints = sorted
    .filter((metric) => metric.body_fat_pct !== null && metric.body_fat_pct !== undefined)
    .map((metric) => ({ x: dayDiff(origin, metric.recorded_at), y: Number(metric.body_fat_pct) }));

  if (weightPoints.length < 2 && fatPoints.length < 2) return null;

  const last = sorted[sorted.length - 1];
  const weightRegression = weightPoints.length >= 2 ? linearRegression(weightPoints) : null;
  const fatRegression = fatPoints.length >= 2 ? linearRegression(fatPoints) : null;

  const targetDays = 90;
  const futureX = dayDiff(origin, last.recorded_at) + targetDays;
  const projectedWeight = weightRegression ? weightRegression.intercept + weightRegression.slope * futureX : null;
  const projectedFat = fatRegression ? fatRegression.intercept + fatRegression.slope * futureX : null;

  const currentWeight = last.weight_kg !== null && last.weight_kg !== undefined ? Number(last.weight_kg) : null;
  const currentFat = last.body_fat_pct !== null && last.body_fat_pct !== undefined ? Number(last.body_fat_pct) : null;

  return {
    latestWeightKg: currentWeight,
    latestBodyFatPct: currentFat,
    projectedWeightKg: projectedWeight !== null ? Number(projectedWeight.toFixed(1)) : null,
    projectedBodyFatPct: projectedFat !== null ? Number(projectedFat.toFixed(1)) : null,
    projectedDate: new Date(last.recorded_at.getTime() + targetDays * 86_400_000).toISOString(),
    divergingFromGoal: projectedWeight !== null && currentWeight !== null ? Math.abs(projectedWeight - currentWeight) > 2.5 : false,
  };
}

function buildConsistencyInsight(sessions: SessionWithSets[], streak: number) {
  const relevant = sessions.filter((session) => session.completed_at);
  if (relevant.length === 0) {
    return {
      daysAnalyzed: 0,
      sessionsLogged: 0,
      weeklyAverage: 0,
      mostSkippedDay: "None",
      streakContinuationProbability: 0.2,
      insight: "Log a few workouts first so I can forecast your consistency trends.",
    };
  }

  const { mostCommonIndex, leastCommonIndex, counts } = getMostCommonDay(relevant);
  const last90Days = relevant.filter((session) => session.completed_at && dayDiff(session.completed_at, new Date()) <= 90);
  const last30Days = relevant.filter((session) => session.completed_at && dayDiff(session.completed_at, new Date()) <= 30);
  const weeklyAverage = Number(((last90Days.length / 90) * 7).toFixed(1));

  const skipProbabilityBase = counts[leastCommonIndex] === 0 ? 0.62 : 1 - counts[mostCommonIndex] / Math.max(...counts, 1);
  const streakBoost = clamp(streak / 30, 0, 0.18);
  const recentBoost = clamp(last30Days.length / 20, 0, 0.22);
  const streakContinuationProbability = clamp(0.35 + streakBoost + recentBoost - skipProbabilityBase * 0.25, 0.05, 0.97);

  return {
    daysAnalyzed: 90,
    sessionsLogged: last90Days.length,
    weeklyAverage,
    mostSkippedDay: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][leastCommonIndex],
    streakContinuationProbability: Number(streakContinuationProbability.toFixed(2)),
    insight:
      counts[leastCommonIndex] === 0
        ? `You rarely train on ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][leastCommonIndex]}s. Scheduling a lighter session there could protect consistency.`
        : `Your consistency is strongest around ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][mostCommonIndex]}s, but ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][leastCommonIndex]} remains your lowest-frequency day.`,
  };
}

async function buildPlateauInsights(prisma: any, userId: string, sessions: SessionWithSets[]) {
  const exercises = new Map<string, { id: string; name: string; latestPR: Date; samples: number; current1Rm: number }>();

  for (const session of sessions) {
    for (const set of session.workout_sets) {
      if (!set.is_pr || !set.completed_at) continue;
      const current = exercises.get(set.exercise.name);
      const oneRm = epley1rm(Number(set.weight_kg || 0), Number(set.reps || 0));
      if (!current || set.completed_at > current.latestPR) {
        exercises.set(set.exercise.name, {
          id: set.exercise.id,
          name: set.exercise.name,
          latestPR: new Date(set.completed_at),
          samples: (current?.samples ?? 0) + 1,
          current1Rm: oneRm,
        });
      }
    }
  }

  const plateauInsights: Array<{
    exerciseName: string;
    daysSinceLastPR: number;
    suggestion: string;
    current1Rm: number;
  }> = [];

  for (const exercise of exercises.values()) {
    const daysSinceLastPR = Math.floor(dayDiff(exercise.latestPR, new Date()));
    if (daysSinceLastPR < 21) continue;

    plateauInsights.push({
      exerciseName: exercise.name,
      daysSinceLastPR,
      current1Rm: Math.round(exercise.current1Rm),
      suggestion:
        daysSinceLastPR >= 28
          ? "Consider a deload week or a new rep scheme to break the plateau."
          : "Try a small volume increase, slower tempo, or tighter technique cues to restart progression.",
    });

    await ensurePerformanceFlag(prisma, userId, exercise.id, "plateau");
  }

  return plateauInsights.sort((left, right) => right.daysSinceLastPR - left.daysSinceLastPR).slice(0, 5);
}

export async function buildPredictiveSummary(prisma: any, user: any) {
  const [sessions, metrics] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { user_id: user.id, completed_at: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
      include: { workout_sets: { include: { exercise: true } } },
      orderBy: { completed_at: "asc" },
    }),
    prisma.bodyMetric.findMany({
      where: { user_id: user.id, recorded_at: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } },
      orderBy: { recorded_at: "asc" },
    }),
  ]);

  const pattern = await getUserPatternSummary(prisma, user.id);
  const strengthForecasts = buildStrengthForecasts(sessions);
  const consistency = buildConsistencyInsight(sessions, Number(user.streak || 0));
  const plateauInsights = await buildPlateauInsights(prisma, user.id, sessions);
  const bodyProjection = buildBodyProjection(metrics);

  const goal = String(user.fitness_goal || "").toLowerCase();
  const bodyDirection = bodyProjection
    ? bodyProjection.projectedWeightKg !== null && bodyProjection.latestWeightKg !== null && bodyProjection.projectedWeightKg < bodyProjection.latestWeightKg
      ? "down"
      : "up"
    : "flat";

  const bodyRecommendation = (() => {
    if (!bodyProjection) return "Log at least two body metrics to unlock weight and body-fat projections.";
    if (goal === "fat_loss" && bodyDirection !== "down") return "Your current weight trend is drifting upward. Tighten nutrition and increase weekly low-intensity work.";
    if (goal === "strength" && bodyProjection.projectedWeightKg !== null && bodyProjection.latestWeightKg !== null && bodyProjection.projectedWeightKg < bodyProjection.latestWeightKg) {
      return "Bodyweight is likely dropping. Make sure recovery and calories are high enough to support strength progression.";
    }
    return "The current direction still matches your goal, but continued check-ins will improve forecast confidence.";
  })();

  return {
    generatedAt: new Date().toISOString(),
    strengthForecasts,
    consistency,
    plateauInsights,
    bodyProjection,
    bodyRecommendation,
    userPattern: pattern,
    summaryCards: [
      {
        label: "Streak continuation",
        value: `${Math.round(consistency.streakContinuationProbability * 100)}%`,
        note: `Lowest-frequency day: ${consistency.mostSkippedDay}`,
      },
      {
        label: "Forecast horizon",
        value: "90 days",
        note: `Computed from ${strengthForecasts.length} lift(s)`,
      },
      {
        label: "Plateau flags",
        value: String(plateauInsights.length),
        note: "Auto-logged to performance_flags",
      },
    ],
  };
}
