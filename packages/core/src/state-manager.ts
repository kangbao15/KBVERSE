export interface StateSnapshot<T> {
  readonly value: T;
  readonly version: number;
  readonly updatedAt: number;
}

export type StateListener<T> = (
  next: StateSnapshot<T>,
  previous: StateSnapshot<T>
) => void;

export class KbStateManager {
  private readonly states = new Map<string, StateSnapshot<unknown>>();
  private readonly listeners = new Map<string, Set<StateListener<never>>>();

  create<T>(key: string, initialValue: T): void {
    this.validateKey(key);

    if (this.states.has(key)) {
      throw new Error(`State "${key}" already exists.`);
    }

    this.states.set(key, this.snapshot(initialValue, 0));
  }

  get<T>(key: string): T | undefined {
    return this.states.get(key)?.value as T | undefined;
  }

  getSnapshot<T>(key: string): StateSnapshot<T> | undefined {
    return this.states.get(key) as StateSnapshot<T> | undefined;
  }

  set<T>(key: string, value: T): void {
    const previous = this.states.get(key);

    if (!previous) {
      throw new Error(`State "${key}" does not exist.`);
    }

    const next = this.snapshot(value, previous.version + 1);
    this.states.set(key, next);

    const listeners = this.listeners.get(key);
    if (!listeners) return;

    for (const listener of [...listeners]) {
      (listener as StateListener<T>)(next, previous as StateSnapshot<T>);
    }
  }

  update<T>(key: string, updater: (current: T) => T): void {
    const current = this.getSnapshot<T>(key);

    if (!current) {
      throw new Error(`State "${key}" does not exist.`);
    }

    this.set(key, updater(current.value));
  }

  subscribe<T>(key: string, listener: StateListener<T>): () => void {
    if (!this.states.has(key)) {
      throw new Error(`State "${key}" does not exist.`);
    }

    let bucket = this.listeners.get(key);

    if (!bucket) {
      bucket = new Set();
      this.listeners.set(key, bucket);
    }

    bucket.add(listener as StateListener<never>);

    return () => {
      bucket?.delete(listener as StateListener<never>);

      if (bucket?.size === 0) {
        this.listeners.delete(key);
      }
    };
  }

  delete(key: string): boolean {
    this.listeners.delete(key);
    return this.states.delete(key);
  }

  clear(): void {
    this.listeners.clear();
    this.states.clear();
  }

  private snapshot<T>(value: T, version: number): StateSnapshot<T> {
    return Object.freeze({
      value,
      version,
      updatedAt: Date.now()
    });
  }

  private validateKey(key: string): void {
    if (!key.trim()) {
      throw new Error("State key cannot be empty.");
    }
  }
}
