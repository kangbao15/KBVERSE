import * as THREE from "three";

type Permission =
  | "scene.read"
  | "scene.write"
  | "project.read"
  | "storage"
  | "notifications"
  | "commands";

type Manifest = {
  id: string;
  name: string;
  version: string;
  apiVersion: number;
  description?: string;
  author?: string;
  minKBVersion?: string;
  dependencies?: string[];
  permissions?: Permission[];
};

type StoredMod = {
  manifest: Manifest;
  source: string;
  installedAt: string;
  enabled: boolean;
  grantedPermissions: Permission[];
};

type PrimitiveRecord = {
  id: string;
  type: "box" | "sphere" | "cylinder" | "cone";
  name: string;
  color: string;
  position: number[];
  rotation: number[];
  scale: number[];
};

type Runtime = {
  iframe: HTMLIFrameElement;
  token: string;
  manifest: Manifest;
  permissions: Set<Permission>;
  commands: Map<string, string>;
};

type LoaderOptions = {
  appVersion: string;
  scene: THREE.Scene;
};

const DB_NAME = "KBVERSE_MOD_DATABASE";
const DB_VERSION = 1;
const MODS = "mods";
const DATA = "data";
const API_VERSION = 1;

const allowedPermissions = new Set<Permission>([
  "scene.read",
  "scene.write",
  "project.read",
  "storage",
  "notifications",
  "commands"
]);

let dbPromise: Promise<IDBDatabase> | null = null;
let hostScene: THREE.Scene;
let appVersion = "2.0.0";
let initialized = false;

const runtimes = new Map<string, Runtime>();

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MODS)) {
        db.createObjectStore(MODS, { keyPath: "manifest.id" });
      }
      if (!db.objectStoreNames.contains(DATA)) {
        db.createObjectStore(DATA);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function getValue<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const request = db.transaction(store, "readonly")
      .objectStore(store).get(key);

    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function putValue(store: string, key: IDBValidKey, value: unknown): Promise<void> {
  const db = await openDB();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function deleteValue(store: string, key: IDBValidKey): Promise<void> {
  const db = await openDB();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getMod(id: string): Promise<StoredMod | undefined> {
  return getValue<StoredMod>(MODS, id);
}

async function saveMod(mod: StoredMod): Promise<void> {
  await putValue(MODS, mod.manifest.id, mod);
}

async function listMods(): Promise<StoredMod[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const request = db.transaction(MODS, "readonly")
      .objectStore(MODS).getAll();

    request.onsuccess = () => resolve(request.result as StoredMod[]);
    request.onerror = () => reject(request.error);
  });
}

function compareVersions(a: string, b: string): number {
  const aa = a.split(".").map(Number);
  const bb = b.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const x = aa[i] || 0;
    const y = bb[i] || 0;
    if (x !== y) return x > y ? 1 : -1;
  }

  return 0;
}

function validatePackage(input: any): { manifest: Manifest; source: string } {
  if (!input || typeof input !== "object") {
    throw new Error("Goi mod khong hop le.");
  }

  const m = input.manifest;
  if (!m || typeof m !== "object" || typeof input.source !== "string") {
    throw new Error("Package phai co manifest va source.");
  }

  if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(m.id || "")) {
    throw new Error("Mod ID khong hop le.");
  }

  if (!m.name || typeof m.name !== "string" || m.name.length > 80) {
    throw new Error("Ten mod khong hop le.");
  }

  if (!/^\d+\.\d+\.\d+$/.test(m.version || "")) {
    throw new Error("Version phai theo dang x.y.z.");
  }

  if (m.apiVersion !== API_VERSION) {
    throw new Error("Mod dung KB Loader API khong tuong thich.");
  }

  if (input.source.length > 256000) {
    throw new Error("Source mod vuot qua gioi han 256 KB.");
  }

  const permissions = Array.isArray(m.permissions) ? m.permissions : [];

  for (const permission of permissions) {
    if (!allowedPermissions.has(permission)) {
      throw new Error("Permission khong duoc ho tro: " + permission);
    }
  }

  const dependencies = Array.isArray(m.dependencies) ? m.dependencies : [];

  for (const dependency of dependencies) {
    if (typeof dependency !== "string" ||
        !/^[a-z0-9][a-z0-9._-]{1,63}$/.test(dependency)) {
      throw new Error("Dependency khong hop le.");
    }
  }

  return {
    manifest: {
      id: m.id,
      name: m.name,
      version: m.version,
      apiVersion: m.apiVersion,
      description: String(m.description || ""),
      author: String(m.author || "Unknown"),
      minKBVersion: m.minKBVersion,
      dependencies,
      permissions: [...new Set(permissions)] as Permission[]
    },
    source: input.source
  };
}

