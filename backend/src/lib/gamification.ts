const LEVEL_THRESHOLDS = [0, 500, 1500, 3500, 7000, 12000];

export function getLevelFromXp(xp: number) {
  let level = 1;
  for (let index = 0; index < LEVEL_THRESHOLDS.length; index++) {
    if (xp >= LEVEL_THRESHOLDS[index]) level = index + 1;
  }
  return level;
}

export function getLevelProgress(xp: number) {
  const level = getLevelFromXp(xp);
  const currentMin = LEVEL_THRESHOLDS[Math.max(0, level - 1)] ?? 0;
  const nextMin = LEVEL_THRESHOLDS[level] ?? null;
  const progress = nextMin === null ? 100 : Math.max(0, Math.min(100, ((xp - currentMin) / (nextMin - currentMin)) * 100));
  return { level, currentMin, nextMin, progress };
}

function getDaysSince(dateLike: Date | string | null | undefined) {
  if (!dateLike) return null;
  const day = new Date(dateLike);
  day.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil(Math.abs(today.getTime() - day.getTime()) / (1000 * 60 * 60 * 24));
}

function nextMidnightHours() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return (next.getTime() - now.getTime()) / 3_600_000;
}

async function ensureBadgeDefinitions(prisma: any) {
  const badgeDefinitions = [
    { name: "First Fire", description: "Complete your first workout", icon: "🔥", condition_type: "session_count", condition_value: 1 },
    { name: "Iron Week", description: "Train 7 times in 7 days", icon: "💪", condition_type: "session_count_7d", condition_value: 7 },
    { name: "PR Hunter", description: "Log 10 personal records", icon: "🏆", condition_type: "pr_count", condition_value: 10 },
    { name: "Consistent", description: "Maintain a 30-day streak", icon: "🧠", condition_type: "streak", condition_value: 30 },
    { name: "Leg Day Loyalist", description: "Complete 20 leg sessions", icon: "🦵", condition_type: "muscle_session_count", condition_value: 20 },
    { name: "Century", description: "Log 100 total sessions", icon: "💯", condition_type: "session_count", condition_value: 100 },
    { name: "Night Owl", description: "Finish 10 workouts after 9 PM", icon: "🌙", condition_type: "night_session_count", condition_value: 10 },
    { name: "Speed Runner", description: "Finish a session in under 30 min", icon: "⚡", condition_type: "fast_session_count", condition_value: 1 },
  ];

  for (const badge of badgeDefinitions) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: badge,
      create: badge,
    });
  }
}

export async function awardSessionXp(prisma: any, userId: string, sessionId: string) {
  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, user_id: userId },
    include: { workout_sets: true },
  });
  if (!session) throw new Error("Session not found");

  const totalVolumeKg = session.workout_sets.reduce((acc: number, set: any) => acc + Number(set.weight_kg || 0) * Number(set.reps || 0), 0);
  const completedSetCount = session.workout_sets.length;
  const hasPr = session.workout_sets.some((set: any) => set.is_pr);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let newStreak = user.streak || 0;
  let consumedFreeze = false;
  if (user.last_active_date) {
    const lastActive = new Date(user.last_active_date);
    lastActive.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(Math.abs(today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) newStreak += 1;
    else if (diffDays > 1) {
      if ((user.streak_freezes || 0) > 0) {
        newStreak = user.streak || 0;
        consumedFreeze = true;
      } else {
        newStreak = 1;
      }
    }
  } else {
    newStreak = 1;
  }

  const events: Array<{ amount: number; reason: string }> = [
    { amount: 100, reason: `Completed ${session.muscle_group} session` },
  ];

  if (hasPr) events.push({ amount: 50, reason: "Hit a Personal Record" });
  if (completedSetCount > 0) events.push({ amount: 25, reason: "Completed all sets in session" });
  if (newStreak > 0 && newStreak % 7 === 0) events.push({ amount: 200, reason: `${newStreak}-day streak bonus` });

  const xpEarned = events.reduce((acc, event) => acc + event.amount, 0);
  const newXp = (user.xp || 0) + xpEarned;
  const newLevel = getLevelFromXp(newXp);
  const previousLevel = getLevelFromXp(Number(user.xp || 0));
  const freezeReward = newLevel > previousLevel && newLevel >= 3 ? 1 : 0;
  const newStreakFreezeCount = Math.max(0, Number(user.streak_freezes || 0) - (consumedFreeze ? 1 : 0)) + freezeReward;

  await prisma.workoutSession.update({
    where: { id: sessionId },
    data: { completed_at: new Date(), total_volume_kg: totalVolumeKg, xp_earned: xpEarned },
  });

  for (const event of events) {
    await prisma.xpTransaction.create({ data: { user_id: userId, amount: event.amount, reason: event.reason } });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      xp: newXp,
      level: newLevel,
      streak: newStreak,
      streak_freezes: newStreakFreezeCount,
      last_active_date: new Date(),
    },
  });

  const awardedBadges = await awardBadges(prisma, userId, { session, newStreak });

  return {
    xpEarned,
    totalVolumeKg,
    events,
    newXp,
    newLevel,
    newStreak,
    streakFreezes: newStreakFreezeCount,
    freezeConsumed: consumedFreeze,
    awardedBadges,
  };
}

