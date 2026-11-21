# KBVERSE SDK

Official developer toolkit for KB Loader API v1.

## Features

- Project generator
- KB CLI
- Manifest validation
- Build and package generation
- TypeScript API declarations
- Manifest JSON Schema
- Starter template and working example

## Quick start

From the KBVERSE repository root:

```powershell
node sdk/bin/kb.js create examples/my-first-mod
node sdk/bin/kb.js validate examples/my-first-mod
node sdk/bin/kb.js build examples/my-first-mod
```

Import the generated file:

`examples/my-first-mod/dist/my-first-mod.kbmod.json`

Use KBVERSE Editor > KB MODS > Import Mod Package.

## API version

This SDK targets KB Loader API v1. Its manifest format and permissions match the current loader implementation.

## Package structure

- `bin/kb.js`: CLI
- `types/index.d.ts`: TypeScript declarations
- `schemas/manifest.schema.json`: manifest schema
- `templates/basic`: project template
- `examples/hello-world`: example mod

## Important

The SDK validates package structure and basic compatibility. It does not certify a mod as safe. The KB Loader sandbox and permission checks remain the host application's responsibility.