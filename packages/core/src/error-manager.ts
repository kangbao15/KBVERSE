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

const VALID_SEVERITIES = new Set<ErrorSeverity>([
  "info",
  "warning",
  "error",
  "critical"
]);

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
    const severity = options.severity ?? "error";
    const source = options.source ?? "unknown";

    if (!VALID_SEVERITIES.has(severity)) {
      throw new Error(`Invalid error severity: ${String(severity)}.`);
    }

    if (typeof source !== "string" || !source.trim()) {
      throw new Error("Error source must be a non-empty string.");
    }

    if (!Number.isSafeInteger(this.nextId)) {
      throw new Error("Error record ID limit has been reached.");
    }

    const message = this.getErrorMessage(error);

    const record: CoreErrorRecord = Object.freeze({
      id: this.nextId++,
      message,
      severity,
      source,
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
    if (typeof handler !== "function") {
      throw new TypeError("Error handler must be a function.");
    }

    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  getHistory(): readonly CoreErrorRecord[] {
    return [...this.records];
  }

  getBySeverity(severity: ErrorSeverity): readonly CoreErrorRecord[] {
    if (!VALID_SEVERITIES.has(severity)) {
      throw new Error(`Invalid error severity: ${String(severity)}.`);
    }

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

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    try {
      return String(error);
    } catch {
      return "An unknown error occurred.";
    }
  }
}
