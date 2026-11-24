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
    this.validateName(name);

    if (!Number.isFinite(value)) {
      throw new Error(`Metric "${name}" must have a finite value.`);
    }

    if (typeof unit !== "string") {
      throw new TypeError("Metric unit must be a string.");
    }

    this.metrics.set(name, Object.freeze({
      name,
      value,
      unit,
      updatedAt: Date.now()
    }));
  }

  increment(name: string, amount = 1, unit = ""): number {
    this.validateName(name);

    if (!Number.isFinite(amount)) {
      throw new Error("Increment amount must be finite.");
    }

    const next = (this.metrics.get(name)?.value ?? 0) + amount;

    if (!Number.isFinite(next)) {
      throw new Error(`Metric "${name}" exceeded the finite number range.`);
    }

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
      metrics: Object.freeze(
        [...this.metrics.values()].map((metric) =>
          Object.freeze({ ...metric })
        )
      )
    });
  }

  reset(): void {
    this.metrics.clear();
  }

  get size(): number {
    return this.metrics.size;
  }

  private validateName(name: string): void {
    if (typeof name !== "string" || !name.trim()) {
      throw new Error("Metric name cannot be empty.");
    }
  }
}
