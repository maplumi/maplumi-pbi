import { EventData, EventCallback } from "../types/index";

export class EventManager {
    private listeners: Map<string, Set<EventCallback>>;

    constructor() {
        this.listeners = new Map();
    }

    public on(eventType: string, callback: EventCallback): void {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType).add(callback);
    }

    public off(eventType: string, callback: EventCallback): void {
        const callbacks = this.listeners.get(eventType);
        if (callbacks) {
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                this.listeners.delete(eventType);
            }
        }
    }

    public emit(eventType: string, data: any): void {
        const callbacks = this.listeners.get(eventType);
        if (callbacks) {
            const eventData: EventData = {
                type: eventType,
                payload: data
            };
            callbacks.forEach(callback => {
                try {
                    callback(eventData);
                } catch (error) {
                    console.error(`Error in event handler for ${eventType}:`, error);
                }
            });
        }
    }

    public clear(): void {
        this.listeners.clear();
    }

    public hasListeners(eventType: string): boolean {
        return this.listeners.has(eventType) && this.listeners.get(eventType).size > 0;
    }
} 