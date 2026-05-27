"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "./AuthProvider";

function formatTier(tier?: string | null) {
  if (!tier || tier === "free") return "Free Tier";
  if (tier === "lift_start") return "Lift Start";
  if (tier === "momentum_pro") return "Momentum Pro";
  if (tier === "coach_console") return "Coach Console";
  return tier.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", hint: "Daily motivation and recovery" },
  { href: "/coach", label: "AI Coach Cockpit", hint: "Orchestrate agent splits & recovery" },
  { href: "/workout/new", label: "Log Workout", hint: "Track real sets and finish strong" },
  { href: "/history", label: "Training History", hint: "Sessions, volume, and XP" },
  { href: "/stats", label: "Stats & Analytics", hint: "1RM and muscle load progression" },
  { href: "/metrics", label: "Body Composition", hint: "Weight and tape tracking" },
  { href: "/billing", label: "Membership Options", hint: "Upgrade subscription & plans" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();

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
              <Link key={item.href} href={item.href} className={`nav-link ${isActive ? "nav-link-active" : ""}`}>
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
          <div style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>Signed in as</div>
          <div style={{ marginTop: "0.3rem", fontSize: "1.05rem", fontWeight: 700 }}>{user?.name ?? "Athlete"}</div>
          <div className="helper-text" style={{ marginTop: "0.3rem" }}>
            Goal: {user?.goal ?? "Build muscle"}
          </div>
          <div className="pill" style={{ display: "inline-block", marginTop: "0.55rem", marginBottom: "0.75rem", fontSize: "0.75rem", background: "var(--bg-strong)", color: "var(--accent-strong)", borderColor: "var(--border-strong)", borderWidth: "1px", borderStyle: "solid", fontWeight: 700 }}>
            {formatTier(user?.subscriptionTier)}
          </div>
          <button
            type="button"
            className="ghost-button sidebar-logout"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            style={{ width: "100%", justifyContent: "center" }}
          >
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}
