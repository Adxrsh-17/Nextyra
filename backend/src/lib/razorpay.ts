import dotenv from "dotenv";
import Razorpay from "razorpay";

dotenv.config();

const keyId = process.env.RAZORPAY_KEY_ID ?? "";
const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";

export const razorpayKeyId = keyId;
export const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
export const razorpay = keyId && keySecret ? new Razorpay({ key_id: keyId, key_secret: keySecret }) : null;

export function hasRazorpayKeys() {
	return Boolean(keyId && keySecret);
}