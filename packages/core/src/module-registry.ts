import type {
  CoreModule,
  ModuleDescriptor,
  ModuleRegistry,
  ModuleState
} from "./contracts.js";

const ALLOWED_TRANSITIONS: Readonly<Record<ModuleState, readonly ModuleState[]>> = {
  registered: ["initializing"],
  initializing: ["initialized", "failed"],
  initialized: ["starting", "stopping", "stopped"],
  starting: ["running", "failed"],
  running: ["stopping", "initialized", "failed"],
  stopping: ["stopped", "failed"],
  stopped: ["initializing", "stopping"],
  failed: ["stopped", "initialized", "stopping"]
};

export class KbModuleRegistry implements ModuleRegistry {
  private readonly modules = new Map<string, CoreModule>();
  private readonly states = new Map<string, ModuleState>();
  private readonly dependencies = new Map<string, readonly string[]>();

  register(module: CoreModule): void {
    const id = module.id?.trim();
    const version = module.version?.trim();

    if (!id) throw new Error("Module ID cannot be empty.");
    if (!version) throw new Error(`Module "${id}" has no version.`);
    if (this.modules.has(id)) {
      throw new Error(`Module "${id}" is already registered.`);
    }

    const dependencies = (module.dependencies ?? []).map((dependency) => {
      const normalized = dependency.trim();
      if (!normalized) {
        throw new Error(`Module "${id}" contains an empty dependency.`);
      }
      return normalized;
    });

    const uniqueDependencies = new Set(dependencies);

    if (uniqueDependencies.size !== dependencies.length) {
      throw new Error(`Module "${id}" contains duplicate dependencies.`);
    }

    if (uniqueDependencies.has(id)) {
      throw new Error(`Module "${id}" cannot depend on itself.`);
    }

    for (const dependency of dependencies) {
      if (!this.modules.has(dependency)) {
        throw new Error(
          `Module "${id}" requires unknown dependency "${dependency}".`
        );
      }
    }

    const frozenDependencies = Object.freeze([...dependencies]);

    const registeredModule: CoreModule = Object.freeze({
      ...module,
      id,
      version,
      dependencies: frozenDependencies
    });

    this.modules.set(id, registeredModule);
    this.dependencies.set(id, frozenDependencies);
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

    const dependents = [...this.dependencies.entries()]
      .filter(([candidateId, required]) =>
        candidateId !== id && required.includes(id)
      )
      .map(([candidateId]) => candidateId);

    if (dependents.length > 0) {
      throw new Error(
        `Cannot unregister "${id}": required by ${dependents.join(", ")}.`
      );
    }

    await module.dispose?.();

    this.modules.delete(id);
    this.dependencies.delete(id);
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

    const currentState = this.states.get(id)!;

    if (currentState === state) return;

    if (!ALLOWED_TRANSITIONS[currentState].includes(state)) {
      throw new Error(
        `Invalid module state transition for "${id}": ${currentState} -> ${state}.`
      );
    }

    this.states.set(id, state);
  }

  list(): readonly ModuleDescriptor[] {
    return Object.freeze(
      [...this.modules.values()].map((module) =>
        Object.freeze({
          id: module.id,
          version: module.version,
          dependencies: this.dependencies.get(module.id) ?? Object.freeze([]),
          state: this.states.get(module.id) ?? "registered"
        })
      )
    );
  }

  get size(): number {
    return this.modules.size;
  }
}


