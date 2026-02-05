"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2 } from "lucide-react";

interface Step {
    id: string;
    label: string;
}

interface NarrativeProgressProps {
    steps: Step[];
    currentStepId: string; // The ID of the step currently in progress
    className?: string;
    onComplete?: () => void;
}

export function NarrativeProgress({ steps, currentStepId, className }: NarrativeProgressProps) {
    // We want to show history: steps before current are done.
    const currentIndex = steps.findIndex((s) => s.id === currentStepId);

    return (
        <div className={cn("w-full space-y-3 font-mono text-sm", className)}>
            {steps.map((step, index) => {
                const isCompleted = index < currentIndex;
                const isCurrent = step.id === currentStepId;
                const isPending = index > currentIndex;

                return (
                    <div
                        key={step.id}
                        className={cn(
                            "flex items-center gap-3 transition-colors duration-300",
                            isPending ? "text-muted-foreground/40" : "text-foreground"
                        )}
                    >
                        <div className="relative flex h-5 w-5 items-center justify-center">
                            {isCompleted && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 animate-in zoom-in duration-300" />
                            )}
                            {isCurrent && (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            )}
                            {isPending && (
                                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />
                            )}
                        </div>
                        <span
                            className={cn(
                                isCurrent ? "font-semibold text-blue-700" : "",
                                isCompleted ? "text-emerald-700/80" : ""
                            )}
                        >
                            {step.label}
                            {isCurrent && <span className="animate-pulse">...</span>}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
