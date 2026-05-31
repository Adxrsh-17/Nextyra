export type SubscriptionPlanId = "lift_start" | "momentum_pro" | "coach_console";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  name: string;
  priceLabel: string;
  amountPaise: number;
  currency: "INR";
  blurb: string;
  features: string[];
};

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlan> = {
  lift_start: {
    id: "lift_start",
    name: "Lift Start",
    priceLabel: "₹999/mo",
    amountPaise: 99900,
    currency: "INR",
    blurb: "For solo lifters who want smart logging and daily motivation.",
    features: ["Workout logging", "History and XP", "Daily training brief"],
  },
  momentum_pro: {
    id: "momentum_pro",
    name: "Momentum Pro",
    priceLabel: "₹1,999/mo",
    amountPaise: 199900,
    currency: "INR",
    blurb: "For serious gym users who want PulsePilot adapting the workout to how they actually feel.",
    features: ["PulsePilot agent", "Recovery dashboard", "Adaptive day plans"],
  },
  coach_console: {
    id: "coach_console",
    name: "Coach Console",
    priceLabel: "₹4,999/mo",
    amountPaise: 499900,
    currency: "INR",
    blurb: "For trainers managing clients with structure, accountability, and shared plans.",
    features: ["Multi-athlete support", "Client progress view", "Program oversight"],
  },
};

export function isSubscriptionPlanId(planId: string): planId is SubscriptionPlanId {
  return planId in SUBSCRIPTION_PLANS;
}

export function getSubscriptionPlan(planId: string): SubscriptionPlan | null {
  return isSubscriptionPlanId(planId) ? SUBSCRIPTION_PLANS[planId] : null;
}