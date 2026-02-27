import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 rounded-lg font-sans font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-40 disabled:cursor-not-allowed",
    {
        variants: {
            variant: {
                primary: "bg-accent text-white hover:bg-accent-h active:scale-[0.97] shadow-sm",
                secondary: "bg-surface2 text-text-c border border-border-c hover:bg-surface3 hover:border-border-s active:scale-[0.97]",
                ghost: "bg-transparent text-text-sec hover:bg-surface hover:text-text-c active:scale-[0.97]",
                teal: "bg-teal text-bg font-semibold hover:opacity-90 active:scale-[0.97]",
                danger: "bg-red-600 text-white hover:bg-red-700 active:scale-[0.97]",
                outline_accent: "bg-transparent border border-accent text-accent hover:bg-accent hover:text-white active:scale-[0.97]",

                default: "bg-accent text-white hover:bg-accent-h active:scale-[0.97] shadow-sm",
                destructive: "bg-red-600 text-white hover:bg-red-700 active:scale-[0.97]",
                outline: "bg-transparent border border-accent text-accent hover:bg-accent hover:text-white active:scale-[0.97]",
                link: "text-accent underline-offset-4 hover:underline",
            },
            size: {
                default: "h-10 px-5 text-sm",
                sm: "h-8 px-3 text-xs",
                lg: "h-12 px-7 text-base",
                icon: "h-9 w-9",
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
