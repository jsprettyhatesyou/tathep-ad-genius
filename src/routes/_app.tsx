import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Sidebar, Topbar } from "@/components/crm/sidebar";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="min-h-screen bg-[oklch(0.985_0.003_240)]">
      <Sidebar />
      <div className="pl-[230px]">
        <Topbar />
        <main className="min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
