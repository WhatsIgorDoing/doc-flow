"use client";

import * as React from "react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface NarrativeProgressProps {
    value: number
    steps: string[]
    currentStep?: string // Direct override
    className?: string
    isFinished?: boolean
}

export function NarrativeProgress({
    value,
    steps,
    currentStep,
    className,
    isFinished = false
}: NarrativeProgressProps) {
    const [displayStep, setDisplayStep] = React.useState(steps[0])

    React.useEffect(() => {
        if (currentStep) {
            setDisplayStep(currentStep)
            return
        }

        if (value === 0) {
            setDisplayStep(steps[0])
            return
        }
        if (value === 100 || isFinished) {
            setDisplayStep(steps[steps.length - 1])
            return
        }

        // Cycle through intermediate steps based on value
        const totalSteps = steps.length - 1 // Exclude last 'done' step from auto-cycle
        const stepIndex = Math.min(
            Math.floor((value / 100) * totalSteps),
            totalSteps - 1
        )
        const logicalStep = steps[stepIndex]

        // Only update if not already showing the final step
        if (displayStep !== steps[steps.length - 1]) {
            setDisplayStep(logicalStep)
        }

    }, [value, steps, isFinished, currentStep, displayStep])

    return (
        <div className={cn("w-full space-y-3", className)}>
            <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-ink-900 animate-pulse">
                    {displayStep}
                </p>
                <span className="text-xs font-mono text-muted-foreground">
                    {Math.round(value)}%
                </span>
            </div>
            <Progress value={value} className="h-2 transition-all duration-300 bg-slate-100" />
        </div>
    )
}
