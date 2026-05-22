"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/workout/new",
    label: "Log Workout",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "History",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <aside
      style={{
        width: "230px",
        flexShrink: 0,
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 14px",
        gap: "4px",
        transition: "background 0.25s ease, border-color 0.25s ease",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "0 10px", marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              fontWeight: 800,
              color: "var(--accent-text)",
            }}
          >
            N
          </div>
          <div>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>
              Nextyra
            </p>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>Fitness Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 10px", marginBottom: "6px" }}>
          Menu
        </p>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "9px 12px",
                borderRadius: "10px",
                textDecoration: "none",
                fontWeight: isActive ? 600 : 500,
                fontSize: "13.5px",
                transition: "all 0.15s ease",
                background: isActive ? "var(--accent-subtle)" : "transparent",
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
                border: isActive ? "1px solid var(--border-accent)" : "1px solid transparent",
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Theme Toggle */}
      <button
        onClick={toggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px 14px",
          borderRadius: "12px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "13px",
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          marginBottom: "12px",
          boxShadow: "var(--shadow-sm)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bg-hover)";
          e.currentTarget.style.borderColor = "var(--border-accent)";
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "var(--shadow-md)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--bg-card)";
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "var(--shadow-sm)";
        }}
      >
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "6px",
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent-text)",
          }}
        >
          {theme === "dark" ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          )}
        </div>
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
      </button>

      {/* User Card */}
      <div
        style={{
          padding: "12px",
          borderRadius: "10px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          transition: "all 0.25s ease",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            fontWeight: 700,
            color: "var(--accent-text)",
            flexShrink: 0,
          }}
        >
          A
        </div>
        <div>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>Athlete</p>
          <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>Level 8 · 3,540 XP</p>
        </div>
      </div>
    </aside>
  );
}
