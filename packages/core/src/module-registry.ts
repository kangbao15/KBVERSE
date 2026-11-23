import type {
  CoreModule,
  ModuleDescriptor,
  ModuleRegistry,
  ModuleState
} from "./contracts.js";

export class KbModuleRegistry implements ModuleRegistry {
  private readonly modules = new Map<string, CoreModule>();
  private readonly states = new Map<string, ModuleState>();

  register(module: CoreModule): void {
    const id = module.id?.trim();
    const version = module.version?.trim();

    if (!id) throw new Error("Module ID cannot be empty.");
    if (!version) throw new Error(`Module "${id}" has no version.`);
    if (this.modules.has(id)) {
      throw new Error(`Module "${id}" is already registered.`);
    }

    const dependencies = module.dependencies ?? [];
    const uniqueDependencies = new Set(dependencies);

    if (uniqueDependencies.size !== dependencies.length) {
      throw new Error(`Module "${id}" contains duplicate dependencies.`);
    }

    if (uniqueDependencies.has(id)) {
      throw new Error(`Module "${id}" cannot depend on itself.`);
    }

    this.modules.set(id, module);
    this.states.set(id, "registered");
  }

  async unregister(id: string): Promise<void> {
    const module = this.modules.get(id);
    if (!module) return;

    const state = this.states.get(id);

    if (state !== "registered" && state !== "stopped" && state !== "failed") {
      throw new Error(
        `Cannot unregister module "${id}" while it is ${state}.`
      );
    }

    const dependents = [...this.modules.values()]
      .filter((candidate) => candidate.dependencies?.includes(id))
      .map((candidate) => candidate.id);

    if (dependents.length > 0) {
      throw new Error(
        `Cannot unregister "${id}": required by ${dependents.join(", ")}.`
      );
    }

    await module.dispose?.();

    this.modules.delete(id);
    this.states.delete(id);
  }

  get(id: string): CoreModule | undefined {
    return this.modules.get(id);
  }

  getState(id: string): ModuleState | undefined {
    return this.states.get(id);
  }

  setState(id: string, state: ModuleState): void {
    if (!this.modules.has(id)) {
      throw new Error(`Unknown module "${id}".`);
    }

    this.states.set(id, state);
  }

  list(): readonly ModuleDescriptor[] {
    return [...this.modules.values()].map((module) =>
      Object.freeze({
        id: module.id,
        version: module.version,
        dependencies: Object.freeze([...(module.dependencies ?? [])]),
        state: this.states.get(module.id) ?? "registered"
      })
    );
  }

  get size(): number {
    return this.modules.size;
  }
}
