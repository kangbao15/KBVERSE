import type { CoreContext, ModuleContext } from "./contracts.js";
import { KbModuleRegistry } from "./module-registry.js";

export class KbLifecycleManager {
  private controller = new AbortController();

  constructor(
    private readonly registry: KbModuleRegistry,
    private readonly core: CoreContext
  ) {}

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

  private context(): ModuleContext {
    return {
      core: this.core,
      signal: this.controller.signal
    };
  }

  async initializeAll(): Promise<void> {
    const order = this.resolveOrder();
    const initialized: string[] = [];

    this.controller = new AbortController();

    for (const id of order) {
      const module = this.registry.get(id)!;

      if (this.registry.getState(id) !== "registered" && this.registry.getState(id) !== "stopped") {
        throw new Error(`Module "${id}" is not in the registered state.`);
      }

      this.registry.setState(id, "initializing");

      try {
        await module.initialize?.(this.context());
        this.registry.setState(id, "initialized");
        initialized.push(id);
      } catch (error) {
        this.registry.setState(id, "failed");

        for (const rollbackId of initialized.reverse()) {
          const rollbackModule = this.registry.get(rollbackId)!;

          try {
            await rollbackModule.stop?.(this.context());
            this.registry.setState(rollbackId, "stopped");
          } catch {
            this.registry.setState(rollbackId, "failed");
          }
        }

        throw new Error(`Failed to initialize module "${id}".`, {
          cause: error
        });
      }
    }
  }

  async startAll(): Promise<void> {
    const order = this.resolveOrder();

    for (const id of order) {
      const module = this.registry.get(id)!;

      if (this.registry.getState(id) !== "initialized") {
        throw new Error(`Module "${id}" is not initialized.`);
      }

      this.registry.setState(id, "starting");

      try {
        await module.start?.(this.context());
        this.registry.setState(id, "running");
      } catch (error) {
        this.registry.setState(id, "failed");
        throw new Error(`Failed to start module "${id}".`, {
          cause: error
        });
      }
    }
  }

  async stopAll(): Promise<void> {
    const order = this.resolveOrder().reverse();
    const failures: Error[] = [];

    this.controller.abort();

    for (const id of order) {
      const state = this.registry.getState(id);

      if (state !== "running" && state !== "initialized") continue;

      const module = this.registry.get(id)!;
      this.registry.setState(id, "stopping");

      try {
        await module.stop?.(this.context());
        this.registry.setState(id, "stopped");
      } catch (error) {
        this.registry.setState(id, "failed");
        failures.push(
          new Error(`Failed to stop module "${id}".`, { cause: error })
        );
      }
    }

    if (failures.length > 0) {
      throw new AggregateError(failures, "One or more modules failed to stop.");
    }
  }
}

