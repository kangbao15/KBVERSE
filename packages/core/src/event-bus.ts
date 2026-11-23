import type { EventBus, EventListener } from "./contracts.js";

export class KbEventBus implements EventBus {
  private readonly listeners = new Map<string, Set<EventListener>>();
  private emitDepth = 0;
  private readonly maxEmitDepth: number;

  constructor(maxEmitDepth = 100) {
    if (!Number.isSafeInteger(maxEmitDepth) || maxEmitDepth <= 0) {
      throw new Error("Maximum emit depth must be a positive safe integer.");
    }

    this.maxEmitDepth = maxEmitDepth;
  }

  on<T = unknown>(event: string, listener: EventListener<T>): () => void {
    if (!event.trim()) throw new Error("Event name cannot be empty.");

    let bucket = this.listeners.get(event);

    if (!bucket) {
      bucket = new Set();
      this.listeners.set(event, bucket);
    }

    const handler = listener as EventListener;
    bucket.add(handler);

    return () => this.off(event, handler);
  }

  once<T = unknown>(event: string, listener: EventListener<T>): () => void {
    let unsubscribe = () => {};

    unsubscribe = this.on<T>(event, (data) => {
      unsubscribe();
      listener(data);
    });

    return unsubscribe;
  }

  emit<T = unknown>(event: string, data?: T): void {
    if (this.emitDepth >= this.maxEmitDepth) {
      throw new Error("Maximum event emission depth exceeded.");
    }

    const bucket = this.listeners.get(event);
    if (!bucket) return;

    const errors: Error[] = [];
    this.emitDepth++;

    try {
      for (const listener of [...bucket]) {
        try {
          listener(data);
        } catch (error) {
          errors.push(
            new Error(`Listener failed for event "${event}".`, {
              cause: error
            })
          );
        }
      }
    } finally {
      this.emitDepth--;
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, `Event "${event}" listener failures.`);
    }
  }

  off(event: string, listener: EventListener): void {
    const bucket = this.listeners.get(event);
    if (!bucket) return;

    bucket.delete(listener);

    if (bucket.size === 0) {
      this.listeners.delete(event);
    }
  }

  clear(event?: string): void {
    if (event !== undefined) {
      this.listeners.delete(event);
      return;
    }

    this.listeners.clear();
  }

  listenerCount(event?: string): number {
    if (event !== undefined) {
      return this.listeners.get(event)?.size ?? 0;
    }

    let total = 0;

    for (const bucket of this.listeners.values()) {
      total += bucket.size;
    }

    return total;
  }
}
