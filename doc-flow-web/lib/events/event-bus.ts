/**
 * Event Bus - Doc Flow Internal Event System
 *
 * Sistema de pub/sub para comunicação desacoplada entre DCS e DV.
 * Baseado em EventEmitter pattern, funciona in-process.
 *
 * Para escalar futuramente, pode ser substituído por:
 * - Supabase Realtime Broadcast
 * - Redis Pub/Sub
 * - AWS SNS/SQS
 */

import { DocFlowEvent, EventType, EventPayload } from './event-types';

type EventHandler<T extends EventType> = (
    payload: EventPayload<T>,
    timestamp: string
) => void | Promise<void>;

type UnsubscribeFn = () => void;

interface EventSubscription {
    type: EventType;
    handler: EventHandler<EventType>;
    once: boolean;
}

class EventBus {
    private subscriptions: EventSubscription[] = [];
    private eventHistory: DocFlowEvent[] = [];
    private readonly maxHistorySize = 100;

    /**
     * Subscribe to an event type
     */
    on<T extends EventType>(type: T, handler: EventHandler<T>): UnsubscribeFn {
        const subscription: EventSubscription = {
            type,
            handler: handler as unknown as EventHandler<EventType>,
            once: false,
        };

        this.subscriptions.push(subscription);

        return () => {
            const index = this.subscriptions.indexOf(subscription);
            if (index > -1) {
                this.subscriptions.splice(index, 1);
            }
        };
    }

    /**
     * Subscribe to an event type, but only trigger once
     */
    once<T extends EventType>(type: T, handler: EventHandler<T>): UnsubscribeFn {
        const subscription: EventSubscription = {
            type,
            handler: handler as unknown as EventHandler<EventType>,
            once: true,
        };

        this.subscriptions.push(subscription);

        return () => {
            const index = this.subscriptions.indexOf(subscription);
            if (index > -1) {
                this.subscriptions.splice(index, 1);
            }
        };
    }

    /**
     * Emit an event
     */
    async emit<T extends DocFlowEvent>(event: T): Promise<void> {
        // Store in history
        this.eventHistory.push(event);
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }

        // Find matching handlers
        const matchingSubscriptions = this.subscriptions.filter(
            (sub) => sub.type === event.type
        );

        // Execute handlers
        const toRemove: EventSubscription[] = [];

        for (const subscription of matchingSubscriptions) {
            try {
                await subscription.handler(event.payload, event.timestamp);

                if (subscription.once) {
                    toRemove.push(subscription);
                }
            } catch (error) {
                console.error(
                    `[EventBus] Error in handler for event "${event.type}":`,
                    error
                );
            }
        }

        // Remove one-time subscriptions
        for (const sub of toRemove) {
            const index = this.subscriptions.indexOf(sub);
            if (index > -1) {
                this.subscriptions.splice(index, 1);
            }
        }

        // Log event (development)
        if (process.env.NODE_ENV === 'development') {
            console.log(`[EventBus] Emitted: ${event.type}`, event.payload);
        }
    }

    /**
     * Get event history (useful for debugging)
     */
    getHistory(type?: EventType): DocFlowEvent[] {
        if (type) {
            return this.eventHistory.filter((e) => e.type === type);
        }
        return [...this.eventHistory];
    }

    /**
     * Clear all subscriptions (useful for testing)
     */
    clear(): void {
        this.subscriptions = [];
        this.eventHistory = [];
    }

    /**
     * Get count of active subscriptions
     */
    getSubscriptionCount(type?: EventType): number {
        if (type) {
            return this.subscriptions.filter((s) => s.type === type).length;
        }
        return this.subscriptions.length;
    }
}

// Singleton instance
export const eventBus = new EventBus();

// Re-export types for convenience
export * from './event-types';
