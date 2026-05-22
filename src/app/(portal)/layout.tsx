import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="h-screen grid"
      style={{ gridTemplateColumns: "var(--sidebar-w) 1fr" }}
    >
      <Sidebar />
      <div className="flex flex-col min-h-0">
        <Topbar />
        <main
          className="flex-1 overflow-y-auto"
          style={{ padding: "var(--pad)", background: "var(--bg)" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
