import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Sparkles,
  Building2,
  GitBranch,
  Users,
  Activity,
  Eye,
  ChevronLeft,
  Monitor,
  Search,
  Bell,
  Settings,
  UserCheck,
  Upload,
  Radar,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  ai?: boolean;
  matchExact?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: "",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Lead Intelligence",
    items: [
      { to: "/lead-finder", label: "AI Lead Finder", icon: Search, ai: true },
      { to: "/content-planner", label: "AI Content Planner", icon: Radar, ai: true },
      { to: "/leads/import", label: "Import Leads", icon: Upload, ai: true },
      { to: "/leads", label: "Leads", icon: UserCheck, matchExact: true },
    ],
  },
  {
    label: "CRM",
    items: [
      { to: "/companies", label: "Accounts", icon: Building2 },
      { to: "/pipeline", label: "Pipeline", icon: GitBranch },
      { to: "/contacts", label: "Contacts", icon: Users },
      { to: "/activities", label: "Activities", icon: Activity },
    ],
  },
  {
    label: "Screens",
    items: [
      { to: "/inventory", label: "Billboard Inventory", icon: Monitor },
    ],
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-[230px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-brand text-white shadow-elevated">
          <Eye className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-fresco">ตาเทพ แพลตฟอร์ม</p>
            <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">Smart DOOH CRM</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-1">
            {!collapsed && section.label && (
              <p className="mb-1 mt-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {section.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = item.matchExact
                  ? pathname === item.to || pathname === item.to + "/"
                  : item.exact
                    ? pathname === item.to
                    : pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <li key={item.to} className="relative">
                    {active && <span className="absolute inset-y-1 left-0 w-[3px] rounded-r-full bg-fresco" />}
                    <Link
                      to={item.to}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-nav-active text-fresco"
                          : "text-slate-600 hover:bg-slate-50 hover:text-fresco",
                        collapsed && "justify-center px-0"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-fresco")} />
                      {!collapsed && (
                        <span className="flex-1 truncate">{item.label}</span>
                      )}
                      {!collapsed && item.ai && (
                        <span className="rounded-full bg-gradient-brand px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                          AI
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-3">
        <div className={cn("flex items-center gap-2", collapsed && "flex-col")}>
          <button className={cn("flex items-center gap-2 rounded-lg p-2 text-slate-600 hover:bg-slate-50", !collapsed && "flex-1")}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-xs font-semibold text-white">
              นท
            </div>
            {!collapsed && (
              <div className="min-w-0 text-left">
                <p className="truncate text-xs font-medium text-foreground">เนท</p>
                <p className="truncate text-[10px] text-muted-foreground">Marketing</p>
              </div>
            )}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-fresco"
            title={collapsed ? "Expand" : "Collapse"}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function Topbar({ aiOpen, onToggleAI }: { aiOpen?: boolean; onToggleAI?: () => void } = {}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-white px-8 shadow-sm">
      <div className="relative w-full max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search companies, deals, contacts…"
          className="h-9 w-full rounded-lg border border-input bg-slate-50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-fresco focus:bg-white focus:outline-none focus:ring-2 focus:ring-lake/30"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleAI}
          title="AI Assistant"
          aria-label="AI Assistant"
          className={cn(
            "flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition",
            aiOpen
              ? "w-9 justify-center bg-fresco/10 text-fresco hover:bg-fresco/20"
              : "px-3 bg-fresco text-white hover:bg-fresco/90",
          )}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          {!aiOpen && <span>AI Assistant</span>}
        </button>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-fresco">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-taptap-aux-600 ring-2 ring-white" />
        </button>
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-fresco">
          <Settings className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
}

export function SidebarSpacer({ children }: { children: React.ReactNode }) {
  // Always use expanded width as a baseline; on collapse the sidebar overlays
  return <div className="pl-[230px]">{children}</div>;
}
