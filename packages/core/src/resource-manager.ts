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
    return [...this.resources.values()]
      .filter((resource) => !type || resource.descriptor.type === type)
      .map((resource) => resource.descriptor);
  }

  async release(id: string): Promise<boolean> {
    const resource = this.resources.get(id);
    if (!resource) return false;

    await resource.dispose?.();
    this.resources.delete(id);

    return true;
  }

  async releaseAll(): Promise<void> {
    const entries = [...this.resources.entries()];
    const failures: Error[] = [];

    for (const [id, resource] of entries.reverse()) {
      try {
        await resource.dispose?.();
        this.resources.delete(id);
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

