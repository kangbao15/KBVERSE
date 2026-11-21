# KBVERSE

**A modding platform with a 3D world editor and an independent modding SDK.**

KBVERSE is a moddable 3D creation platform designed to let users build, edit, extend, and customize virtual worlds through mods.

The project includes a web-based Editor, a World Editor, the KB Loader runtime, and an independent SDK and CLI for third-party mod developers.

## Overview

KBVERSE aims to provide an open modding ecosystem where developers can create and distribute their own mods without needing to own or clone the KBVERSE Editor source code.

The platform is designed around two main sides:

- **Creators:** Use the KBVERSE Editor and World Editor to work with projects and their 3D scenes.
- **Mod developers:** Use the standalone KBVERSE SDK to create, validate, build, and package mods independently.

## Core Components

| Component | Description |
|---|---|
| KBVERSE Editor | The main application for working with KBVERSE projects. |
| World Editor | The environment for editing and working with 3D scenes. |
| KB Loader | Loads mods and provides their runtime API. |
| KBVERSE SDK | Independent development toolkit for creating KBVERSE mods. |
| KB CLI | Command-line interface for creating, validating, building, and packaging mods. |

## Modding System

KBVERSE includes a modding system that allows mods to interact with supported parts of the application through the KB Loader API.

Current API capabilities include:

- Logging
- Notifications
- Project information
- Scene object listing
- Primitive creation
- Object removal
- Object transformation
- Mod storage
- Command registration

### Permissions

Mods declare the permissions they need in their manifest.

Available permissions:

- `scene.read`
- `scene.write`
- `project.read`
- `storage`
- `notifications`
- `commands`

The loader checks permissions and restricts scene modifications to objects owned by the requesting mod.

## KBVERSE SDK

The KBVERSE SDK is a standalone toolkit for third-party mod developers.

It is designed to work independently from the KBVERSE Editor repository.

Developers can use the SDK to:

- Create a new mod project.
- Validate mod manifests and source files.
- Build mod packages.
- Package mods for distribution.
- Access TypeScript definitions for the KBVERSE API.

**SDK documentation:** [`sdk/README.md`](sdk/README.md)

### Basic CLI Usage

```bash
kb create my-first-mod
cd my-first-mod

kb validate .
kb build .
kb pack .
```

The CLI is distributed as part of the `@kbverse/sdk` package.

> The npm installation instructions and package availability are documented in the SDK README.

## Project Structure

```text
KBVERSE/
├── apps/
│   └── web/
│       └── src/
│           ├── main.ts
│           └── kb-loader.ts
│
├── sdk/
│   ├── bin/
│   │   └── kb.js
│   ├── types/
│   │   └── index.d.ts
│   ├── schemas/
│   │   └── manifest.schema.json
│   ├── templates/
│   │   └── basic/
│   ├── examples/
│   │   └── hello-world/
│   ├── docs/
│   │   └── API.md
│   ├── package.json
│   └── README.md
│
└── README.md
```

## Development

### Requirements

- Node.js 18 or newer
- npm
- A compatible desktop or web browser

### Editor Development

The web application is located in:

```text
apps/web
```

Install dependencies and run the development scripts defined in that application's `package.json`.

```bash
cd apps/web
npm install
npm run dev
```

For available scripts, check the application's `package.json`.

### SDK Development

The SDK is located in:

```text
sdk
```

Run its tests:

```bash
cd sdk
npm test
```

Package inspection:

```bash
npm pack --dry-run
```

## Security

KBVERSE uses a sandboxed iframe for mod execution.

The current loader applies a restrictive Content Security Policy and uses a message-based API bridge between mods and the host application.

Mods do not receive unrestricted access to the host application's JavaScript environment through the documented API.

## Project Goals

KBVERSE is being developed toward an extensible modding ecosystem.

Long-term goals include:

- Making mod development accessible to third-party developers.
- Keeping the SDK independent from the Editor source code.
- Providing a consistent API for mods.
- Supporting a growing collection of mod capabilities.
- Building an ecosystem where creators can share and distribute their work.

## Documentation

| Document | Description |
|---|---|
| [`sdk/README.md`](sdk/README.md) | SDK installation and mod development guide |
| [`sdk/docs/API.md`](sdk/docs/API.md) | KBVERSE Mod API reference |

## Contributing

Contributions, bug reports, and suggestions are welcome.

When contributing, please keep the separation between the Editor, Loader, and independent SDK in mind.

## License

See the repository's license information for the applicable terms.
