import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium font-sans transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
                secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive: "border-transparent bg-error text-white hover:bg-error/80",
                outline: "text-foreground",
                running: "border-transparent bg-[#1A2438] text-[#93C5FD]",
                queued: "border-transparent bg-[#2A2010] text-[#FCD34D]",
                complete: "border-transparent bg-[#0A2018] text-[#6EE7B7]",
                failed: "border-transparent bg-[#2A1012] text-[#FCA5A5]",
                paused: "border-transparent bg-[#1A1A1A] text-[#9CA3AF]",
                warning: "border-transparent bg-[#2A1F0A] text-[#FCD34D]",
                error: "border-transparent bg-[#2A1012] text-[#FCA5A5]"
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
        running: "bg-[#3B82F6] animate-pulse",
        queued: "bg-[#D4A017]",
        complete: "bg-[#7EC8A4]",
        failed: "bg-[#C0444A]",
        paused: "bg-[#888580]",
        warning: "bg-[#D4A017]",
        error: "bg-[#C0444A]"
    };

    const dotClass = variant && dotColors[variant] ? dotColors[variant] : null;

    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props}>
            {showDot && dotClass && (
                <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full inline-block", dotClass)} aria-hidden="true"></span>
            )}
            {children}
        </div>
    )
}

export { Badge, badgeVariants }
