import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { Sidebar, Topbar } from "@/components/crm/sidebar";
import { AIAssistant } from "@/components/crm/ai-assistant";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const [aiOpen, setAiOpen] = useState(true);
  return (
    <div className="min-h-screen bg-[oklch(0.985_0.003_240)]">
      <Sidebar />
      <div className={cn("pl-[230px] transition-[padding] duration-200", aiOpen && "xl:pr-[384px]")}>
        <Topbar aiOpen={aiOpen} onToggleAI={() => setAiOpen((o) => !o)} />
        <main className="min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
      <AIAssistant open={aiOpen} onClose={() => setAiOpen(false)} />
      <Toaster position="top-right" />
    </div>
  );
}
