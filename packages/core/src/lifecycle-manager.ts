import type { CoreContext, ModuleContext } from "./contracts.js";
import { KbModuleRegistry } from "./module-registry.js";

export class KbLifecycleManager {
  private controller = new AbortController();
  private operation: string | null = null;

  constructor(
    private readonly registry: KbModuleRegistry,
    private readonly core: CoreContext
  ) {}

  private enter(operation: string): void {
    if (this.operation !== null) {
      throw new Error(
        `Lifecycle operation "${this.operation}" is already in progress.`
      );
    }

    this.operation = operation;
  }

  private leave(): void {
    this.operation = null;
  }

  private resolveOrder(): string[] {
    const modules = this.registry.list();
    const known = new Set(modules.map((module) => module.id));
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (id: string): void => {
      if (visited.has(id)) return;

      if (visiting.has(id)) {
        throw new Error(`Circular module dependency detected at "${id}".`);
      }

      const module = this.registry.get(id);
      if (!module) throw new Error(`Unknown module "${id}".`);

      visiting.add(id);

      for (const dependency of module.dependencies ?? []) {
        if (!known.has(dependency)) {
          throw new Error(
            `Module "${id}" requires missing module "${dependency}".`
          );
        }

        visit(dependency);
      }

      visiting.delete(id);
      visited.add(id);
      order.push(id);
    };

    for (const module of modules) visit(module.id);

    return order;
  }

  private context(controller = this.controller): ModuleContext {
    return {
      core: this.core,
      signal: controller.signal
    };
  }

  async initializeAll(): Promise<void> {
    this.enter("initialize");

    try {
      const order = this.resolveOrder();
      const initialized: string[] = [];
      this.controller = new AbortController();

      for (const id of order) {
        const module = this.registry.get(id)!;
        const state = this.registry.getState(id);

        if (state !== "registered" && state !== "stopped") {
          throw new Error(`Module "${id}" is not in the registered state.`);
        }

        this.registry.setState(id, "initializing");

        try {
          await module.initialize?.(this.context());
          this.registry.setState(id, "initialized");
          initialized.push(id);
        } catch (error) {
          const failures: Error[] = [
            new Error(`Failed to initialize module "${id}".`, {
              cause: error
            })
          ];

          this.registry.setState(id, "failed");

          const cleanupContext = this.context(new AbortController());

          try {
            await module.stop?.(cleanupContext);
            this.registry.setState(id, "stopped");
          } catch (cleanupError) {
            failures.push(
              new Error(`Failed to clean up module "${id}".`, {
                cause: cleanupError
              })
            );
          }

          for (const rollbackId of initialized.reverse()) {
            const rollbackModule = this.registry.get(rollbackId)!;

            try {
              await rollbackModule.stop?.(cleanupContext);
              this.registry.setState(rollbackId, "stopped");
            } catch (rollbackError) {
              this.registry.setState(rollbackId, "failed");
              failures.push(
                new Error(`Failed to roll back module "${rollbackId}".`, {
                  cause: rollbackError
                })
              );
            }
          }

          if (failures.length > 1) {
            throw new AggregateError(
              failures,
              `Initialization and rollback failed for module "${id}".`
            );
          }

          throw failures[0];
        }
      }
    } finally {
      this.leave();
    }
  }

  async startAll(): Promise<void> {
    this.enter("start");

    try {
      const order = this.resolveOrder();
      const started: string[] = [];
      const cleanupContext = this.context(new AbortController());

      for (const id of order) {
        const module = this.registry.get(id)!;

        if (this.registry.getState(id) !== "initialized") {
          throw new Error(`Module "${id}" is not initialized.`);
        }

        this.registry.setState(id, "starting");

        try {
          await module.start?.(this.context());
          this.registry.setState(id, "running");
          started.push(id);
        } catch (error) {
          const failures: Error[] = [
            new Error(`Failed to start module "${id}".`, {
              cause: error
            })
          ];

          this.registry.setState(id, "failed");

          try {
            await module.stop?.(cleanupContext);
            this.registry.setState(id, "stopped");
          } catch (cleanupError) {
            failures.push(
              new Error(`Failed to clean up module "${id}".`, {
                cause: cleanupError
              })
            );
          }

          for (const rollbackId of started.reverse()) {
            const rollbackModule = this.registry.get(rollbackId)!;

            try {
              await rollbackModule.stop?.(cleanupContext);
              this.registry.setState(rollbackId, "stopped");
            } catch (rollbackError) {
              this.registry.setState(rollbackId, "failed");
              failures.push(
                new Error(`Failed to roll back module "${rollbackId}".`, {
                  cause: rollbackError
                })
              );
            }
          }

          if (failures.length > 1) {
            throw new AggregateError(
              failures,
              `Start and rollback failed for module "${id}".`
            );
          }

          throw failures[0];
        }
      }
    } finally {
      this.leave();
    }
  }

  async stopAll(): Promise<void> {
    this.enter("stop");

    try {
      const order = this.resolveOrder().reverse();
      const failures: Error[] = [];

      this.controller.abort();

      const cleanupContext = this.context(new AbortController());

      for (const id of order) {
        const state = this.registry.getState(id);

        if (state !== "running" && state !== "initialized") continue;

        const module = this.registry.get(id)!;
        this.registry.setState(id, "stopping");

        try {
          await module.stop?.(cleanupContext);
          this.registry.setState(id, "stopped");
        } catch (error) {
          this.registry.setState(id, "failed");
          failures.push(
            new Error(`Failed to stop module "${id}".`, {
              cause: error
            })
          );
        }
      }

      if (failures.length > 0) {
        throw new AggregateError(
          failures,
          "One or more modules failed to stop."
        );
      }
    } finally {
      this.leave();
    }
  }
}
