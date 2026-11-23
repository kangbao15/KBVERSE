export type ModuleState =
  | "registered"
  | "initializing"
  | "initialized"
  | "starting"
  | "running"
  | "stopping"
  | "stopped"
  | "failed";

export interface ModuleContext {
  readonly core: CoreContext;
  readonly signal: AbortSignal;
}

export interface CoreModule {
  readonly id: string;
  readonly version: string;
  readonly dependencies?: readonly string[];

  initialize?(context: ModuleContext): Promise<void> | void;
  start?(context: ModuleContext): Promise<void> | void;
  stop?(context: ModuleContext): Promise<void> | void;
  dispose?(): Promise<void> | void;
}

export interface ModuleDescriptor {
  readonly id: string;
  readonly version: string;
  readonly dependencies: readonly string[];
  readonly state: ModuleState;
}

export interface EventPayload {
  readonly type: string;
  readonly timestamp: number;
  readonly data?: unknown;
}

export type EventListener<T = unknown> = (data: T) => void;

export interface EventBus {
  on<T = unknown>(event: string, listener: EventListener<T>): () => void;
  once<T = unknown>(event: string, listener: EventListener<T>): () => void;
  emit<T = unknown>(event: string, data?: T): void;
  off(event: string, listener: EventListener): void;
  clear(event?: string): void;
}

export interface CoreContext {
  readonly events: EventBus;
  readonly modules: ModuleRegistry;
}

export interface ModuleRegistry {
  register(module: CoreModule): void;
  unregister(id: string): Promise<void>;
  get(id: string): CoreModule | undefined;
  getState(id: string): ModuleState | undefined;
  list(): readonly ModuleDescriptor[];
}
