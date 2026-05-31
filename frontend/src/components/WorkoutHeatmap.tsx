"use client";

<<<<<<< HEAD
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
=======
import { useMemo, useState } from "react";

export type WorkoutHeatmapSession = {
  id: string;
  userId: string;
  muscleGroup?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  totalVolumeKg?: number;
  xpEarned?: number | null;
  sets?: Array<{
    exerciseName: string;
    weight: number;
    reps?: number | null;
    setNumber?: number | null;
  }>;
};

type HeatmapDay = {
  dateKey: string;
  dateLabel: string;
  volume: number;
  sessions: WorkoutHeatmapSession[];
  xp: number;
  count: number;
>>>>>>> 4f49380 (add Basic Payment Setup)
};

type WorkoutHeatmapProps = {
  sessions: WorkoutHeatmapSession[];
  days?: number;
<<<<<<< HEAD
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
=======
  mode?: "annual" | "compact";
  title?: string;
  subtitle?: string;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildHeatmapDays(sessions: WorkoutHeatmapSession[], days: number): HeatmapDay[] {
  const byDay = new Map<string, HeatmapDay>();
  const today = startOfDay(new Date());

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = toDateKey(date);
    byDay.set(key, {
      dateKey: key,
      dateLabel: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      volume: 0,
      sessions: [],
      xp: 0,
      count: 0,
    });
  }

  for (const session of sessions) {
    const completedAt = session.completedAt ? new Date(session.completedAt) : null;
    if (!completedAt || Number.isNaN(completedAt.getTime())) continue;

    const key = toDateKey(startOfDay(completedAt));
    const entry = byDay.get(key);
    if (!entry) continue;

    entry.volume += Number(session.totalVolumeKg || 0);
    entry.xp += Number(session.xpEarned || 0);
    entry.count += 1;
    entry.sessions.push(session);
  }

  return Array.from(byDay.values());
}

function heatColor(volume: number, maxVolume: number) {
  if (!volume) return "rgba(255,255,255,0.03)";
  const intensity = Math.min(1, volume / Math.max(maxVolume, 1));
  const alpha = 0.15 + intensity * 0.75;
  return `rgba(208, 162, 74, ${alpha})`;
}

export default function WorkoutHeatmap({ sessions, days = 364, mode = "annual", title = "Workout heatmap", subtitle }: WorkoutHeatmapProps) {
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const heatmapDays = useMemo(() => buildHeatmapDays(sessions, days), [sessions, days]);
  const maxVolume = useMemo(() => Math.max(...heatmapDays.map((day) => day.volume), 0), [heatmapDays]);

  const columns = mode === "annual" ? 7 : 14;
  const selectedDay = selectedDateKey ? heatmapDays.find((day) => day.dateKey === selectedDateKey) ?? null : heatmapDays[heatmapDays.length - 1] ?? null;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "end" }}>
        <div>
          <div className="section-title">Pattern analysis</div>
          <div className="section-heading">{title}</div>
          {subtitle ? <div className="helper-text" style={{ marginTop: "0.35rem" }}>{subtitle}</div> : null}
        </div>
        <div className="pill" style={{ background: "var(--bg-soft)", color: "var(--text-soft)" }}>
          {heatmapDays.filter((day) => day.count > 0).length} active days
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: "0.4rem" }}>
        {heatmapDays.map((day) => (
          <button
            key={day.dateKey}
            type="button"
            onClick={() => setSelectedDateKey(day.dateKey)}
            title={`${day.dateLabel}: ${day.volume.toLocaleString()} kg across ${day.count} session${day.count === 1 ? "" : "s"}`}
            style={{
              aspectRatio: "1 / 1",
              borderRadius: "8px",
              border: selectedDay?.dateKey === day.dateKey ? "1px solid var(--accent)" : "1px solid rgba(255,255,255,0.06)",
              background: heatColor(day.volume, maxVolume),
              boxShadow: selectedDay?.dateKey === day.dateKey ? "0 0 0 1px rgba(208, 162, 74, 0.35)" : "none",
              cursor: "pointer",
              transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
            }}
          >
            <span className="sr-only">{day.dateLabel}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div className="helper-text">Low</div>
        <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", flex: 1, minWidth: "220px" }}>
          {[0.1, 0.3, 0.5, 0.7, 1].map((step) => (
            <div key={step} style={{ height: "0.6rem", flex: 1, borderRadius: "999px", background: heatColor(maxVolume * step, maxVolume) }} />
          ))}
        </div>
        <div className="helper-text">High</div>
      </div>

      {selectedDay ? (
        <div className="panel-empty" style={{ display: "grid", gap: "0.5rem" }}>
          <div style={{ fontWeight: 700, color: "var(--text)" }}>{selectedDay.dateLabel}</div>
          <div style={{ color: "var(--text-soft)" }}>{selectedDay.count} session{selectedDay.count === 1 ? "" : "s"}, {selectedDay.volume.toLocaleString()} kg total volume, {selectedDay.xp.toLocaleString()} XP</div>
          {selectedDay.sessions.length ? (
            <div style={{ display: "grid", gap: "0.4rem", marginTop: "0.25rem" }}>
              {selectedDay.sessions.slice(0, 3).map((session) => (
                <div key={session.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", fontSize: "0.85rem", color: "var(--text-soft)" }}>
                  <span style={{ textTransform: "capitalize" }}>{session.muscleGroup || "Workout"}</span>
                  <span>{Number(session.totalVolumeKg || 0).toLocaleString()} kg</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
>>>>>>> 4f49380 (add Basic Payment Setup)
