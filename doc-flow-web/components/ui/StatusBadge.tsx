import { cn } from "@/lib/utils";

interface StatusBadgeProps {
    status: "success" | "error" | "warning" | "neutral" | "processing";
    children: React.ReactNode;
    className?: string;
    size?: "sm" | "md";
}

const styles = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    error: "bg-rose-50 text-rose-700 border-rose-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    processing: "bg-blue-50 text-blue-700 border-blue-100",
};

const dotStyles = {
    success: "bg-emerald-500",
    error: "bg-rose-500",
    warning: "bg-amber-500",
    neutral: "bg-slate-500",
    processing: "bg-blue-500 animate-pulse",
};

export function StatusBadge({ status, children, className, size = "md" }: StatusBadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium transition-colors",
                size === "sm" ? "text-xs px-2" : "text-sm",
                styles[status],
                className
            )}
        >
            <span className={cn("h-1.5 w-1.5 rounded-full", dotStyles[status])} />
            {children}
        </span>
    );
}
