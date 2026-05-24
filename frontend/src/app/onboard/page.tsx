"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ApiError } from "@/lib/api";

export default function OnboardPage() {
  const router = useRouter();
  const { onboard, logout } = useAuth();
  const [age, setAge] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("intermediate");
  const [goal, setGoal] = useState("hypertrophy");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const parsedAge = parseInt(age, 10);
    const parsedWeight = parseFloat(weightKg);
    const parsedHeight = parseFloat(heightCm);

    if (isNaN(parsedAge) || parsedAge <= 0) {
      setError("Please enter a valid age.");
      setLoading(false);
      return;
    }
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      setError("Please enter a valid weight in kg.");
      setLoading(false);
      return;
    }
    if (isNaN(parsedHeight) || parsedHeight <= 0) {
      setError("Please enter a valid height in cm.");
      setLoading(false);
      return;
    }

    try {
      await onboard({
        age: parsedAge,
        weightKg: parsedWeight,
        heightCm: parsedHeight,
        experienceLevel,
        goal,
      });
      router.replace("/dashboard");
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Unable to complete onboarding.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-panel" style={{ maxWidth: "28rem" }}>
        <div className="auth-brand">NX</div>
        <div className="section-title">Step 2 of 2</div>
        <h1 className="auth-title">Tell us about your fitness baseline.</h1>
        <p className="auth-copy">
          We use this data to calculate your muscle recovery curves, estimated 1RM progression, and adjust daily training intensity.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <label className="auth-field">
              <span>Age</span>
              <input
                value={age}
                onChange={(event) => setAge(event.target.value)}
                type="number"
                min="1"
                max="120"
                required
                placeholder="25"
              />
            </label>
            <label className="auth-field">
              <span>Weight (kg)</span>
              <input
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
                type="number"
                step="0.1"
                min="10"
                max="500"
                required
                placeholder="75.5"
              />
            </label>
          </div>

          <label className="auth-field">
            <span>Height (cm)</span>
            <input
              value={heightCm}
              onChange={(event) => setHeightCm(event.target.value)}
              type="number"
              step="0.1"
              min="50"
              max="300"
              required
              placeholder="175"
            />
          </label>

          <label className="auth-field">
            <span>Experience Level</span>
            <select
              value={experienceLevel}
              onChange={(event) => setExperienceLevel(event.target.value)}
              style={{
                background: "var(--bg-soft)",
                color: "var(--fg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "0.75rem",
                width: "100%",
                outline: "none",
              }}
            >
              <option value="beginner">Beginner (Under 1 year of training)</option>
              <option value="intermediate">Intermediate (1 - 3 years of training)</option>
              <option value="advanced">Advanced (3+ years of training)</option>
            </select>
          </label>

          <label className="auth-field">
            <span>Primary Goal</span>
            <select
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              style={{
                background: "var(--bg-soft)",
                color: "var(--fg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "0.75rem",
                width: "100%",
                outline: "none",
              }}
            >
              <option value="hypertrophy">Hypertrophy (Build muscle size)</option>
              <option value="strength">Strength (Maximize power lift numbers)</option>
              <option value="fat_loss">Fat Loss (Reduce body fat, maintain muscle)</option>
              <option value="endurance">Endurance (Stamina, high rep capacity)</option>
            </select>
          </label>

          {error ? <p className="auth-error">{error}</p> : null}

          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button
              type="button"
              onClick={logout}
              className="secondary-button"
              style={{ flex: 1, paddingBlock: "0.85rem" }}
            >
              Log out
            </button>
            <button
              type="submit"
              className="primary-button auth-submit"
              disabled={loading}
              style={{ flex: 2, margin: 0, paddingBlock: "0.85rem" }}
            >
              {loading ? "Saving..." : "Start Training"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
