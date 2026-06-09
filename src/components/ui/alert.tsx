import * as React from "react";
import { Info, CheckCircle2, AlertCircle, XCircle, X } from "lucide-react";

import { cn } from "@/lib/utils";

// TapTap Design System alert. Variants mirror the Figma "Variants" spec:
//   - status: info / success / warning / error  (tinted bg + border + filled circular icon)
//   - layout: single-line (text only) or multi-line (title + description)
//   - action: optional node (link or button) rendered before the close button
export type AlertStatus = "info" | "success" | "warning" | "error";

const STATUS: Record<
  AlertStatus,
  { Icon: typeof Info; container: string; icon: string }
> = {
  info: { Icon: Info, container: "border-tt-info-200 bg-tt-info-50", icon: "fill-tt-info-600 text-white" },
  success: { Icon: CheckCircle2, container: "border-tt-success-200 bg-tt-success-50", icon: "fill-tt-success-600 text-white" },
  warning: { Icon: AlertCircle, container: "border-tt-warning-200 bg-tt-warning-50", icon: "fill-tt-warning-500 text-white" },
  error: { Icon: XCircle, container: "border-tt-danger-200 bg-tt-danger-50", icon: "fill-tt-danger-600 text-white" },
};

export function Alert({
  status = "info",
  title,
  children,
  action,
  onClose,
  className,
}: {
  status?: AlertStatus;
  /** When set, renders the multi-line layout (bold title + description). */
  title?: React.ReactNode;
  /** Body text — the only content for single-line, the description for multi-line. */
  children?: React.ReactNode;
  /** Optional action (link or button), shown before the close button. */
  action?: React.ReactNode;
  /** When set, shows a close (×) button. */
  onClose?: () => void;
  className?: string;
}) {
  const { Icon, container, icon } = STATUS[status];
  const multiline = !!title;
  return (
    <div
      role="alert"
      className={cn(
        "flex w-full gap-3 rounded-lg border px-4 py-3 text-sm",
        multiline ? "items-start" : "items-center",
        container,
        className,
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", multiline && "mt-0.5", icon)} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold text-foreground">{title}</p>}
        {children && <div className={cn("text-foreground/80", title && "mt-0.5 leading-relaxed")}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={cn("shrink-0 rounded p-0.5 text-foreground/40 transition hover:text-foreground", multiline && "self-start")}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Kept for compatibility / composing custom content inside an Alert.
export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn("mb-1 font-semibold leading-none tracking-tight", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <div className={cn("text-sm leading-relaxed [&_p]:leading-relaxed", className)} {...props} />;
}
