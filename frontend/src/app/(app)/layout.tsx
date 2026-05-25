import Sidebar from "@/components/Sidebar";
import ChatDrawer from "@/components/ChatDrawer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        {children}
      </main>
      <ChatDrawer />
    </div>
  );
}
