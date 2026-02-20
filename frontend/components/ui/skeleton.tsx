import { cn } from '../../lib/utils';

export function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-md bg-muted",
                className
            )}
            {...props}
        />
    );
}

/** Skeleton for a full workspace panel (timeline, data explorer, etc.) */
export function PanelSkeleton({ lines = 5 }: { lines?: number }) {
    return (
        <div className="p-4 space-y-3">
            <Skeleton className="h-4 w-1/3" />
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-3 w-3 rounded-full shrink-0" />
                    <Skeleton className="h-3 flex-1" style={{ width: `${60 + Math.random() * 30}%` }} />
                </div>
            ))}
        </div>
    );
}

/** Skeleton for a card-style item (dashboard research cards, etc.) */
export function CardSkeleton() {
    return (
        <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
        </div>
    );
}
