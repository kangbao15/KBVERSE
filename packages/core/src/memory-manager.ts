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
  private readonly categoryUsage = new Map<string, number>();
  private readonly ownerUsage = new Map<string, number>();
  private allocatedBytes = 0;

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

    if (bytes > this.globalLimitBytes - this.allocatedBytes) {
      throw new Error("Global memory budget exceeded.");
    }

    const currentCategoryUsage = this.categoryUsage.get(category) ?? 0;
    const categoryLimit = this.limits.get(category);

    if (
      categoryLimit !== undefined &&
      bytes > categoryLimit - currentCategoryUsage
    ) {
      throw new Error(`Memory budget exceeded for category "${category}".`);
    }

    const allocation: MemoryAllocation = Object.freeze({
      id,
      owner,
      category,
      bytes,
      allocatedAt: Date.now()
    });

    this.allocations.set(id, allocation);
    this.allocatedBytes += bytes;
    this.categoryUsage.set(category, currentCategoryUsage + bytes);
    this.ownerUsage.set(owner, (this.ownerUsage.get(owner) ?? 0) + bytes);

    return allocation;
  }

  release(id: string): boolean {
    const allocation = this.allocations.get(id);
    if (!allocation) return false;

    this.removeAllocation(allocation);
    return true;
  }

  releaseOwner(owner: string): number {
    let released = 0;

    for (const allocation of [...this.allocations.values()]) {
      if (allocation.owner === owner) {
        this.removeAllocation(allocation);
        released++;
      }
    }

    return released;
  }

  setGlobalLimit(bytes: number): void {
    this.validateLimit(bytes);

    if (bytes < this.allocatedBytes) {
      throw new Error("New global limit is below current memory usage.");
    }

    this.globalLimitBytes = bytes;
  }

  setCategoryLimit(category: string, bytes: number): void {
    if (!category.trim()) {
      throw new Error("Category cannot be empty.");
    }

    this.validateLimit(bytes);

    if (bytes < (this.categoryUsage.get(category) ?? 0)) {
      throw new Error(`New limit is below current usage for "${category}".`);
    }

    this.limits.set(category, bytes);
  }

  getUsage(): MemoryUsage {
    return Object.freeze({
      allocatedBytes: this.allocatedBytes,
      allocationCount: this.allocations.size,
      limitBytes: this.globalLimitBytes,
      availableBytes: Math.max(0, this.globalLimitBytes - this.allocatedBytes),
      overLimit: this.allocatedBytes > this.globalLimitBytes
    });
  }

  getCategoryUsage(category: string): number {
    return this.categoryUsage.get(category) ?? 0;
  }

  getOwnerUsage(owner: string): number {
    return this.ownerUsage.get(owner) ?? 0;
  }

  list(): readonly MemoryAllocation[] {
    return Object.freeze([...this.allocations.values()]);
  }

  clear(): void {
    this.allocations.clear();
    this.categoryUsage.clear();
    this.ownerUsage.clear();
    this.allocatedBytes = 0;
  }

  private removeAllocation(allocation: MemoryAllocation): void {
    this.allocations.delete(allocation.id);
    this.allocatedBytes -= allocation.bytes;

    this.decreaseUsage(this.categoryUsage, allocation.category, allocation.bytes);
    this.decreaseUsage(this.ownerUsage, allocation.owner, allocation.bytes);
  }

  private decreaseUsage(
    usage: Map<string, number>,
    key: string,
    bytes: number
  ): void {
    const remaining = (usage.get(key) ?? 0) - bytes;

    if (remaining <= 0) {
      usage.delete(key);
    } else {
      usage.set(key, remaining);
    }
  }

  private validateLimit(bytes: number): void {
    if (!Number.isSafeInteger(bytes) || bytes <= 0) {
      throw new Error("Memory limit must be a positive safe integer.");
    }
  }
}
