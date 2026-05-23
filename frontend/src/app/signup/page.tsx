"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

const GOALS = [
  "Build muscle",
  "Lose fat",
  "Increase strength",
  "Stay consistent",
];

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [name, setName] = useState("Athlete");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [goal, setGoal] = useState(GOALS[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signup({ name, email, password, goal });
      router.replace("/dashboard");
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-panel">
        <div className="auth-brand">NX</div>
        <div className="section-title">Create account</div>
        <h1 className="auth-title">Start with a setup that feels like a real product, not a demo.</h1>
        <p className="auth-copy">
          Tell Nextyra your goal and we will shape the dashboard around better motivation and training decisions.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} type="text" required />
          </label>
          <label className="auth-field">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={6} required />
          </label>
          <label className="auth-field">
            <span>Primary goal</span>
            <select value={goal} onChange={(event) => setGoal(event.target.value)}>
              {GOALS.map((goalOption) => (
                <option key={goalOption} value={goalOption}>
                  {goalOption}
                </option>
              ))}
            </select>
          </label>
          {error ? <p className="auth-error">{error}</p> : null}
          <button type="submit" className="primary-button auth-submit" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have an account?</span>
          <Link href="/login">Log in</Link>
        </div>
      </section>
    </div>
  );
}
