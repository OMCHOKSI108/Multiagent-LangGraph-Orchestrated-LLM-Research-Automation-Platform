import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium font-sans ring-offset-bg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/15 focus-visible:border-accent disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "bg-accent text-white hover:bg-[#D4874A] transition-colors",
                destructive: "bg-error text-white hover:opacity-90 transition-opacity",
                outline: "bg-surface text-text border border-border hover:border-accent transition-colors",
                secondary: "bg-surface text-text border border-border hover:border-accent transition-colors",
                ghost: "bg-transparent text-muted hover:text-text transition-colors",
                link: "text-accent underline-offset-4 hover:underline",
                primary: "bg-accent text-white hover:bg-[#D4874A] transition-colors",
                danger: "bg-error text-white hover:opacity-90 transition-opacity",
            },
            size: {
                default: "h-10 px-4",
                sm: "h-8 px-3 text-xs",
                lg: "h-12 px-8",
                icon: "h-10 w-10 px-0",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
    isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, isLoading, children, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </Comp>
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
