# KB Loader API v1

KB Loader is the unified mod loader and mod API for KBVERSE.

## Package format

A mod package is a JSON file (`.kbmod.json`):

```json
{
  "manifest": {
    "id": "hello-world",
    "name": "Hello World",
    "version": "1.0.0",
    "apiVersion": 1,
    "author": "Your name",
    "description": "Example KBVERSE mod",
    "minKBVersion": "2.0.0",
    "dependencies": [],
    "permissions": [
      "notifications",
      "commands",
      "scene.read",
      "scene.write",
      "project.read",
      "storage"
    ]
  },
  "source": "kb.log('Hello KBVERSE');"
}
```

## Runtime API

Mod code runs in a sandboxed iframe. It receives a `kb` object.

- `kb.apiVersion`
- `kb.log(...values)`
- `kb.notify(message)` requires `notifications`
- `kb.getProjectInfo()` requires `project.read`
- `kb.registerCommand({ id, title }, callback)` requires `commands`
- `kb.on(event, callback)` / `kb.off(event, callback)`
- `kb.storage.get(key)` / `kb.storage.set(key, value)` require `storage`
- `kb.scene.listObjects()` requires `scene.read`
- `kb.scene.addPrimitive(options)` requires `scene.write`
- `kb.scene.removeObject(id)` requires `scene.write`
- `kb.scene.setTransform(id, transform)` requires `scene.write`

A mod can remove or transform only objects it created through KB Loader.
Its own primitive objects are saved in IndexedDB and restored when the mod is enabled.

## Example

```js
kb.log("Hello from KBVERSE!");

kb.registerCommand(
  { id: "hello", title: "Say Hello" },
  () => kb.notify("Hello from my mod!")
);

const objectId = await kb.scene.addPrimitive({
  type: "box",
  name: "My Mod Cube",
  color: "#7c6cff",
  position: [0, 1, 0],
  size: [1, 1, 1]
});

await kb.storage.set("createdObject", objectId);
```

## Permissions

- `scene.read`: inspect scene object transforms and names.
- `scene.write`: create primitives and modify/remove objects owned by that mod.
- `project.read`: read KBVERSE and mod version information.
- `storage`: use namespaced mod storage (64 KB per value).
- `notifications`: show host notifications.
- `commands`: register actions in Mod Manager.

Permissions are requested when a mod is enabled.

## Security model

The mod runs in an iframe with `sandbox="allow-scripts"` and a restrictive Content Security Policy. The mod does not receive the parent document, parent JavaScript objects, or direct IndexedDB access. Host operations are mediated by KB Loader and permission-checked.

This is a baseline sandbox, not a guarantee that every possible malicious browser exploit is prevented. Only install code from sources you trust.
