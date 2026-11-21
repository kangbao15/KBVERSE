# KBVERSE SDK

**Official SDK and CLI for KBVERSE Mod Developers**

KBVERSE SDK is the official toolkit for creating, validating, and packaging mods for KBVERSE Editor.

It provides an independent command-line interface, project templates, manifest validation, TypeScript declarations, and package generation.

You do **not** need to clone or download the KBVERSE Editor source code to develop mods.

---

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Manifest](#manifest)
- [Permissions](#permissions)
- [KB Loader API](#kb-loader-api)
- [Example Mod](#example-mod)
- [CLI Reference](#cli-reference)
- [Building and Packaging](#building-and-packaging)
- [Installing a Mod in KBVERSE](#installing-a-mod-in-kbverse)
- [TypeScript Support](#typescript-support)
- [Developing Without the KBVERSE Repository](#developing-without-the-kbverse-repository)
- [Publishing the SDK](#publishing-the-sdk)
- [Security](#security)
- [Current Limitations](#current-limitations)
- [License](#license)

---

## Features

- Independent developer SDK.
- Command-line interface (`kb`).
- Automatic mod project generation.
- Manifest validation.
- JavaScript source validation.
- `.kbmod.json` package generation.
- TypeScript API declarations.
- JSON Schema for manifests.
- Starter template and example project.
- Compatible with KB Loader API v1.

## Requirements

- Node.js 18 or newer.
- npm.
- A code editor such as Visual Studio Code.
- KBVERSE Editor to install and test your finished mod.

You do not need Three.js or the KBVERSE source repository to use the SDK.

## Installation

### Option 1: Install from npm (recommended)

After the SDK has been published to the npm registry:

```bash
npm install --save-dev @kbverse/sdk
```

The package includes the `kb` command-line tool.

Verify the installation:

```bash
npx kb help
```

You can now create and build mods from your own project directory.

### Option 2: Install globally

```bash
npm install --global @kbverse/sdk
```

Run the CLI:

```bash
kb help
```

Global installation allows you to use `kb` from different directories.

### Option 3: Install from a local SDK package

If you have downloaded an SDK release archive:

```bash
npm install --save-dev ./path/to/kbverse-sdk
```

Then run:

```bash
npx kb help
```

This method does not require the KBVERSE Editor repository either.

> **Availability:** npm installation requires an actual published SDK release. Until then, use a downloaded SDK package or local development copy.

---

## Quick Start

Create your first mod:

```bash
npx kb create my-first-mod
```

Move into the project:

```bash
cd my-first-mod
```

Validate the project:

```bash
npx kb validate .
```

Build the mod:

```bash
npx kb build .
```

Your output package will be generated inside:

```text
dist/my-first-mod.kbmod.json
```

You can import this file into KBVERSE Editor.

---

## Project Structure

A generated mod project has the following structure:

```text
my-first-mod/
├── kbverse.json
├── README.md
├── src/
│   └── index.js
└── dist/
    └── my-first-mod.kbmod.json
```

| File | Description |
|---|---|
| `kbverse.json` | Mod manifest and configuration |
| `src/index.js` | Main JavaScript source |
| `README.md` | Mod documentation |
| `dist/` | Generated mod packages |

The SDK uses `kbverse.json` as the project manifest and `src/index.js` as the entry point.

---

## Manifest

Every mod requires a `kbverse.json` file.

Example:

```json
{
  "id": "my-first-mod",
  "name": "My First Mod",
  "version": "1.0.0",
  "apiVersion": 1,
  "description": "My first KBVERSE mod.",
  "author": "Developer",
  "minKBVersion": "2.0.0",
  "dependencies": [],
  "permissions": [
    "scene.read",
    "scene.write",
    "notifications",
    "storage"
  ]
}
```

### Manifest fields

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Unique mod identifier |
| `name` | Yes | Display name |
| `version` | Yes | Semantic version |
| `apiVersion` | Yes | Target KB Loader API version |
| `description` | No | Mod description |
| `author` | No | Developer name |
| `minKBVersion` | No | Minimum compatible KBVERSE version |
| `dependencies` | No | Required mod IDs |
| `permissions` | No | Requested API permissions |

### ID rules

Mod IDs must:

- Contain lowercase letters, numbers, dots, underscores, or hyphens.
- Start with a lowercase letter or number.
- Contain between 2 and 64 characters.
- Be unique within the installation.

### Version format

Use semantic versioning:

```text
MAJOR.MINOR.PATCH
```

Example:

```text
1.0.0
1.1.0
2.0.0
```

---

## Permissions

Mods must request permissions through their manifest.

| Permission | Purpose |
|---|---|
| `scene.read` | Read scene objects |
| `scene.write` | Create and modify objects owned by the mod |
| `project.read` | Read project and mod information |
| `storage` | Save and retrieve persistent mod data |
| `notifications` | Display notifications |
| `commands` | Register mod commands |

Example:

```json
{
  "permissions": [
    "scene.read",
    "scene.write",
    "storage"
  ]
}
```

KBVERSE asks users to grant requested permissions when enabling a mod.

Only request permissions that your mod actually needs.

---

## KB Loader API

KBVERSE exposes a global `kb` object inside the mod sandbox.

The SDK provides TypeScript declarations for this API.

### Logging

```js
kb.log("Hello from my mod!");
```

### Notifications

Requires `notifications`.

```js
kb.notify("My mod is running!");
```

### Project information

Requires `project.read`.

```js
const info = await kb.getProjectInfo();

kb.log("KBVERSE version:", info.appVersion);
kb.log("Mod:", info.mod.name);
```

### Scene

Requires `scene.read` to list objects.

```js
const objects = await kb.scene.listObjects();

for (const object of objects) {
  kb.log(object.name, object.position);
}
```

### Creating primitives

Requires `scene.write`.

Supported primitive types:

- `box`
- `sphere`
- `cylinder`
- `cone`

Example:

```js
const objectId = await kb.scene.addPrimitive({
  type: "box",
  name: "My Box",
  color: "#7c6cff",
  position: [0, 0.5, 0],
  rotation: [0, 0, 0],
  size: [1, 1, 1]
});
```

### Removing objects

Requires `scene.write`.

```js
const removed = await kb.scene.removeObject(objectId);
```

A mod can remove only objects owned by that mod.

### Transforming objects

Requires `scene.write`.

```js
await kb.scene.setTransform(objectId, {
  position: [2, 1, 0],
  rotation: [0, 0.5, 0],
  scale: [2, 2, 2]
});
```

A mod can transform only objects owned by that mod.

### Storage

Requires `storage`.

Save data:

```js
await kb.storage.set("score", 100);
```

Retrieve data:

```js
const score = await kb.storage.get("score");

kb.log("Saved score:", score);
```

Storage is isolated by mod ID.

Each stored value is limited to 64 KB by the host.

### Commands

Requires `commands`.

```js
kb.registerCommand(
  {
    id: "hello",
    title: "Say Hello"
  },
  () => {
    kb.notify("Hello!");
  }
);
```

### Events

The SDK declares `kb.on()` and `kb.off()` for event listeners.

```js
function handleEvent(data) {
  kb.log("Event received:", data);
}

kb.on("example", handleEvent);

// Remove the listener when no longer needed.
kb.off("example", handleEvent);
```

Event listeners are available in the runtime bridge. Actual event delivery depends on host-side event emission.

---

## Example Mod

A simple mod that creates a colored box:

```js
kb.log("My First Mod started!");

kb.notify("Welcome to My First Mod!");

const box = await kb.scene.addPrimitive({
  type: "box",
  name: "Hello KBVERSE",
  color: "#00aaff",
  position: [0, 1, 0],
  size: [1, 1, 1]
});

kb.log("Created object:", box);
```

Example manifest:

```json
{
  "id": "hello-world",
  "name": "Hello World",
  "version": "1.0.0",
  "apiVersion": 1,
  "permissions": [
    "scene.write",
    "notifications"
  ]
}
```

---

## CLI Reference

The SDK provides the `kb` command.

### Help

```bash
npx kb help
```

Displays available commands.

### Create

```bash
npx kb create <folder>
```

Generates a new mod project.

Example:

```bash
npx kb create my-mod
```

### Validate

```bash
npx kb validate <folder>
```

Validates:

- Manifest structure.
- Mod ID.
- Name and version.
- API version.
- Permissions.
- Dependencies.
- Source file presence.
- Source file size.
- Potentially unsafe dynamic code patterns.

### Build

```bash
npx kb build <folder>
```

Validates the project and generates a `.kbmod.json` package.

### Pack

```bash
npx kb pack <folder>
```

An alias for `build`.

---

## Building and Packaging

To package your mod:

```bash
npx kb build .
```

The SDK generates:

```text
dist/
└── my-first-mod.kbmod.json
```

The package contains:

```json
{
  "manifest": {
    "id": "my-first-mod",
    "name": "My First Mod",
    "version": "1.0.0",
    "apiVersion": 1
  },
  "source": "..."
}
```

The generated package is compatible with KBVERSE Editor's mod package importer.

---

## Installing a Mod in KBVERSE

1. Build your mod using the SDK.
2. Open KBVERSE Editor.
3. Open the KB MODS manager.
4. Select the option to import a mod package.
5. Choose your generated `.kbmod.json` file.
6. Review the requested permissions.
7. Enable the mod.

Your mod is now available in KBVERSE Editor.

---

## TypeScript Support

The SDK includes TypeScript declarations in:

```text
types/index.d.ts
```

Install the SDK as a development dependency:

```bash
npm install --save-dev @kbverse/sdk
```

Reference the declarations in your TypeScript project:

```ts
/// <reference types="@kbverse/sdk" />

const objectId = await kb.scene.addPrimitive({
  type: "sphere",
  name: "My Sphere",
  color: "#ff8800"
});
```

The `kb` global is typed as `KBverseAPI`.

Available exported types include:

- `KBPermission`
- `KBModManifest`
- `KBModPackage`
- `PrimitiveType`
- `KBPrimitiveOptions`
- `KBSceneObject`
- `KBProjectInfo`
- `KBCommandDefinition`
- `KBStorage`
- `KBScene`
- `KBverseAPI`

The SDK currently provides type declarations rather than a separate runtime implementation of the KB Loader API.

---

## Developing Without the KBVERSE Repository

The SDK is designed to work independently.

A third-party developer only needs:

- Node.js.
- npm.
- The published or downloaded KBVERSE SDK.
- A code editor.

Example workflow:

```bash
mkdir my-mod-project
cd my-mod-project

npm init -y
npm install --save-dev @kbverse/sdk

npx kb create .
```

After project generation:

```bash
npx kb validate .
npx kb build .
```

The developer does not need:

- The KBVERSE Editor source code.
- The KBVERSE Git repository.
- The Editor's internal TypeScript files.
- A local copy of the KBVERSE Loader implementation.

The SDK is the standalone development toolkit. KBVERSE Editor is only needed when testing or installing the finished mod.

---

## Publishing the SDK

The official package name is:

```text
@kbverse/sdk
```

To publish a new SDK release:

1. Update the version in `package.json`.
2. Verify the package contents.
3. Run the SDK tests.
4. Publish to npm.

Example:

```bash
npm test
npm pack --dry-run
npm publish --access public
```

For scoped npm packages, public access must be enabled when publishing the first public release.

After publication, developers can install the SDK using:

```bash
npm install --save-dev @kbverse/sdk
```

The package version should follow semantic versioning.

---

## Security

KBVERSE mods execute inside a sandboxed iframe.

The host applies permission checks and limits access to supported APIs.

The SDK performs basic validation, but validation does not guarantee that a mod is safe.

Important notes:

- Do not install mods from untrusted developers.
- Review mod source code before installation.
- Request only necessary permissions.
- Do not store secrets in mod storage.
- The SDK's validation is not a complete security audit.

The KBVERSE Editor remains responsible for runtime isolation and permission enforcement.

---

## Current Limitations

KB Loader API v1 currently supports:

- Basic scene object inspection.
- Box, sphere, cylinder, and cone primitives.
- Object transforms.
- Mod-owned object removal.
- Persistent mod storage.
- Project information.
- Notifications.
- Command registration.

The current API does not yet provide a complete advanced graphics API.

Features such as custom PBR material controls, advanced lighting, atmosphere, fog, and advanced rendering effects may require future API versions.

The SDK version and KB Loader API version are separate version identifiers.

---

## License

MIT License.

Copyright (c) KBVERSE.

See the `LICENSE` file for details.