export async function awardMetricXp(prisma: any, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const amount = 30;
  await prisma.xpTransaction.create({ data: { user_id: userId, amount, reason: "Logged body metrics" } });
  const newXp = (user.xp || 0) + amount;
  const newLevel = getLevelFromXp(newXp);
  const previousLevel = getLevelFromXp(Number(user.xp || 0));
  const freezeReward = newLevel > previousLevel && newLevel >= 3 ? 1 : 0;

  await prisma.user.update({ where: { id: userId }, data: { xp: newXp, level: newLevel, streak_freezes: Number(user.streak_freezes || 0) + freezeReward } });
  return { amount, newXp, newLevel, streakFreezesEarned: freezeReward };
}

export async function completeMission(prisma: any, userId: string, missionId: string) {
  const mission = await prisma.dailyMission.findFirst({ where: { id: missionId, user_id: userId } });
  if (!mission) throw new Error("Mission not found");
  if (mission.is_completed) return mission;

  const reward = Number(mission.xp_reward || 75);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const newXp = (user.xp || 0) + reward;
  const newLevel = getLevelFromXp(newXp);
  const previousLevel = getLevelFromXp(Number(user.xp || 0));
  const freezeReward = newLevel > previousLevel && newLevel >= 3 ? 1 : 0;

  await prisma.dailyMission.update({ where: { id: missionId }, data: { is_completed: true } });
  await prisma.xpTransaction.create({ data: { user_id: userId, amount: reward, reason: mission.description || "Completed daily mission" } });
  await prisma.user.update({ where: { id: userId }, data: { xp: newXp, level: newLevel, streak_freezes: Number(user.streak_freezes || 0) + freezeReward } });

  return { reward, newXp, newLevel, streakFreezesEarned: freezeReward };
}

