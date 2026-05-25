import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_51PxxxxMockKeyPlaceHolder";

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-04-10" as any,
});
