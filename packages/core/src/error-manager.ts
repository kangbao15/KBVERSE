export type ErrorSeverity = "info" | "warning" | "error" | "critical";

export interface CoreErrorRecord {
  readonly id: number;
  readonly message: string;
  readonly severity: ErrorSeverity;
  readonly source: string;
  readonly timestamp: number;
  readonly cause?: unknown;
}

export type CoreErrorHandler = (record: CoreErrorRecord) => void;

export class KbErrorManager {
  private readonly records: CoreErrorRecord[] = [];
  private readonly handlers = new Set<CoreErrorHandler>();
  private nextId = 1;

  constructor(private readonly historyLimit = 1000) {
    if (!Number.isInteger(historyLimit) || historyLimit < 1) {
      throw new Error("Error history limit must be a positive integer.");
    }
  }

  report(
    error: unknown,
    options: {
      severity?: ErrorSeverity;
      source?: string;
    } = {}
  ): CoreErrorRecord {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    const record: CoreErrorRecord = Object.freeze({
      id: this.nextId++,
      message,
      severity: options.severity ?? "error",
      source: options.source ?? "unknown",
      timestamp: Date.now(),
      cause: error instanceof Error ? error.cause : undefined
    });

    this.records.push(record);

    if (this.records.length > this.historyLimit) {
      this.records.shift();
    }

    for (const handler of [...this.handlers]) {
      try {
        handler(record);
      } catch {
        // An error handler must not interrupt error reporting.
      }
    }

    return record;
  }

  subscribe(handler: CoreErrorHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  getHistory(): readonly CoreErrorRecord[] {
    return [...this.records];
  }

  getBySeverity(severity: ErrorSeverity): readonly CoreErrorRecord[] {
    return this.records.filter(
      (record) => record.severity === severity
    );
  }

  clearHistory(): void {
    this.records.length = 0;
  }

  get size(): number {
    return this.records.length;
  }
}
