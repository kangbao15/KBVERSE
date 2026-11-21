#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SDK_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE = path.join(SDK_DIR, "templates", "basic");

const PERMISSIONS = new Set([
  "scene.read",
  "scene.write",
  "project.read",
  "storage",
  "notifications",
  "commands"
]);

const command = process.argv[2] || "help";
const targetArg = process.argv[3];

function fail(message) {
  console.error("\n[KB SDK ERROR] " + message);
  process.exitCode = 1;
}

function slugify(value) {
  return value.toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function friendlyName(value) {
  return value.split(/[-_.]+/)
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function readProject(target) {
  const absolute = path.resolve(process.cwd(), target);

  if (!fs.existsSync(absolute)) {
    throw new Error("Project path does not exist: " + absolute);
  }

  const stat = fs.statSync(absolute);

  if (stat.isFile()) {
    const pkg = JSON.parse(fs.readFileSync(absolute, "utf8"));
    return {
      manifest: pkg.manifest,
      source: pkg.source,
      output: absolute
    };
  }

  const manifestPath = path.join(absolute, "kbverse.json");
  const sourcePath = path.join(absolute, "src", "index.js");

  if (!fs.existsSync(manifestPath)) {
    throw new Error("Missing kbverse.json");
  }

  if (!fs.existsSync(sourcePath)) {
    throw new Error("Missing src/index.js");
  }

  return {
    manifest: JSON.parse(fs.readFileSync(manifestPath, "utf8")),
    source: fs.readFileSync(sourcePath, "utf8"),
    directory: absolute
  };
}

function validate(manifest, source) {
  const errors = [];
  const warnings = [];

  if (!manifest || typeof manifest !== "object") {
    return { errors: ["Manifest must be an object."], warnings };
  }

  if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(manifest.id || "")) {
    errors.push("Invalid mod ID.");
  }

  if (typeof manifest.name !== "string" ||
      !manifest.name.trim() || manifest.name.length > 80) {
    errors.push("Name must contain 1-80 characters.");
  }

  if (!/^\d+\.\d+\.\d+$/.test(manifest.version || "")) {
    errors.push("Version must use semantic versioning: x.y.z.");
  }

  if (manifest.apiVersion !== 1) {
    errors.push("This SDK targets KB Loader API v1.");
  }

  if (manifest.minKBVersion &&
      !/^\d+\.\d+\.\d+$/.test(manifest.minKBVersion)) {
    errors.push("Invalid minKBVersion.");
  }

  if (typeof source !== "string" || !source.trim()) {
    errors.push("Mod source is empty.");
  } else if (Buffer.byteLength(source, "utf8") > 256000) {
    errors.push("Source exceeds the KB Loader 256 KB limit.");
  }

  const permissions = manifest.permissions ?? [];

  if (!Array.isArray(permissions)) {
    errors.push("permissions must be an array.");
  } else {
    for (const permission of permissions) {
      if (!PERMISSIONS.has(permission)) {
        errors.push("Unsupported permission: " + permission);
      }
    }

    if (new Set(permissions).size !== permissions.length) {
      errors.push("Duplicate permissions detected.");
    }
  }

  const dependencies = manifest.dependencies ?? [];

  if (!Array.isArray(dependencies)) {
    errors.push("dependencies must be an array.");
  } else {
    for (const dependency of dependencies) {
      if (typeof dependency !== "string" ||
          !/^[a-z0-9][a-z0-9._-]{1,63}$/.test(dependency)) {
        errors.push("Invalid dependency: " + dependency);
      }

      if (dependency === manifest.id) {
        errors.push("A mod cannot depend on itself.");
      }
    }
  }

  if (source && /\beval\s*\(|\bnew\s+Function\s*\(/.test(source)) {
    warnings.push("Dynamic code execution detected. Review this code carefully.");
  }

  if (source && /\bfetch\s*\(|\bWebSocket\b/.test(source)) {
    warnings.push("Network API usage detected. KB Loader v1 does not expose unrestricted network access.");
  }

  return { errors, warnings };
}

function printValidation(result) {
  for (const warning of result.warnings) {
    console.warn("[WARN] " + warning);
  }

  for (const error of result.errors) {
    console.error("[ERROR] " + error);
  }

  if (result.errors.length) {
    throw new Error(result.errors.length + " validation error(s).");
  }
}

function createProject(target) {
  const slug = slugify(path.basename(target));

  if (slug.length < 2 || slug.length > 64) {
    throw new Error("Project name must produce a valid mod ID.");
  }

  const destination = path.resolve(process.cwd(), target);

  if (fs.existsSync(destination) &&
      fs.readdirSync(destination).length > 0) {
    throw new Error("Destination directory is not empty.");
  }

  fs.mkdirSync(destination, { recursive: true });
  fs.cpSync(TEMPLATE, destination, { recursive: true });

  const manifestPath = path.join(destination, "kbverse.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  manifest.id = slug;
  manifest.name = friendlyName(slug);

  fs.writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8"
  );

  console.log("\nCreated KBVERSE mod project:");
  console.log(destination);
  console.log("\nNext commands:");
  console.log("  node " + path.relative(process.cwd(), path.join(SDK_DIR, "bin/kb.js")) +
    " validate " + target);
  console.log("  node " + path.relative(process.cwd(), path.join(SDK_DIR, "bin/kb.js")) +
    " build " + target);
}

function buildProject(target) {
  const project = readProject(target);
  const result = validate(project.manifest, project.source);

  printValidation(result);

  const outputDir = path.join(project.directory, "dist");
  fs.mkdirSync(outputDir, { recursive: true });

  const output = path.join(
    outputDir,
    project.manifest.id + ".kbmod.json"
  );

  const packageData = {
    manifest: project.manifest,
    source: project.source
  };

  const temporary = output + ".tmp";

  fs.writeFileSync(
    temporary,
    JSON.stringify(packageData, null, 2) + "\n",
    "utf8"
  );

  fs.renameSync(temporary, output);

  console.log("\n[KB SDK] Build successful.");
  console.log("Mod: " + project.manifest.name);
  console.log("Version: " + project.manifest.version);
  console.log("API: v" + project.manifest.apiVersion);
  console.log("Package: " + output);
  console.log("Size: " + Buffer.byteLength(
    JSON.stringify(packageData), "utf8"
  ) + " bytes");
}

function printHelp() {
  console.log(`
KBVERSE SDK v0.1.0

Commands:

  kb create <folder>      Generate a new mod project
  kb validate <folder>    Validate manifest and source
  kb build <folder>       Build .kbmod.json package
  kb pack <folder>        Alias for build
  kb help                 Show this help

Local usage from KBVERSE repository:

  node sdk/bin/kb.js create examples/my-mod
  node sdk/bin/kb.js validate examples/my-mod
  node sdk/bin/kb.js build examples/my-mod

The output package can be imported using KB Mod Manager.
`);
}

try {
  switch (command) {
    case "create":
      if (!targetArg) throw new Error("Usage: kb create <folder>");
      createProject(targetArg);
      break;

    case "validate": {
      if (!targetArg) throw new Error("Usage: kb validate <folder>");
      const project = readProject(targetArg);
      const result = validate(project.manifest, project.source);
      printValidation(result);
      console.log("\n[KB SDK] Validation successful.");
      console.log("Manifest: " + project.manifest.id);
      console.log("API version: " + project.manifest.apiVersion);
      break;
    }

    case "build":
    case "pack":
      if (!targetArg) throw new Error("Usage: kb build <folder>");
      buildProject(targetArg);
      break;

    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;

    default:
      throw new Error("Unknown command: " + command);
  }
} catch (error) {
  fail(error.message);
}