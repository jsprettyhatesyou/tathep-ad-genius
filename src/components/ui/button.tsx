import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // TapTap Primary — solid teal, deepens on hover (600 → 700)
        default: "bg-primary text-primary-foreground shadow-elev-1 hover:bg-taptap-700 hover:shadow-elev-2 active:bg-taptap-700",
        // TapTap Danger
        destructive: "bg-destructive text-destructive-foreground shadow-elev-1 hover:bg-taptap-danger active:brightness-95",
        // TapTap Outline — teal border + teal text, fills with teal-50 on hover
        outline:
          "border border-primary/50 bg-background text-primary shadow-elev-1 hover:bg-taptap-50 hover:border-primary",
        // Neutral secondary (TapTap gray)
        secondary: "bg-secondary text-secondary-foreground shadow-elev-1 hover:bg-taptap-neutral-300",
        // TapTap Ghost — teal text, transparent, teal-50 on hover
        ghost: "text-primary hover:bg-taptap-50 hover:text-taptap-700",
        // TapTap Link
        link: "text-primary underline-offset-4 hover:text-taptap-700 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-lg px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
