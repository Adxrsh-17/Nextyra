"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    hint: "Recovery, streaks, and performance",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 13h8V3H3z" />
        <path d="M13 21h8v-6h-8z" />
        <path d="M13 3h8v6h-8z" />
        <path d="M3 21h8v-4H3z" />
      </svg>
    ),
  },
  {
    href: "/workout/new",
    label: "Log Workout",
    hint: "Capture each set with focus",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
        <path d="M19 5l-2 2" />
        <path d="M7 17l-2 2" />
        <path d="M19 19l-2-2" />
        <path d="M7 7L5 5" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "Training History",
    hint: "Track progress over time",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="m7 15 4-4 3 3 5-7" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-top">
          <div className="brand-lockup">
            <div className="brand-mark">NX</div>
            <div className="brand-copy">
              <h1>Nextyra</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={toggle}
            className="theme-toggle"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div>
        <p className="sidebar-group-title">Navigation</p>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive ? "nav-link-active" : ""}`}
              >
                <div className="nav-icon">{item.icon}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{item.label}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{item.hint}</div>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="athlete-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>Current profile</div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: "0.2rem" }}>Athlete</div>
            </div>
            <div className="profile-mark">A</div>
          </div>
          <div className="summary-grid">
            <div>
              <div className="mini-stat-label">Level</div>
              <div style={{ marginTop: "0.15rem", fontWeight: 700 }}>8</div>
            </div>
            <div>
              <div className="mini-stat-label">XP</div>
              <div style={{ marginTop: "0.15rem", fontWeight: 700 }}>3,540</div>
            </div>
            <div>
              <div className="mini-stat-label">Streak</div>
              <div style={{ marginTop: "0.15rem", fontWeight: 700 }}>12 days</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