function toast(message: string): void {
  const node = document.createElement("div");
  node.textContent = message;
  node.style.cssText =
    "position:fixed;top:20px;right:20px;z-index:100001;" +
    "background:#202438;color:white;padding:12px 17px;" +
    "border:1px solid #7772ff;border-radius:9px;" +
    "font:13px system-ui;max-width:340px;box-shadow:0 5px 22px #0006";

  document.body.appendChild(node);
  window.setTimeout(() => node.remove(), 3500);
}

function validVector(value: unknown, fallback: number[], min: number, max: number): number[] {
  if (!Array.isArray(value) || value.length !== 3) return fallback;

  return value.map((v, i) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max) {
      throw new Error("Gia tri transform khong hop le.");
    }
    return n;
  });
}

function makePrimitive(record: PrimitiveRecord, modId: string): THREE.Mesh {
  let geometry: THREE.BufferGeometry;

  switch (record.type) {
    case "box":
      geometry = new THREE.BoxGeometry(1, 1, 1);
      break;
    case "sphere":
      geometry = new THREE.SphereGeometry(0.5, 20, 14);
      break;
    case "cylinder":
      geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 20);
      break;
    case "cone":
      geometry = new THREE.ConeGeometry(0.5, 1, 20);
      break;
    default:
      throw new Error("Primitive type khong duoc ho tro.");
  }

  const material = new THREE.MeshStandardMaterial({
    color: record.color,
    roughness: 0.8
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = record.name;
  mesh.position.fromArray(record.position);
  mesh.rotation.fromArray([
    record.rotation[0],
    record.rotation[1],
    record.rotation[2],
    "XYZ"
  ] as any);
  mesh.scale.fromArray(record.scale);

  mesh.userData.kbModId = modId;
  mesh.userData.kbObjectId = record.id;
  mesh.userData.kbModObject = true;

  return mesh;
}

async function saveOwnedObjects(modId: string): Promise<void> {
  const objects: PrimitiveRecord[] = [];

  for (const object of hostScene.children) {
    if (object.userData?.kbModId !== modId) continue;

    objects.push({
      id: object.userData.kbObjectId,
      type: object.userData.kbPrimitiveType,
      name: object.name,
      color: object.userData.kbColor || "#7c6cff",
      position: object.position.toArray(),
      rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
      scale: object.scale.toArray()
    });
  }

  await putValue(DATA, "scene:" + modId, objects);
}

async function restoreOwnedObjects(modId: string): Promise<void> {
  const records = await getValue<PrimitiveRecord[]>(DATA, "scene:" + modId);
  if (!Array.isArray(records)) return;

  for (const record of records) {
    const exists = hostScene.children.some(
      object => object.userData?.kbObjectId === record.id
    );

    if (exists) continue;

    const mesh = makePrimitive(record, modId);
    mesh.userData.kbPrimitiveType = record.type;
    mesh.userData.kbColor = record.color;
    hostScene.add(mesh);
  }
}

function createPrimitive(modId: string, input: any): string {
  if (!input || !["box", "sphere", "cylinder", "cone"].includes(input.type)) {
    throw new Error("Primitive type khong hop le.");
  }

  const color = /^#[0-9a-fA-F]{6}$/.test(input.color || "")
    ? input.color
    : "#7c6cff";

  const scale = validVector(input.size, [1, 1, 1], 0.1, 100);
  const position = validVector(input.position, [0, 0.5, 0], -10000, 10000);
  const rotation = validVector(input.rotation, [0, 0, 0], -10000, 10000);

  const record: PrimitiveRecord = {
    id: crypto.randomUUID(),
    type: input.type,
    name: String(input.name || input.type).slice(0, 80),
    color,
    position,
    rotation,
    scale
  };

  const mesh = makePrimitive(record, modId);
  mesh.userData.kbPrimitiveType = record.type;
  mesh.userData.kbColor = record.color;

  hostScene.add(mesh);
  void saveOwnedObjects(modId);

  return record.id;
}

function removeOwnPrimitive(modId: string, objectId: string): boolean {
  const object = hostScene.children.find(
    item => item.userData?.kbModId === modId &&
            item.userData?.kbObjectId === objectId
  );

  if (!object) return false;

  hostScene.remove(object);

  if (object instanceof THREE.Mesh) {
    object.geometry.dispose();

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    for (const material of materials) material.dispose();
  }

  void saveOwnedObjects(modId);
  return true;
}

async function setOwnTransform(modId: string, objectId: string, transform: any): Promise<boolean> {
  const object = hostScene.children.find(
    item => item.userData?.kbModId === modId &&
            item.userData?.kbObjectId === objectId
  );

  if (!object) return false;

  if (transform.position) {
    object.position.fromArray(
      validVector(transform.position, [0, 0, 0], -10000, 10000)
    );
  }

  if (transform.rotation) {
    const v = validVector(transform.rotation, [0, 0, 0], -10000, 10000);
    object.rotation.set(v[0], v[1], v[2]);
  }

  if (transform.scale) {
    object.scale.fromArray(
      validVector(transform.scale, [1, 1, 1], 0.05, 100)
    );
  }

  await saveOwnedObjects(modId);
  return true;
}

function disposeRuntime(modId: string): void {
  const runtime = runtimes.get(modId);
  if (!runtime) return;

  runtime.iframe.remove();
  runtimes.delete(modId);

  for (const object of [...hostScene.children]) {
    if (object.userData?.kbModId !== modId) continue;
    hostScene.remove(object);

    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of materials) material.dispose();
    }
  }
}

