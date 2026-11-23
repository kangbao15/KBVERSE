export interface DiagnosticMetric {
  readonly name: string;
  readonly value: number;
  readonly unit: string;
  readonly updatedAt: number;
}

export interface DiagnosticSnapshot {
  readonly capturedAt: number;
  readonly metrics: readonly DiagnosticMetric[];
}

export class KbDiagnostics {
  private readonly metrics = new Map<string, DiagnosticMetric>();

  set(name: string, value: number, unit = ""): void {
    if (!name.trim()) {
      throw new Error("Metric name cannot be empty.");
    }

    if (!Number.isFinite(value)) {
      throw new Error(`Metric "${name}" must have a finite value.`);
    }

    this.metrics.set(
      name,
      Object.freeze({
        name,
        value,
        unit,
        updatedAt: Date.now()
      })
    );
  }

  increment(name: string, amount = 1, unit = ""): number {
    if (!Number.isFinite(amount)) {
      throw new Error("Increment amount must be finite.");
    }

    const current = this.metrics.get(name)?.value ?? 0;
    const next = current + amount;

    this.set(name, next, unit);
    return next;
  }

  get(name: string): DiagnosticMetric | undefined {
    return this.metrics.get(name);
  }

  remove(name: string): boolean {
    return this.metrics.delete(name);
  }

  snapshot(): DiagnosticSnapshot {
    return Object.freeze({
      capturedAt: Date.now(),
      metrics: Object.freeze([...this.metrics.values()])
    });
  }

  reset(): void {
    this.metrics.clear();
  }

  get size(): number {
    return this.metrics.size;
  }
}
