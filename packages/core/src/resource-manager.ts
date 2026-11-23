export interface ResourceDescriptor {
  readonly id: string;
  readonly type: string;
  readonly createdAt: number;
  readonly lastAccessedAt: number;
}

interface ManagedResource<T> {
  readonly value: T;
  readonly descriptor: ResourceDescriptor;
  readonly dispose?: () => void | Promise<void>;
}

export class KbResourceManager {
  private readonly resources = new Map<string, ManagedResource<unknown>>();
  private readonly releasing = new Map<string, Promise<void>>();
  private disposed = false;

  register<T>(
    id: string,
    type: string,
    value: T,
    dispose?: (value: T) => void | Promise<void>
  ): void {
    this.ensureActive();

    if (!id.trim()) throw new Error("Resource ID cannot be empty.");
    if (!type.trim()) throw new Error("Resource type cannot be empty.");
    if (this.resources.has(id)) {
      throw new Error(`Resource "${id}" already exists.`);
    }

    const now = Date.now();

    this.resources.set(id, {
      value,
      dispose: dispose ? () => dispose(value) : undefined,
      descriptor: Object.freeze({
        id,
        type,
        createdAt: now,
        lastAccessedAt: now
      })
    });
  }

  get<T>(id: string): T | undefined {
    this.ensureActive();

    const resource = this.resources.get(id);
    if (!resource) return undefined;

    this.resources.set(id, {
      ...resource,
      descriptor: Object.freeze({
        ...resource.descriptor,
        lastAccessedAt: Date.now()
      })
    });

    return resource.value as T;
  }

  has(id: string): boolean {
    return this.resources.has(id);
  }

  list(type?: string): readonly ResourceDescriptor[] {
    return Object.freeze(
      [...this.resources.values()]
        .filter((resource) => !type || resource.descriptor.type === type)
        .map((resource) => resource.descriptor)
    );
  }

  async release(id: string): Promise<boolean> {
    this.ensureActive();

    if (this.releasing.has(id)) return false;

    const resource = this.resources.get(id);
    if (!resource) return false;

    const operation = (async () => {
      await resource.dispose?.();
      this.resources.delete(id);
    })();

    this.releasing.set(id, operation);

    try {
      await operation;
      return true;
    } finally {
      if (this.releasing.get(id) === operation) {
        this.releasing.delete(id);
      }
    }
  }

  async releaseAll(): Promise<void> {
    this.ensureActive();

    const entries = [...this.resources.keys()].reverse();
    const failures: Error[] = [];

    for (const id of entries) {
      const pending = this.releasing.get(id);

      if (pending) {
        try {
          await pending;
        } catch (error) {
          failures.push(
            new Error(`Failed to release resource "${id}".`, {
              cause: error
            })
          );
        }
        continue;
      }

      try {
        await this.release(id);
      } catch (error) {
        failures.push(
          new Error(`Failed to release resource "${id}".`, {
            cause: error
          })
        );
      }
    }

    if (failures.length > 0) {
      throw new AggregateError(failures, "Resource cleanup failed.");
    }
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;

    await this.releaseAll();
    this.disposed = true;
  }

  private ensureActive(): void {
    if (this.disposed) {
      throw new Error("Resource manager has been disposed.");
    }
  }

  get size(): number {
    return this.resources.size;
  }
}
