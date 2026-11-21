# KB CLI

## Create a project

`node sdk/bin/kb.js create examples/my-mod`

Creates a project with a manifest and starter source.

## Validate

`node sdk/bin/kb.js validate examples/my-mod`

Checks the manifest, API version, permissions, dependencies, and source size.

## Build

`node sdk/bin/kb.js build examples/my-mod`

Creates:

`examples/my-mod/dist/<mod-id>.kbmod.json`

## Pack

`node sdk/bin/kb.js pack examples/my-mod`

Alias for build.