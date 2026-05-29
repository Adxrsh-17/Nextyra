import { generateText } from "./llm";
import {
  calculateDetailedRecovery,
  generateWeeklyPlan,
  analyzePerformance,
  adaptivePlan
} from "./agents";

async function classifyIntent(message: string): Promise<"plan" | "adapt" | "recovery" | "performance" | "chat"> {
  const hasApiKey = !!(process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY);
  if (!hasApiKey) {
    const lower = message.toLowerCase();
    if (lower.includes("plan") || lower.includes("generate") || lower.includes("schedule") || lower.includes("split") || lower.includes("workout program")) {
      return "plan";
    }
    if (lower.includes("adapt") || lower.includes("reschedule") || lower.includes("shift") || lower.includes("skip") || lower.includes("missed") || lower.includes("scale")) {
      return "adapt";
    }
    if (lower.includes("recover") || lower.includes("fresh") || lower.includes("sore") || lower.includes("tired") || lower.includes("fatigue")) {
      return "recovery";
    }
    if (lower.includes("progress") || lower.includes("plateau") || lower.includes("stall") || lower.includes("pr") || lower.includes("volume")) {
      return "performance";
    }
    return "chat";
  }

  const systemPrompt = `You are a router assistant for a fitness application. Classify the user's request into exactly one of these five intents:
- "plan" (User wants to generate or modify a weekly workout plan split).
- "adapt" (User wants to reschedule a skipped workout, scale intensity due to stress, or update their day splits).
- "recovery" (User is asking about their muscle recovery status, soreness, or fatigue scores).
- "performance" (User is asking about their strength progression, 1RM, plateau Stall warnings, or set counts).
- "chat" (General question, greeting, or conversation not requiring sub-agent execution).

Return ONLY the classification word: "plan", "adapt", "recovery", "performance", or "chat". No explanation, no quotes.`;

  try {
    const reply = await generateText(systemPrompt, `User request: "${message}"`);
    const cleanReply = reply.trim().toLowerCase().replace(/['"']/g, "");
    if (["plan", "adapt", "recovery", "performance", "chat"].includes(cleanReply)) {
      return cleanReply as any;
    }
    return "chat";
  } catch (e) {
    console.error("Failed to classify intent, using fallback:", e);
    return "chat";
  }
}

export async function handleCoachChat(
  prisma: any,
  user: any,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  const userMsg = messages[messages.length - 1]?.content ?? "";
  const intent = await classifyIntent(userMsg);

  // 1. Gather baseline recovery scores
  const recoveryData = await calculateDetailedRecovery(prisma, user);
  const recovery = recoveryData.recoveryMap;

  // 2. Fetch last 5 completed workout sessions
  const recentSessions = await prisma.workoutSession.findMany({
    where: { user_id: user.id, completed_at: { not: null } },
    orderBy: { completed_at: "desc" },
    take: 5,
    include: {
      workout_sets: {
        include: { exercise: true }
      }
    }
  });

  const formattedSessions = recentSessions.map((s: any) => {
    const sets = s.workout_sets.map((set: any) => `${set.exercise.name} (${set.weight_kg}kg x ${set.reps})`).join(", ");
    return `- ${s.completed_at ? new Date(s.completed_at).toLocaleDateString() : "unknown"}: ${s.muscle_group} day. Exercises: ${sets}`;
  }).join("\n");

  // 3. Orchestrate sub-agents based on router classification
  let agentContextInfo = "";

  if (intent === "plan") {
    const planResult = await generateWeeklyPlan(prisma, user);
    agentContextInfo = `\n[Workout Planner Agent executed. Plan: ${JSON.stringify(planResult.plan)}]`;
  } else if (intent === "adapt") {
    const perfReport = await analyzePerformance(prisma, user);
    const underperformingMuscles = perfReport.underperformingMuscles;
    const lastCheckin = await prisma.lifestyleCheckin.findFirst({
      where: { user_id: user.id },
      orderBy: { checkin_date: 'desc' }
    });

    const adaptResult = await adaptivePlan(prisma, user, {
      skippedSessions: underperformingMuscles.map((m: string) => ({ muscleGroup: m })),
      lifestyle: lastCheckin ? {
        energy: lastCheckin.energy_level,
        stress: lastCheckin.stress_level,
        sleep: lastCheckin.sleep_quality,
        notes: lastCheckin.free_text
      } : {}
    });

    agentContextInfo = `\n[Adaptive Planning Agent executed. Result Note: ${adaptResult.note}. Adapted plan: ${JSON.stringify(adaptResult.adaptedPlan)}]`;
  } else if (intent === "recovery") {
    agentContextInfo = `\n[Recovery Agent executed. Detailed recovery statistics: ${JSON.stringify(recoveryData)}]`;
  } else if (intent === "performance") {
    const perfReport = await analyzePerformance(prisma, user);
    agentContextInfo = `\n[Performance Analyst Agent executed. Plateaus: ${JSON.stringify(perfReport.flags)}. Volume gaps: ${JSON.stringify(perfReport.underperformingMuscles)}]`;
  }

  // 4. Construct Supervisor prompt with user context + sub-agent diagnostic findings
  const systemPrompt = `You are PulsePilot, the supervisor agent of an elite fitness AI system.
You coordinate specialized agents (WorkoutPlanner, RecoveryAgent, PerformanceAnalyst, AdaptivePlanner) and formulate synthesized coaching responses.

User Profile:
- Name: ${user.name ?? "Athlete"}
- Fitness Goal: ${user.fitness_goal ?? "General Fitness"}
- Experience Level: ${user.experience_level ?? "Intermediate"}
- Streak: ${user.streak ?? 0} day(s)
- Current Level: ${user.level ?? 1} (${user.xp ?? 0} XP)

Current Muscle Recovery Scores:
${Object.entries(recovery).map(([muscle, score]) => `- ${muscle}: ${score}%`).join("\n")}

Last 5 Completed Workouts:
${formattedSessions || "No workouts logged yet."}
${agentContextInfo ? `\nSupervisor Sub-Agent Diagnostic Output:\n${agentContextInfo}` : ""}

Instructions:
1. Explain the diagnostic output clearly and conversationally.
2. If a planner or adaptive agent was executed, explain the actions taken (e.g. rescheduled days, scaled set count, deload suggestions, etc.) so the user understands their workout is updated.
3. Provide direct recommendations based on their recovery scores and goal.
4. Speak directly as PulsePilot, your tone must be supportive, scientific, and motivating. Keep the answer under 4 sentences if possible.`;

  // 5. Format conversation logs
  let conversationText = "";
  for (const msg of messages) {
    const roleName = msg.role === "user" ? "User" : "PulsePilot";
    conversationText += `${roleName}: ${msg.content}\n`;
  }
  conversationText += `PulsePilot:`;

  try {
    const reply = await generateText(systemPrompt, conversationText);
    return reply.trim();
  } catch (e) {
    console.error("PulsePilot Supervisor Chat LLM error:", e);
    return "I apologize, but I am having trouble connecting to my cognitive models right now. Please check back in a moment!";
  }
}
