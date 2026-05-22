import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          background: "var(--bg-base)",
          padding: "36px 44px",
          transition: "background 0.25s ease",
        }}
      >
        {children}
      </main>
    </div>
  );
}
