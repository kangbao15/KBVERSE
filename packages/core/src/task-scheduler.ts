export type TaskPriority = "low" | "normal" | "high" | "critical";

export type TaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface TaskOptions {
  readonly priority?: TaskPriority;
  readonly signal?: AbortSignal;
}

export interface TaskDescriptor {
  readonly id: number;
  readonly name: string;
  readonly priority: TaskPriority;
  readonly status: TaskStatus;
  readonly createdAt: number;
  readonly startedAt?: number;
  readonly finishedAt?: number;
}

export interface TaskHandle<T> {
  readonly id: number;
  readonly promise: Promise<T>;
  cancel(): void;
}

interface InternalTask<T> {
  readonly descriptor: TaskDescriptor;
  readonly execute: (signal: AbortSignal) => Promise<T>;
  readonly controller: AbortController;
  resolve(value: T): void;
  reject(reason: unknown): void;
  detachExternalSignal?: () => void;
}

const PRIORITY: Record<TaskPriority, number> = {
  critical: 3,
  high: 2,
  normal: 1,
  low: 0
};

export class KbTaskScheduler {
  private readonly queue: InternalTask<unknown>[] = [];
  private readonly tasks = new Map<number, InternalTask<unknown>>();
  private nextId = 1;
  private active = 0;
  private closed = false;

  constructor(private readonly concurrency = 4) {
    if (!Number.isInteger(concurrency) || concurrency < 1) {
      throw new Error("Concurrency must be a positive integer.");
    }
  }

  schedule<T>(
    name: string,
    execute: (signal: AbortSignal) => Promise<T> | T,
    options: TaskOptions = {}
  ): TaskHandle<T> {
    if (this.closed) throw new Error("Task scheduler is closed.");
    if (!name.trim()) throw new Error("Task name cannot be empty.");

    if (options.signal?.aborted) {
      throw new Error("Cannot schedule a task with an aborted signal.");
    }

    const id = this.nextId++;
    const controller = new AbortController();

    const descriptor: TaskDescriptor = Object.freeze({
      id,
      name,
      priority: options.priority ?? "normal",
      status: "queued",
      createdAt: Date.now()
    });

    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const task: InternalTask<T> = {
      descriptor,
      execute: async (signal) => execute(signal),
      controller,
      resolve,
      reject
    };

    this.tasks.set(id, task as InternalTask<unknown>);
    this.queue.push(task as InternalTask<unknown>);
    this.sortQueue();

    const cancel = (): void => {
      if (this.get(id)?.status === "queued") {
        this.removeQueued(id);
        controller.abort();
        this.rejectTask(task, new Error(`Task "${name}" was cancelled.`));
        task.detachExternalSignal?.();
        return;
      }

      if (this.get(id)?.status === "running") {
        controller.abort();
      }
    };

    if (options.signal) {
      options.signal.addEventListener("abort", cancel, { once: true });
      task.detachExternalSignal = () => options.signal?.removeEventListener("abort", cancel);
    }

    this.pump();

    return Object.freeze({ id, promise, cancel });
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      const priority =
        PRIORITY[b.descriptor.priority] - PRIORITY[a.descriptor.priority];

      return priority || a.descriptor.createdAt - b.descriptor.createdAt;
    });
  }

  private pump(): void {
    while (!this.closed && this.active < this.concurrency && this.queue.length) {
      const task = this.queue.shift()!;
      this.run(task);
    }
  }

  private async run(task: InternalTask<unknown>): Promise<void> {
    this.active++;

    this.replaceDescriptor(task, {
      status: "running",
      startedAt: Date.now()
    });

    try {
      const value = await task.execute(task.controller.signal);

      if (task.controller.signal.aborted) {
        throw new Error("Task was cancelled.");
      }

      task.resolve(value);
      this.replaceDescriptor(task, {
        status: "completed",
        finishedAt: Date.now()
      });
    } catch (error) {
      this.rejectTask(task, error);
    } finally {
      task.detachExternalSignal?.();
      this.active--;
      this.pump();
    }
  }

  private rejectTask(task: InternalTask<unknown>, error: unknown): void {
    task.reject(error);

    this.replaceDescriptor(task, {
      status: task.controller.signal.aborted ? "cancelled" : "failed",
      finishedAt: Date.now()
    });
  }

  private replaceDescriptor(
    task: InternalTask<unknown>,
    update: Partial<TaskDescriptor>
  ): void {
    const descriptor = Object.freeze({
      ...task.descriptor,
      ...update
    });

    Object.defineProperty(task, "descriptor", {
      value: descriptor,
      configurable: true
    });
  }

  private removeQueued(id: number): void {
    const index = this.queue.findIndex(
      (task) => task.descriptor.id === id
    );

    if (index >= 0) this.queue.splice(index, 1);
  }

  get(id: number): TaskDescriptor | undefined {
    return this.tasks.get(id)?.descriptor;
  }

  list(): readonly TaskDescriptor[] {
    return [...this.tasks.values()].map((task) => task.descriptor);
  }

  reopen(): void {
    if (this.active > 0 || this.queue.length > 0) {
      throw new Error("Cannot reopen scheduler while tasks are active.");
    }

    this.closed = false;
  }
  async shutdown(gracePeriodMs = 1000): Promise<void> {
    if (!Number.isFinite(gracePeriodMs) || gracePeriodMs < 0) {
      throw new Error("Shutdown grace period must be a non-negative number.");
    }

    this.closed = true;

    for (const task of this.queue.splice(0)) {
      task.controller.abort();
      this.rejectTask(task, new Error("Task scheduler shut down."));
      task.detachExternalSignal?.();
    }

    for (const task of this.tasks.values()) {
      if (task.descriptor.status === "running") {
        task.controller.abort();
      }
    }

    const deadline = Date.now() + gracePeriodMs;

    while (this.active > 0 && Date.now() < deadline) {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(10, Math.max(1, deadline - Date.now())))
      );
    }

    if (this.active > 0) {
      const running = [...this.tasks.values()]
        .filter((task) => task.descriptor.status === "running")
        .map((task) => task.descriptor.name);

      throw new Error(
        `Task scheduler shutdown timed out. Still running: ${running.join(", ")}`
      );
    }
  }
}


