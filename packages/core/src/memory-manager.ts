export interface MemoryAllocation {
  readonly id: string;
  readonly owner: string;
  readonly category: string;
  readonly bytes: number;
  readonly allocatedAt: number;
}

export interface MemoryUsage {
  readonly allocatedBytes: number;
  readonly allocationCount: number;
  readonly limitBytes: number;
  readonly availableBytes: number;
  readonly overLimit: boolean;
}

export class KbMemoryManager {
  private readonly allocations = new Map<string, MemoryAllocation>();
  private readonly limits = new Map<string, number>();

  constructor(private globalLimitBytes = 512 * 1024 * 1024) {
    this.validateLimit(globalLimitBytes);
  }

  allocate(
    id: string,
    owner: string,
    bytes: number,
    category = "general"
  ): MemoryAllocation {
    if (!id.trim() || !owner.trim() || !category.trim()) {
      throw new Error("Allocation ID, owner and category cannot be empty.");
    }

    if (this.allocations.has(id)) {
      throw new Error(`Allocation "${id}" already exists.`);
    }

    if (!Number.isSafeInteger(bytes) || bytes <= 0) {
      throw new Error("Allocation size must be a positive safe integer.");
    }

    const current = this.getUsage().allocatedBytes;

    if (bytes > this.globalLimitBytes - current) {
      throw new Error("Global memory budget exceeded.");
    }

    const categoryLimit = this.limits.get(category);

    if (categoryLimit !== undefined) {
      const categoryUsage = this.getCategoryUsage(category);

      if (bytes > categoryLimit - categoryUsage) {
        throw new Error(`Memory budget exceeded for category "${category}".`);
      }
    }

    const allocation = Object.freeze({
      id,
      owner,
      category,
      bytes,
      allocatedAt: Date.now()
    });

    this.allocations.set(id, allocation);
    return allocation;
  }

  release(id: string): boolean {
    return this.allocations.delete(id);
  }

  releaseOwner(owner: string): number {
    let released = 0;

    for (const allocation of this.allocations.values()) {
      if (allocation.owner === owner) {
        this.allocations.delete(allocation.id);
        released++;
      }
    }

    return released;
  }

  setGlobalLimit(bytes: number): void {
    this.validateLimit(bytes);

    if (bytes < this.getUsage().allocatedBytes) {
      throw new Error("New global limit is below current memory usage.");
    }

    this.globalLimitBytes = bytes;
  }

  setCategoryLimit(category: string, bytes: number): void {
    if (!category.trim()) {
      throw new Error("Category cannot be empty.");
    }

    this.validateLimit(bytes);

    if (bytes < this.getCategoryUsage(category)) {
      throw new Error(`New limit is below current usage for "${category}".`);
    }

    this.limits.set(category, bytes);
  }

  getUsage(): MemoryUsage {
    const allocatedBytes = [...this.allocations.values()].reduce(
      (total, allocation) => total + allocation.bytes,
      0
    );

    return Object.freeze({
      allocatedBytes,
      allocationCount: this.allocations.size,
      limitBytes: this.globalLimitBytes,
      availableBytes: Math.max(0, this.globalLimitBytes - allocatedBytes),
      overLimit: allocatedBytes > this.globalLimitBytes
    });
  }

  getCategoryUsage(category: string): number {
    let total = 0;

    for (const allocation of this.allocations.values()) {
      if (allocation.category === category) {
        total += allocation.bytes;
      }
    }

    return total;
  }

  getOwnerUsage(owner: string): number {
    let total = 0;

    for (const allocation of this.allocations.values()) {
      if (allocation.owner === owner) {
        total += allocation.bytes;
      }
    }

    return total;
  }

  list(): readonly MemoryAllocation[] {
    return [...this.allocations.values()];
  }

  clear(): void {
    this.allocations.clear();
  }

  private validateLimit(bytes: number): void {
    if (!Number.isSafeInteger(bytes) || bytes <= 0) {
      throw new Error("Memory limit must be a positive safe integer.");
    }
  }
}
