import type { CoreContext, CoreModule } from "./contracts.js";
import { KbEventBus } from "./event-bus.js";
import { KbModuleRegistry } from "./module-registry.js";
import { KbLifecycleManager } from "./lifecycle-manager.js";
import { KbStateManager } from "./state-manager.js";
import { KbErrorManager } from "./error-manager.js";
import { KbDiagnostics } from "./diagnostics.js";
import { KbTaskScheduler } from "./task-scheduler.js";
import { KbResourceManager } from "./resource-manager.js";
import { KbDataManager } from "./data-manager.js";
import { KbMemoryManager } from "./memory-manager.js";

export class KBVerseCore implements CoreContext {
  readonly events = new KbEventBus();
  readonly modules = new KbModuleRegistry();
  readonly lifecycle: KbLifecycleManager;
  readonly state = new KbStateManager();
  readonly errors = new KbErrorManager();
  readonly diagnostics = new KbDiagnostics();
  readonly tasks = new KbTaskScheduler();
  readonly resources = new KbResourceManager();
  readonly data = new KbDataManager();
  readonly memory = new KbMemoryManager();

  private initialized = false;
  private started = false;
  private stopping = false;

  constructor() {
    this.lifecycle = new KbLifecycleManager(this.modules, this);

    this.errors.subscribe((record) => {
      this.events.emit("core:error", record);
    });
  }

  register(module: CoreModule): void {
    if (this.stopping) {
      throw new Error("Cannot register modules while core shutdown is incomplete.");
    }

    if (this.initialized) {
      throw new Error("Cannot register modules after core initialization.");
    }

    this.modules.register(module);
  }

  async initialize(): Promise<void> {
    if (this.stopping) {
      throw new Error("Cannot initialize core while shutdown is incomplete.");
    }

    if (this.initialized) {
      throw new Error("Core is already initialized.");
    }

    try {
      this.tasks.reopen();
      await this.lifecycle.initializeAll();
      this.initialized = true;
      this.events.emit("core:initialized");
    } catch (error) {
      this.errors.report(error, {
        severity: "critical",
        source: "core:lifecycle"
      });
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this.stopping) {
      throw new Error("Cannot start core while shutdown is incomplete.");
    }

    if (!this.initialized) {
      throw new Error("Core must be initialized before starting.");
    }

    if (this.started) {
      throw new Error("Core is already running.");
    }

    try {
      await this.lifecycle.startAll();
      this.started = true;
      this.events.emit("core:started");
    } catch (error) {
      this.errors.report(error, {
        severity: "critical",
        source: "core:lifecycle"
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.initialized) return;

    this.stopping = true;

    const failures: unknown[] = [];
    let lifecycleStopped = false;

    const cleanupSteps = [
      () => this.tasks.shutdown(),
      () => this.resources.releaseAll(),
      async () => {
        await this.lifecycle.stopAll();
        lifecycleStopped = true;
      }
    ];

    for (const cleanup of cleanupSteps) {
      try {
        await cleanup();
      } catch (error) {
        failures.push(error);
      }
    }

    if (lifecycleStopped) {
      this.started = false;
    }

    if (failures.length > 0) {
      const error = new AggregateError(failures, "Core shutdown failed.");
      this.errors.report(error, {
        severity: "error",
        source: "core:shutdown"
      });
      throw error;
    }

    this.started = false;
    this.initialized = false;
    this.stopping = false;
    this.events.emit("core:stopped");
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  get isRunning(): boolean {
    return this.started;
  }

  get isStopping(): boolean {
    return this.stopping;
  }
}