async function awardBadges(prisma: any, userId: string, context: any) {
  await ensureBadgeDefinitions(prisma);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return [];

  const totalSessions = await prisma.workoutSession.count({ where: { user_id: userId, completed_at: { not: null } } });
  const sevenDaySessions = await prisma.workoutSession.count({
    where: {
      user_id: userId,
      completed_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  });
  const prCount = await prisma.personalRecord.count({ where: { user_id: userId } });
  const legSessions = await prisma.workoutSession.count({ where: { user_id: userId, muscle_group: "legs", completed_at: { not: null } } });
  const recentSessions = await prisma.workoutSession.findMany({
    where: { user_id: userId, completed_at: { not: null } },
    orderBy: { completed_at: "desc" },
    take: 200,
  });
  const nightSessions = recentSessions.filter((session: any) => {
    const completed = session.completed_at ? new Date(session.completed_at) : null;
    return completed ? completed.getHours() >= 21 : false;
  }).length;
  const fastSessions = recentSessions.filter((session: any) => {
    if (!session.started_at || !session.completed_at) return false;
    const durationMinutes = (new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 60000;
    return durationMinutes < 30;
  }).length;

  const metrics = [
    { name: "First Fire", met: totalSessions >= 1 },
    { name: "Iron Week", met: sevenDaySessions >= 7 },
    { name: "PR Hunter", met: prCount >= 10 },
    { name: "Consistent", met: Number(user.streak || 0) >= 30 },
    { name: "Leg Day Loyalist", met: legSessions >= 20 },
    { name: "Century", met: totalSessions >= 100 },
    { name: "Night Owl", met: nightSessions >= 10 },
    { name: "Speed Runner", met: fastSessions >= 1 },
  ];

  const awarded: Array<{ name: string; icon?: string | null }> = [];
  for (const metric of metrics) {
    if (!metric.met) continue;
    const badge = await prisma.badge.findUnique({ where: { name: metric.name } });
    if (!badge) continue;
    const existing = await prisma.userBadge.findFirst({ where: { user_id: userId, badge_id: badge.id } });
    if (existing) continue;
    await prisma.userBadge.create({ data: { user_id: userId, badge_id: badge.id } });
    awarded.push({ name: badge.name, icon: badge.icon });
  }

  return awarded;
}

export async function getGamificationSummary(prisma: any, userId: string) {
  await ensureBadgeDefinitions(prisma);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const badges = await prisma.userBadge.findMany({ where: { user_id: userId }, include: { badge: true }, orderBy: { earned_at: "desc" } });
  const missions = await getOrCreateDailyMissions(prisma, userId);
  const weeklyChallenge = await buildWeeklyChallenge(prisma, userId);
  const xp = Number(user.xp || 0);
  const levelInfo = getLevelProgress(xp);

  return {
    xp,
    level: levelInfo.level,
    progress: levelInfo.progress,
    currentMin: levelInfo.currentMin,
    nextMin: levelInfo.nextMin,
    streak: Number(user.streak || 0),
    streakFreezeAvailable: Number(user.streak_freezes || 0) > 0,
    streakFreezes: Number(user.streak_freezes || 0),
    badges: badges.map((entry: any) => ({
      id: entry.badge.id,
      name: entry.badge.name,
      description: entry.badge.description,
      icon: entry.badge.icon,
      earnedAt: entry.earned_at,
    })),
    missions,
    weeklyChallenge,
    monthlyChallenge: buildMonthlyChallenge(prisma, userId),
  };
}

export async function useStreakFreeze(prisma: any, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (Number(user.streak_freezes || 0) <= 0) {
    return { used: false, remaining: 0, message: "No streak freezes available." };
  }

  const remaining = Number(user.streak_freezes || 0) - 1;
  await prisma.user.update({ where: { id: userId }, data: { streak_freezes: remaining } });
  return { used: true, remaining, message: "Streak freeze used." };
}

export async function getStreakRiskNotification(prisma: any, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const daysSince = getDaysSince(user.last_active_date);
  const hoursToMidnight = nextMidnightHours();
  const atRisk = (daysSince === null || daysSince >= 1) && hoursToMidnight <= 2;

  if (!atRisk) {
    return { shouldNotify: false, title: "All good", body: "Your streak is not at risk right now." };
  }

  return {
    shouldNotify: true,
    title: "Streak at risk",
    body: `You have ${Math.max(0, Math.ceil(hoursToMidnight))} hour(s) left to train and keep your ${Number(user.streak || 0)}-day streak alive.`,
    streak: Number(user.streak || 0),
    streakFreezes: Number(user.streak_freezes || 0),
  };
}

export async function getOrCreateDailyMissions(prisma: any, userId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const existing = await prisma.dailyMission.findMany({
    where: { user_id: userId, mission_date: startOfDay },
    orderBy: { id: "asc" },
  });
  if (existing.length >= 3) {
    return existing;
  }

  const recentSessions = await prisma.workoutSession.findMany({
    where: { user_id: userId, completed_at: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
    orderBy: { completed_at: "desc" },
    take: 8,
  });
  const counts: Record<string, number> = {};
  for (const session of recentSessions) {
    if (!session.muscle_group) continue;
    counts[session.muscle_group] = (counts[session.muscle_group] || 0) + 1;
  }
  const sortedMuscles = Object.entries(counts).sort((a, b) => a[1] - b[1]).map(([m]) => m);
  const lowestMuscle = sortedMuscles[0] || "back";
  const secondMuscle = sortedMuscles[1] || "core";

  const missionTemplates = [
    { description: `Complete 5 sets of ${lowestMuscle} work`, xp_reward: 75 },
    { description: `Train ${secondMuscle} today with controlled tempo`, xp_reward: 75 },
    { description: "Log body metrics or bodyweight check-in", xp_reward: 75 },
  ];

  const created = [];
  for (const mission of missionTemplates) {
    const row = await prisma.dailyMission.create({
      data: {
        user_id: userId,
        description: mission.description,
        xp_reward: mission.xp_reward,
        is_completed: false,
        mission_date: startOfDay,
      },
    });
    created.push(row);
  }

  return created;
}

export async function buildWeeklyChallenge(prisma: any, userId: string) {
  const recentSessions = await prisma.workoutSession.findMany({
    where: { user_id: userId, completed_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    orderBy: { completed_at: "desc" },
  });
  const weeklyVolume = recentSessions.reduce((acc: number, session: any) => acc + Number(session.total_volume_kg || 0), 0);
  const target = weeklyVolume > 0 ? Math.round(weeklyVolume * 1.1) : 10000;

  return {
    title: "Weekly volume challenge",
    description: `This week: hit ${target.toLocaleString()} kg total volume`,
    targetVolumeKg: target,
    currentVolumeKg: weeklyVolume,
  };
}

export async function buildMonthlyChallenge(prisma: any, userId: string) {
  const recentSessions = await prisma.workoutSession.findMany({
    where: { user_id: userId, completed_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    orderBy: { completed_at: "desc" },
  });
  const squatSessions = recentSessions.filter((session: any) => String(session.muscle_group || "").toLowerCase() === "legs").length;
  const target = Math.max(10, squatSessions + 5);

  return {
    title: "Monthly progression challenge",
    description: `30-day squat progression challenge: complete ${target} leg-focused sessions this month and log each PR attempt.`,
    targetSessions: target,
    currentSessions: squatSessions,
    shareText: `I'm doing the monthly squat progression challenge on Nextyra: ${target} leg-focused sessions this month.`,
  };
}
