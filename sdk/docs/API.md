# KB Loader API v1 Reference

The global `kb` object is exposed inside the mod sandbox.

## Logging and notifications

- `kb.log(...values)`
- `kb.notify(message)` requires `notifications`.

## Project information

- `await kb.getProjectInfo()` requires `project.read`.

## Commands

```js
kb.registerCommand(
  { id: "refresh", title: "Refresh" },
  () => kb.notify("Refreshed")
);
```

Requires `commands`.

## Scene

- `await kb.scene.listObjects()` requires `scene.read`.
- `await kb.scene.addPrimitive(options)` requires `scene.write`.
- `await kb.scene.removeObject(id)` requires `scene.write`.
- `await kb.scene.setTransform(id, transform)` requires `scene.write`.

A mod may transform or remove only objects owned by that mod.

Primitive types: `box`, `sphere`, `cylinder`, `cone`.

## Storage

- `await kb.storage.get(key)` requires `storage`.
- `await kb.storage.set(key, value)` requires `storage`.

Storage is namespaced by mod ID. Individual values are limited to 64 KB by the host.

## Permissions

The manifest must request every permission the mod needs. The user is asked to grant missing permissions when enabling the mod.

Available permissions:

- `scene.read`
- `scene.write`
- `project.read`
- `storage`
- `notifications`
- `commands`

## Package format

The SDK generates a JSON package containing:

- `manifest`: mod metadata and permissions.
- `source`: JavaScript source code.

The output format is compatible with KB Mod Manager's `.kbmod.json` importer.