function createRuntime(mod: StoredMod): void {
  const id = mod.manifest.id;
  if (runtimes.has(id)) return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.title = "KB Mod: " + mod.manifest.name;
  iframe.style.cssText = "display:none;width:0;height:0;border:0";

  const token = crypto.randomUUID();

  const runtime: Runtime = {
    iframe,
    token,
    manifest: mod.manifest,
    permissions: new Set(mod.grantedPermissions),
    commands: new Map()
  };

  runtimes.set(id, runtime);

  const safeSource = mod.source.replace(/<\/script/gi, "<\\/script");

  iframe.srcdoc = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
</head>
<body>
<script>
(() => {
  "use strict";
  const token = ${JSON.stringify(token)};
  let sequence = 0;
  const pending = new Map();
  const handlers = new Map();
  const listeners = new Map();

  const send = (type, payload = {}) => {
    parent.postMessage({ __kbloader: 1, token, type, payload }, "*");
  };

  const request = (action, data = {}) => new Promise((resolve, reject) => {
    const requestId = ++sequence;
    pending.set(requestId, { resolve, reject });
    send("request", { requestId, action, data });

    setTimeout(() => {
      if (!pending.has(requestId)) return;
      pending.delete(requestId);
      reject(new Error("KB Loader request timeout"));
    }, 12000);
  });

  window.addEventListener("message", event => {
    if (event.source !== parent) return;
    const message = event.data;
    if (!message || message.__kbloader !== 1 || message.token !== token) return;

    if (message.type === "response") {
      const item = pending.get(message.payload.requestId);
      if (!item) return;
      pending.delete(message.payload.requestId);
      message.payload.ok
        ? item.resolve(message.payload.value)
        : item.reject(new Error(message.payload.error || "KB Loader error"));
    }

    if (message.type === "command-run") {
      const callback = handlers.get(message.payload.id);
      if (callback) {
        try { callback(message.payload.args || {}); }
        catch (error) { send("error", { message: String(error) }); }
      }
    }

    if (message.type === "event") {
      const callbacks = listeners.get(message.payload.name) || [];
      for (const callback of callbacks) {
        try { callback(message.payload.data); }
        catch (error) { send("error", { message: String(error) }); }
      }
    }
  });

  const kb = {
    apiVersion: 1,
    log: (...args) => send("log", { args: args.map(x => String(x).slice(0, 500)) }),
    notify: message => send("notify", { message: String(message).slice(0, 300) }),
    getProjectInfo: () => request("project.read"),
    registerCommand: (definition, callback) => {
      if (!definition || typeof definition.id !== "string" ||
          typeof definition.title !== "string" || typeof callback !== "function") {
        throw new Error("Invalid command registration");
      }
      handlers.set(definition.id, callback);
      send("command-register", {
        id: definition.id,
        title: definition.title.slice(0, 60)
      });
    },
    on: (name, callback) => {
      if (typeof callback !== "function") return;
      const list = listeners.get(name) || [];
      list.push(callback);
      listeners.set(name, list);
    },
    off: (name, callback) => {
      listeners.set(name, (listeners.get(name) || []).filter(fn => fn !== callback));
    },
    storage: {
      get: key => request("storage.get", { key }),
      set: (key, value) => request("storage.set", { key, value })
    },
    scene: {
      listObjects: () => request("scene.listObjects"),
      addPrimitive: options => request("scene.addPrimitive", options),
      removeObject: id => request("scene.removeObject", { id }),
      setTransform: (id, transform) =>
        request("scene.setTransform", { id, transform })
    }
  };

  Object.freeze(kb);
  window.kb = kb;

  try {
${safeSource}
  } catch (error) {
    send("error", { message: String(error) });
  }

  send("ready", {});
})();
</script>
</body>
</html>`;

  document.body.appendChild(iframe);
}

function hasPermission(runtime: Runtime, permission: Permission): boolean {
  return runtime.permissions.has(permission);
}

function reply(runtime: Runtime, requestId: number, value?: unknown, error?: string): void {
  runtime.iframe.contentWindow?.postMessage({
    __kbloader: 1,
    token: runtime.token,
    type: "response",
    payload: {
      requestId,
      ok: !error,
      value,
      error
    }
  }, "*");
}

async function handleRequest(runtime: Runtime, data: any): Promise<void> {
  const id = runtime.manifest.id;
  const requestId = Number(data.requestId);

  try {
    let result: unknown;

    switch (data.action) {
      case "project.read":
        if (!hasPermission(runtime, "project.read")) throw new Error("Missing project.read permission");
        result = {
          appVersion,
          mod: {
            id,
            name: runtime.manifest.name,
            version: runtime.manifest.version
          }
        };
        break;

      case "storage.get": {
        if (!hasPermission(runtime, "storage")) throw new Error("Missing storage permission");
        const key = String(data.data?.key || "");
        if (!key || key.length > 100) throw new Error("Storage key invalid");
        result = await getValue(DATA, "storage:" + id + ":" + key) ?? null;
        break;
      }

      case "storage.set": {
        if (!hasPermission(runtime, "storage")) throw new Error("Missing storage permission");
        const key = String(data.data?.key || "");
        if (!key || key.length > 100) throw new Error("Storage key invalid");

        const value = data.data?.value ?? null;
        const serialized = JSON.stringify(value);
        if (serialized.length > 64000) throw new Error("Storage value exceeds 64 KB");

        await putValue(DATA, "storage:" + id + ":" + key, value);
        result = true;
        break;
      }

      case "scene.listObjects": {
        if (!hasPermission(runtime, "scene.read")) throw new Error("Missing scene.read permission");

        result = hostScene.children.map(object => {
          if (!object.userData.kbObjectId) {
            object.userData.kbObjectId = crypto.randomUUID();
          }
          return {
            id: object.userData.kbObjectId,
            name: object.name,
            position: object.position.toArray(),
            rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
            scale: object.scale.toArray()
          };
        });
        break;
      }

      case "scene.addPrimitive":
        if (!hasPermission(runtime, "scene.write")) throw new Error("Missing scene.write permission");
        result = createPrimitive(id, data.data);
        break;

      case "scene.removeObject":
        if (!hasPermission(runtime, "scene.write")) throw new Error("Missing scene.write permission");
        result = removeOwnPrimitive(id, String(data.data?.id || ""));
        break;

      case "scene.setTransform":
        if (!hasPermission(runtime, "scene.write")) throw new Error("Missing scene.write permission");
        result = await setOwnTransform(
          id,
          String(data.data?.id || ""),
          data.data?.transform || {}
        );
        break;

      default:
        throw new Error("Unknown KB Loader API action");
    }

    reply(runtime, requestId, result);
  } catch (error) {
    reply(runtime, requestId, undefined, String(error));
  }
}

window.addEventListener("message", event => {
  const data = event.data;
  if (!data || data.__kbloader !== 1) return;

  const runtime = [...runtimes.values()].find(
    item => item.iframe.contentWindow === event.source &&
            item.token === data.token
  );

  if (!runtime) return;

  if (data.type === "ready") {
    console.info("[KB Loader] Started:", runtime.manifest.id);
    return;
  }

  if (data.type === "log") {
    console.info("[KB Mod:" + runtime.manifest.id + "]", ...(data.payload.args || []));
    return;
  }

  if (data.type === "error") {
    console.error("[KB Mod:" + runtime.manifest.id + "]", data.payload.message);
    toast("Mod error: " + runtime.manifest.name);
    return;
  }

  if (data.type === "notify") {
    if (hasPermission(runtime, "notifications")) {
      toast(runtime.manifest.name + ": " + String(data.payload.message));
    }
    return;
  }

  if (data.type === "command-register") {
    if (!hasPermission(runtime, "commands")) return;

    const commandId = String(data.payload.id || "");
    const title = String(data.payload.title || "");

    if (!/^[a-z0-9._-]{1,48}$/i.test(commandId) || !title) return;
    runtime.commands.set(commandId, title);
    void refreshManager();
    return;
  }

  if (data.type === "request") {
    void handleRequest(runtime, data.payload);
  }
});

async function installPackage(input: unknown): Promise<void> {
  const validated = validatePackage(input);
  const existing = await getMod(validated.manifest.id);

  if (existing && !confirm("Mod da ton tai. Thay the ban hien tai?")) return;

  if (existing) disposeRuntime(existing.manifest.id);

  const mod: StoredMod = {
    ...validated,
    installedAt: new Date().toISOString(),
    enabled: false,
    grantedPermissions: []
  };

  await saveMod(mod);
  toast("Da cai dat mod: " + mod.manifest.name);
  await refreshManager();
}

async function enableMod(id: string, chain: string[] = []): Promise<boolean> {
  if (chain.includes(id)) throw new Error("Dependency cycle: " + id);

  const mod = await getMod(id);
  if (!mod) throw new Error("Khong tim thay mod: " + id);

  if (runtimes.has(id)) return true;

  if (mod.manifest.minKBVersion &&
      compareVersions(appVersion, mod.manifest.minKBVersion) < 0) {
    throw new Error("Mod can KBVERSE " + mod.manifest.minKBVersion + " tro len.");
  }

  for (const dependency of mod.manifest.dependencies || []) {
    const dependencyMod = await getMod(dependency);
    if (!dependencyMod) throw new Error("Thieu dependency: " + dependency);

    await enableMod(dependency, [...chain, id]);
  }

  const requested = mod.manifest.permissions || [];
  const missing = requested.filter(permission =>
    !mod.grantedPermissions.includes(permission)
  );

  if (missing.length) {
    const approved = confirm(
      "Mod '" + mod.manifest.name + "' yeu cau quyen:\n\n" +
      missing.join("\n") +
      "\n\nChi cap quyen neu ban tin tuong mod nay."
    );

    if (!approved) return false;

    mod.grantedPermissions = [...new Set([
      ...mod.grantedPermissions,
      ...missing
    ])];
  }

  await restoreOwnedObjects(id);
  createRuntime(mod);

  mod.enabled = true;
  await saveMod(mod);
  await refreshManager();

  return true;
}

async function disableMod(id: string): Promise<void> {
  const mod = await getMod(id);
  if (!mod) return;

  disposeRuntime(id);
  mod.enabled = false;
  await saveMod(mod);
  await refreshManager();
}

async function uninstallMod(id: string): Promise<void> {
  const mod = await getMod(id);
  if (!mod) return;

  if (!confirm("Gỡ mod '" + mod.manifest.name + "'?")) return;

  disposeRuntime(id);
  await deleteValue(MODS, id);
  await deleteValue(DATA, "scene:" + id);

  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DATA, "readwrite");
    const store = tx.objectStore(DATA);
    const request = store.openCursor();

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;

      if (String(cursor.key).startsWith("storage:" + id + ":")) {
        cursor.delete();
      }
      cursor.continue();
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  toast("Da go mod.");
  await refreshManager();
}

function exportMod(mod: StoredMod): void {
  const blob = new Blob([JSON.stringify({
    manifest: mod.manifest,
    source: mod.source
  }, null, 2)], { type: "application/json" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = mod.manifest.id + ".kbmod.json";
  link.click();
  URL.revokeObjectURL(url);
}

let manager: HTMLDivElement | null = null;
let managerList: HTMLDivElement | null = null;

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = ""
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

async function refreshManager(): Promise<void> {
  if (!managerList) return;

  managerList.replaceChildren();

  const mods = await listMods();

  if (!mods.length) {
    managerList.appendChild(element("p", "Chua co mod nao. Import file .kbmod.json de bat dau."));
    return;
  }

  for (const mod of mods) {
    const card = element("div");
    card.style.cssText =
      "padding:12px;margin:9px 0;border:1px solid #45465d;" +
      "border-radius:9px;background:#ffffff08";

    const title = element("strong", mod.manifest.name + "  v" + mod.manifest.version);
    const description = element("p", mod.manifest.description || "Khong co mo ta.");
    description.style.cssText = "font-size:12px;color:#bbb";

    const status = element(
      "div",
      runtimes.has(mod.manifest.id) ? "● Running" : "○ Disabled"
    );
    status.style.cssText = "font-size:11px;color:#aaa;margin:5px 0";

    const actions = element("div");
    actions.style.cssText = "display:flex;gap:6px;flex-wrap:wrap";

    const button = (label: string, action: () => void) => {
      const b = element("button", label);
      b.type = "button";
      b.style.cssText =
        "padding:6px 10px;border:1px solid #666;border-radius:6px;" +
        "background:#292b40;color:white;cursor:pointer";
      b.addEventListener("click", action);
      actions.appendChild(b);
    };

    if (runtimes.has(mod.manifest.id)) {
      button("Disable", () => void disableMod(mod.manifest.id));
    } else {
      button("Enable", () => {
        void enableMod(mod.manifest.id).catch(error => {
          toast(String(error));
          console.error(error);
        });
      });
    }

    button("Export", () => exportMod(mod));
    button("Uninstall", () => void uninstallMod(mod.manifest.id));

    for (const [commandId, titleText] of runtimes.get(mod.manifest.id)?.commands || []) {
      button(titleText, () => {
        const runtime = runtimes.get(mod.manifest.id);
        runtime?.iframe.contentWindow?.postMessage({
          __kbloader: 1,
          token: runtime.token,
          type: "command-run",
          payload: { id: commandId, args: {} }
        }, "*");
      });
    }

    card.append(title, description, status, actions);
    managerList.appendChild(card);
  }
}

function openManager(): void {
  if (!manager) return;
  manager.style.display = "block";
  void refreshManager();
}

function createManager(): void {
  const launcher = element("button", "KB MODS");
  launcher.type = "button";
  launcher.style.cssText =
    "position:fixed;left:18px;bottom:18px;z-index:99990;" +
    "padding:10px 15px;border:1px solid #7772ff;border-radius:9px;" +
    "background:#191b2c;color:white;font:700 12px system-ui;cursor:pointer";
  launcher.addEventListener("click", openManager);
  document.body.appendChild(launcher);

  manager = element("div");
  manager.style.cssText =
    "display:none;position:fixed;right:18px;top:70px;z-index:99991;" +
    "width:min(430px,calc(100vw - 36px));max-height:75vh;overflow:auto;" +
    "padding:17px;background:#171927;color:white;border:1px solid #555;" +
    "border-radius:12px;box-shadow:0 8px 35px #0009;font:13px system-ui";

  const header = element("div");
  header.style.cssText = "display:flex;justify-content:space-between;align-items:center";

  const heading = element("strong", "KBVERSE MOD MANAGER");
  heading.style.cssText = "letter-spacing:1px";

  const close = element("button", "✕");
  close.type = "button";
  close.style.cssText =
    "background:transparent;color:white;border:0;cursor:pointer;font-size:17px";
  close.addEventListener("click", () => {
    if (manager) manager.style.display = "none";
  });

  header.append(heading, close);

  const install = element("button", "+ Import Mod Package");
  install.type = "button";
  install.style.cssText =
    "margin:12px 0;padding:9px 12px;background:#6254d9;color:white;" +
    "border:0;border-radius:7px;cursor:pointer";

  const fileInput = element("input");
  fileInput.type = "file";
  fileInput.accept = ".json,.kbmod.json,application/json";
  fileInput.style.display = "none";

  install.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      await installPackage(parsed);
    } catch (error) {
      toast("Import failed: " + String(error));
    }

    fileInput.value = "";
  });

  managerList = element("div");

  manager.append(header, install, fileInput, managerList);
  document.body.appendChild(manager);
}

export async function initKBLoader(options: LoaderOptions): Promise<void> {
  if (initialized) return;

  if (!options || !options.scene) {
    throw new Error("KB Loader requires a THREE.Scene host.");
  }

  initialized = true;
  hostScene = options.scene;
  appVersion = options.appVersion || "2.0.0";

  if (!document.body) {
    await new Promise<void>(resolve => {
      document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
    });
  }

  createManager();

  const installed = await listMods();

  for (const mod of installed) {
    if (!mod.enabled) continue;

    try {
      await enableMod(mod.manifest.id);
    } catch (error) {
      console.error("[KB Loader] Cannot restore mod:", mod.manifest.id, error);
      toast("Could not load mod: " + mod.manifest.name);
    }
  }

  console.info("[KB Loader] API v1 ready. Installed:", installed.length);
}

(window as any).KBLoader = {
  apiVersion: API_VERSION,
  install: installPackage,
  enable: enableMod,
  disable: disableMod,
  uninstall: uninstallMod,
  list: listMods,
  openManager,
  getMod,
  export: async (id: string) => {
    const mod = await getMod(id);
    if (!mod) throw new Error("Mod not found: " + id);
    exportMod(mod);
  }
};
