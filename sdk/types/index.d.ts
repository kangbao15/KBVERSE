export type KBPermission =
  | "scene.read"
  | "scene.write"
  | "project.read"
  | "storage"
  | "notifications"
  | "commands";

export interface KBModManifest {
  id: string;
  name: string;
  version: string;
  apiVersion: 1;
  description?: string;
  author?: string;
  minKBVersion?: string;
  dependencies?: string[];
  permissions?: KBPermission[];
}

export interface KBModPackage {
  manifest: KBModManifest;
  source: string;
}

export type PrimitiveType = "box" | "sphere" | "cylinder" | "cone";

export interface KBPrimitiveOptions {
  type: PrimitiveType;
  name?: string;
  color?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number, number];
}

export interface KBSceneObject {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface KBProjectInfo {
  appVersion: string;
  mod: {
    id: string;
    name: string;
    version: string;
  };
}

export interface KBCommandDefinition {
  id: string;
  title: string;
}

export interface KBStorage {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<boolean>;
}

export interface KBScene {
  listObjects(): Promise<KBSceneObject[]>;
  addPrimitive(options: KBPrimitiveOptions): Promise<string>;
  removeObject(id: string): Promise<boolean>;
  setTransform(
    id: string,
    transform: Partial<Pick<KBSceneObject, "position" | "rotation" | "scale">>
  ): Promise<boolean>;
}

export interface KBverseAPI {
  readonly apiVersion: 1;
  log(...values: unknown[]): void;
  notify(message: string): void;
  getProjectInfo(): Promise<KBProjectInfo>;
  registerCommand(
    definition: KBCommandDefinition,
    callback: (args: Record<string, unknown>) => void
  ): void;
  on(name: string, callback: (data: unknown) => void): void;
  off(name: string, callback: (data: unknown) => void): void;
  storage: KBStorage;
  scene: KBScene;
}

declare global {
  const kb: KBverseAPI;
}

export {};