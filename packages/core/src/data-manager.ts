export interface DataRecord<T = unknown> {
  readonly key: string;
  readonly namespace: string;
  readonly value: T;
  readonly version: number;
  readonly updatedAt: number;
}

export class KbDataManager {
  private readonly records = new Map<string, DataRecord>();

  private makeId(namespace: string, key: string): string {
    if (!namespace.trim() || !key.trim()) {
      throw new Error("Namespace and key cannot be empty.");
    }

    return `${namespace}:${key}`;
  }

  set<T>(namespace: string, key: string, value: T): DataRecord<T> {
    const id = this.makeId(namespace, key);
    const previous = this.records.get(id);

    const record: DataRecord<T> = Object.freeze({
      namespace,
      key,
      value,
      version: (previous?.version ?? 0) + 1,
      updatedAt: Date.now()
    });

    this.records.set(id, record);
    return record;
  }

  get<T>(namespace: string, key: string): T | undefined {
    return this.records.get(this.makeId(namespace, key))?.value as T | undefined;
  }

  getRecord<T>(namespace: string, key: string): DataRecord<T> | undefined {
    return this.records.get(this.makeId(namespace, key)) as DataRecord<T> | undefined;
  }

  has(namespace: string, key: string): boolean {
    return this.records.has(this.makeId(namespace, key));
  }

  delete(namespace: string, key: string): boolean {
    return this.records.delete(this.makeId(namespace, key));
  }

  list(namespace?: string): readonly DataRecord[] {
    return [...this.records.values()].filter(
      (record) => namespace === undefined || record.namespace === namespace
    );
  }

  snapshot(): readonly DataRecord[] {
    return Object.freeze([...this.records.values()]);
  }

  restore(snapshot: readonly DataRecord[]): void {
    const restored = new Map<string, DataRecord>();

    for (const record of snapshot) {
      const id = this.makeId(record.namespace, record.key);

      if (restored.has(id)) {
        throw new Error(`Duplicate data record "${id}" in snapshot.`);
      }

      restored.set(id, Object.freeze({ ...record }));
    }

    this.records.clear();

    for (const [id, record] of restored) {
      this.records.set(id, record);
    }
  }

  clear(namespace?: string): void {
    if (namespace === undefined) {
      this.records.clear();
      return;
    }

    for (const record of this.records.values()) {
      if (record.namespace === namespace) {
        this.records.delete(this.makeId(namespace, record.key));
      }
    }
  }

  get size(): number {
    return this.records.size;
  }
}
