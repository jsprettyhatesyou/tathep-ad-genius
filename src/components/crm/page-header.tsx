import { type ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/60 bg-white/60 px-8 py-5 backdrop-blur md:h-[88px] md:flex-row md:items-center md:justify-between md:py-0">
      <div>
        <h1 className="text-h2 font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 min-h-[1.25rem] text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
