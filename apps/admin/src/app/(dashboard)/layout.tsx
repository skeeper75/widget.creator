import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

/**
 * Dashboard layout with sidebar navigation and topbar.
 * REQ-U-008: Responsive sidebar with 6 domain groups.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
