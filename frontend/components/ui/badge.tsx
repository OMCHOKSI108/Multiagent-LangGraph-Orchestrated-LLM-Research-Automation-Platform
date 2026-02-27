import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-mono font-medium border",
    {
        variants: {
            variant: {
                default: "bg-[var(--color-surface-2)] text-[var(--color-text-sec)] border-[var(--color-border)]",
                secondary: "bg-[var(--color-surface-2)] text-[var(--color-text-sec)] border-[var(--color-border)]",
                destructive: "bg-red-500/10 text-red-400 border border-red-500/30",
                outline: "bg-transparent text-[var(--color-text)] border-[var(--color-border)]",

                running: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
                queued: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
                complete: "bg-teal-500/10 text-teal-400 border border-teal-500/30",
                failed: "bg-red-500/10 text-red-400 border border-red-500/30",
                paused: "bg-[var(--color-surface-2)] text-[var(--color-text-sec)] border-[var(--color-border)]",
                waiting: "bg-accent/10 text-accent border border-accent/30",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
    showDot?: boolean;
}

function Badge({ className, variant, showDot = true, children, ...props }: BadgeProps) {

    const dotColors: Record<string, string> = {
        running: "bg-blue-500 animate-pulse",
        queued: "bg-amber-500",
        complete: "bg-teal-400",
        failed: "bg-red-500",
        paused: "bg-slate-400",
        waiting: "bg-accent animate-pulse",
    };

    const dotClass = variant && dotColors[variant] ? dotColors[variant] : null;

    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props}>
            {showDot && dotClass && (
                <span className={cn("h-1.5 w-1.5 rounded-full inline-block", dotClass)} aria-hidden="true"></span>
            )}
            {children}
        </div>
    )
}

export { Badge, badgeVariants }
