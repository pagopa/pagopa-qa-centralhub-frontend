import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return (
    <div
      className="h-screen grid overflow-hidden"
      style={{
        gridTemplateColumns: "var(--sidebar-w) minmax(0, 1fr)",
        gridTemplateRows: "minmax(0, 1fr)",
        minWidth: "calc(var(--sidebar-w) + 560px)",
      }}
    >
      <Sidebar />
      {/* min-w-0/min-h-0 and a positioned <main>: wide, tall or absolutely positioned content (sr-only, hidden inputs) scrolls inside <main>, never the whole page. */}
      <div className="flex flex-col min-h-0 min-w-0">
        <Topbar />
        <main
          className="relative flex-1 overflow-y-auto"
          style={{ padding: "var(--pad)", background: "var(--bg)" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
