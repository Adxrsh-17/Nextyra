"use client";

import { useEffect, useMemo, useState } from "react";

export type WorkoutHeatmapSet = {
  exerciseName: string;
  weight: number;
  reps: number;
  setNumber: number;
};

export type WorkoutHeatmapSession = {
  id: string;
  muscleGroup: string;
  completedAt: string;
  totalVolumeKg?: number;
  xpEarned?: number;
  sets?: WorkoutHeatmapSet[];
};

type HeatmapDay = {
  key: string;
  date: Date;
  label: string;
  sessions: WorkoutHeatmapSession[];
  totalVolumeKg: number;
  totalXp: number;
  muscleGroups: string[];
  exercises: string[];
};

type WorkoutHeatmapProps = {
  sessions: WorkoutHeatmapSession[];
  days?: number;
  title: string;
  subtitle: string;
  mode?: "annual" | "compact";
};

const HEATMAP_LEVELS = [
  { label: "Rest", color: "#1a1a2e" },
  { label: "Light", color: "#16213e" },
  { label: "Medium", color: "#0f3460" },
  { label: "Heavy", color: "#533483" },
  { label: "Beast", color: "#e94560" },
];

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatLongDate(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function formatMuscleName(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getCellLevel(volumeKg: number) {
  if (!volumeKg) return 0;
  if (volumeKg < 1000) return 1;
  if (volumeKg < 3000) return 2;
  if (volumeKg < 6000) return 3;
  return 4;
}

function getLevelLabel(level: number) {
  return HEATMAP_LEVELS[level]?.label ?? HEATMAP_LEVELS[0].label;
}

function buildHeatmapDays(sessions: WorkoutHeatmapSession[], totalDays: number) {
  const summaryByDate = new Map<string, HeatmapDay>();

  for (const session of sessions) {
    const completedAt = new Date(session.completedAt);
    if (Number.isNaN(completedAt.getTime())) continue;

    const key = toDateKey(completedAt);
    const existing = summaryByDate.get(key);
    const exercises = Array.from(new Set((session.sets ?? []).map((set) => set.exerciseName)));

    if (!existing) {
      summaryByDate.set(key, {
        key,
        date: completedAt,
        label: formatShortDate(completedAt),
        sessions: [session],
        totalVolumeKg: Number(session.totalVolumeKg ?? 0),
        totalXp: Number(session.xpEarned ?? 0),
        muscleGroups: session.muscleGroup ? [session.muscleGroup] : [],
        exercises,
      });
      continue;
    }

    existing.sessions.push(session);
    existing.totalVolumeKg += Number(session.totalVolumeKg ?? 0);
    existing.totalXp += Number(session.xpEarned ?? 0);
    if (session.muscleGroup && !existing.muscleGroups.includes(session.muscleGroup)) {
      existing.muscleGroups.push(session.muscleGroup);
    }
    for (const exercise of exercises) {
      if (!existing.exercises.includes(exercise)) {
        existing.exercises.push(exercise);
      }
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (totalDays - 1 - index));

    const key = toDateKey(date);
    const summary = summaryByDate.get(key);
    return {
      key,
      date,
      label: formatShortDate(date),
      sessions: summary?.sessions ?? [],
      totalVolumeKg: summary?.totalVolumeKg ?? 0,
      totalXp: summary?.totalXp ?? 0,
      muscleGroups: summary?.muscleGroups ?? [],
      exercises: summary?.exercises ?? [],
    } satisfies HeatmapDay;
  });

  const selectedKey =
    days.slice().reverse().find((day) => day.sessions.length > 0)?.key ??
    days[days.length - 1]?.key ??
    "";

  return { days, summaryByDate, selectedKey };
}

export default function WorkoutHeatmap({ sessions, days = 364, title, subtitle, mode = "annual" }: WorkoutHeatmapProps) {
  const { days: heatmapDays, summaryByDate, selectedKey } = useMemo(
    () => buildHeatmapDays(sessions, days),
    [sessions, days]
  );

  const [activeDayKey, setActiveDayKey] = useState(selectedKey);

  useEffect(() => {
    if (!selectedKey) return;
    if (!activeDayKey || !heatmapDays.find((day) => day.key === activeDayKey)) {
      setActiveDayKey(selectedKey);
    }
  }, [activeDayKey, heatmapDays, selectedKey]);

  const activeDay = summaryByDate.get(activeDayKey) ?? heatmapDays[heatmapDays.length - 1];
  const totalVolume = heatmapDays.reduce((accumulator, day) => accumulator + day.totalVolumeKg, 0);
  const activeDays = heatmapDays.filter((day) => day.totalVolumeKg > 0).length;

  const weeks = useMemo(() => {
    const result: HeatmapDay[][] = [];
    for (let index = 0; index < heatmapDays.length; index += 7) {
      result.push(heatmapDays.slice(index, index + 7));
    }
    return result;
  }, [heatmapDays]);

  return (
    <div className="activity-heatmap">
      <div className="panel-header activity-heatmap-header">
        <div>
          <div className="section-title">Consistency map</div>
          <div className="section-heading">{title}</div>
          <div className="panel-note">{subtitle}</div>
        </div>
        <div className="heatmap-legend heatmap-legend-card">
          {HEATMAP_LEVELS.map((level, index) => (
            <span key={level.label} className="heatmap-legend-item">
              <span className="heatmap-legend-swatch" style={{ backgroundColor: level.color }} />
              {getLevelLabel(index)}
            </span>
          ))}
        </div>
      </div>

      <div className="heatmap-grid-wrap">
        {mode === "compact" ? (
          <div className="heatmap-strip">
            {heatmapDays.map((day, index) => {
              const intensity = getCellLevel(day.totalVolumeKg);
              const selected = activeDayKey === day.key;

              return (
                <button
                  key={day.key}
                  type="button"
                  className={`heatmap-cell heatmap-cell-level-${intensity} ${selected ? "is-selected" : ""}`}
                  onClick={() => setActiveDayKey(day.key)}
                  aria-pressed={selected}
                  aria-label={`${day.label} - ${day.totalVolumeKg.toLocaleString()} kg`}
                  title={`${day.label} • ${day.totalVolumeKg.toLocaleString()} kg`}
                  style={{ animationDelay: `${index * 18}ms` }}
                >
                  <span className="heatmap-cell-sr">{day.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="heatmap-grid heatmap-grid-annual">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="heatmap-week heatmap-week-annual">
                {week.map((day, dayIndex) => {
                  const intensity = getCellLevel(day.totalVolumeKg);
                  const selected = activeDayKey === day.key;

                  return (
                    <button
                      key={day.key}
                      type="button"
                      className={`heatmap-cell heatmap-cell-level-${intensity} ${selected ? "is-selected" : ""}`}
                      onClick={() => setActiveDayKey(day.key)}
                      aria-pressed={selected}
                      aria-label={`${day.label} - ${day.totalVolumeKg.toLocaleString()} kg`}
                      title={`${day.label} • ${day.totalVolumeKg.toLocaleString()} kg`}
                      style={{ animationDelay: `${(weekIndex * 7 + dayIndex) * 12}ms` }}
                    >
                      <span className="heatmap-cell-sr">{day.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="heatmap-summary">
        <div className="summary-card heatmap-summary-card">
          <div className="section-title">Selected day</div>
          <div className="section-heading" style={{ marginTop: "0.35rem" }}>
            {activeDay ? formatLongDate(activeDay.date) : "No day selected"}
          </div>
          <div className="heatmap-metrics">
            <div className="pill">{(activeDay?.totalVolumeKg ?? 0).toLocaleString()} kg</div>
            <div className="pill">{activeDay?.sessions.length ?? 0} session(s)</div>
            <div className="pill">{(activeDay?.totalXp ?? 0).toLocaleString()} XP</div>
          </div>

          {activeDay?.sessions.length ? (
            <div className="heatmap-session-list">
              {activeDay.sessions.map((session) => (
                <article key={session.id} className="heatmap-session-item">
                  <div className="session-top">
                    <div>
                      <div className="session-title">{formatMuscleName(session.muscleGroup)} focus</div>
                      <div className="timeline-date">{formatLongDate(new Date(session.completedAt))}</div>
                    </div>
                    <div className="pill">+{Number(session.xpEarned ?? 0)} XP</div>
                  </div>
                  <div className="helper-text" style={{ marginTop: "0.55rem" }}>
                    {Number(session.totalVolumeKg ?? 0).toLocaleString()} kg total load
                  </div>
                  <div className="heatmap-exercise-list">
                    {session.sets && session.sets.length
                      ? Array.from(new Set(session.sets.map((set) => set.exerciseName))).slice(0, 4).join(" • ")
                      : "No exercise details available"}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="panel-empty" style={{ marginTop: "0.75rem" }}>
              No sessions were logged on this day.
            </div>
          )}
        </div>

        <div className="summary-card heatmap-stats-card">
          <div className="section-title">Overview</div>
          <div className="heatmap-stat-stack">
            <div>
              <div className="metric-label">Tracked volume</div>
              <div className="metric-value" style={{ fontSize: "1.65rem" }}>
                {totalVolume.toLocaleString()} kg
              </div>
            </div>
            <div>
              <div className="metric-label">Active days</div>
              <div className="metric-value" style={{ fontSize: "1.65rem" }}>
                {activeDays}
              </div>
            </div>
            <div>
              <div className="metric-label">Latest signal</div>
              <div className="metric-value" style={{ fontSize: "1.1rem" }}>
                {activeDay ? getLevelLabel(getCellLevel(activeDay.totalVolumeKg)) : "Rest"}
              </div>
            </div>
          </div>
          <div className="helper-text" style={{ marginTop: "0.9rem", lineHeight: 1.6 }}>
            Tap any cell to inspect the workout summary behind that color. The heatmap scales from rest days to heavy training days using logged session volume.
          </div>
        </div>
      </div>
    </div>
  );
}