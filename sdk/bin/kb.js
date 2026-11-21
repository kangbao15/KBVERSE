#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SDK_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE = path.join(SDK_DIR, "templates", "basic");
export const KB_API_VERSION = 1;
export const MAX_SOURCE_BYTES = 256000;
export const KB_PERMISSIONS = Object.freeze(["scene.read", "scene.write", "project.read", "storage", "notifications", "commands"]);
const PERMISSION_SET = new Set(KB_PERMISSIONS);
const ID_REGEX = /^[a-z0-9][a-z0-9._-]{1,63}$/;
const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;
const command = process.argv[2] || "help";
const targetArg = process.argv[3];

function fail(msg) { console.error("\n[KB SDK ERROR] " + msg); process.exitCode = 1; }
function slugify(v) { return String(v || "").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, ""); }
function friendlyName(v) { return v.split(/[-_.]+/).filter(Boolean).map(p => p[0].toUpperCase() + p.slice(1)).join(" "); }
function readJson(filePath, label) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch (e) { throw new Error(`Invalid JSON in ${label}: ${e.message}`); }
}

function readProject(target) {
  const abs = path.resolve(process.cwd(), target);
  if (!fs.existsSync(abs)) throw new Error("Project path does not exist: " + abs);
  const st = fs.statSync(abs);
  if (st.isFile()) {
    const pkg = readJson(abs, "mod package");
    return { manifest: pkg?.manifest, source: pkg?.source, outDir: path.dirname(abs) };
  }
  const mPath = path.join(abs, "kbverse.json");
  const sPath = path.join(abs, "src", "index.js");
  if (!fs.existsSync(mPath)) throw new Error("Missing kbverse.json");
  if (!fs.existsSync(sPath)) throw new Error("Missing src/index.js");
  return { manifest: readJson(mPath, "kbverse.json"), source: fs.readFileSync(sPath, "utf8"), outDir: path.join(abs, "dist") };
}

export function validateMod(manifest, source) {
  const errors = [], warnings = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return { errors: ["Manifest must be an object."], warnings };
  if (typeof manifest.id !== "string" || !ID_REGEX.test(manifest.id)) errors.push("Invalid mod ID.");
  if (typeof manifest.name !== "string" || !manifest.name.trim() || manifest.name.length > 80) errors.push("Name must contain 1-80 characters.");
  if (typeof manifest.version !== "string" || !SEMVER_REGEX.test(manifest.version)) errors.push("Version must use semantic versioning: x.y.z.");
  if (manifest.apiVersion !== KB_API_VERSION) errors.push("This SDK targets KB Loader API v1.");
  if (manifest.description !== undefined && (typeof manifest.description !== "string" || manifest.description.length > 1000)) errors.push("Invalid description.");
  if (manifest.author !== undefined && (typeof manifest.author !== "string" || manifest.author.length > 100)) errors.push("Invalid author.");
  if (manifest.minKBVersion && !SEMVER_REGEX.test(manifest.minKBVersion)) errors.push("Invalid minKBVersion.");
  if (typeof source !== "string" || !source.trim()) errors.push("Mod source is empty.");
  else if (Buffer.byteLength(source, "utf8") > MAX_SOURCE_BYTES) errors.push("Source exceeds the KB Loader 256 KB byte limit.");

  const perms = manifest.permissions ?? [];
  if (!Array.isArray(perms)) errors.push("permissions must be an array.");
  else {
    const seen = new Set();
    for (const p of perms) {
      if (!PERMISSION_SET.has(p)) errors.push("Unsupported permission: " + p);
      else if (seen.has(p)) errors.push("Duplicate permission: " + p);
      seen.add(p);
    }
  }

  const deps = manifest.dependencies ?? [];
  if (!Array.isArray(deps)) errors.push("dependencies must be an array.");
  else {
    const seen = new Set();
    for (const d of deps) {
      if (typeof d !== "string" || !ID_REGEX.test(d)) errors.push("Invalid dependency: " + d);
      else if (seen.has(d)) errors.push("Duplicate dependency: " + d);
      if (d === manifest.id) errors.push("A mod cannot depend on itself.");
      seen.add(d);
    }
  }

  if (typeof source === "string" && /\beval\s*\(|\bnew\s+Function\s*\(/.test(source)) warnings.push("Dynamic code execution detected.");
  if (typeof source === "string" && /\bfetch\s*\(|\bWebSocket\b/.test(source)) warnings.push("Network API usage detected.");
  return { errors, warnings };
}

function printValidation(res) {
  for (const w of res.warnings) console.warn("[WARN] " + w);
  for (const e of res.errors) console.error("[ERROR] " + e);
  if (res.errors.length) throw new Error(res.errors.length + " validation error(s).");
}

function createProject(target) {
  const slug = slugify(path.basename(target));
  if (slug.length < 2 || slug.length > 64 || !ID_REGEX.test(slug)) throw new Error("Project name must produce a valid mod ID.");
  const dest = path.resolve(process.cwd(), target);
  if (fs.existsSync(dest) && fs.readdirSync(dest).length > 0) throw new Error("Destination directory is not empty.");
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(TEMPLATE, dest, { recursive: true });
  const mPath = path.join(dest, "kbverse.json");
  const m = readJson(mPath, "kbverse.json");
  m.id = slug; m.name = friendlyName(slug); m.apiVersion = KB_API_VERSION;
  fs.writeFileSync(mPath, JSON.stringify(m, null, 2) + "\n", "utf8");
  console.log("\nCreated KBVERSE mod project:\n" + dest);
}

function buildProject(target) {
  const proj = readProject(target);
  printValidation(validateMod(proj.manifest, proj.source));
  fs.mkdirSync(proj.outDir, { recursive: true });
  const out = path.join(proj.outDir, proj.manifest.id + ".kbmod.json");
  const pkg = { manifest: { ...proj.manifest, apiVersion: KB_API_VERSION }, source: proj.source };
  const raw = JSON.stringify(pkg, null, 2) + "\n";
  const tmp = out + ".tmp";
  fs.writeFileSync(tmp, raw, "utf8");
  fs.renameSync(tmp, out);
  console.log("\n[KB SDK] Build successful.\nMod: " + pkg.manifest.name + "\nVersion: " + pkg.manifest.version + "\nPackage: " + out + "\nSize: " + Buffer.byteLength(raw, "utf8") + " bytes");
}

function printHelp() {
  console.log("\nKBVERSE SDK CLI\n\n  kb create <folder>\n  kb validate <folder>\n  kb build <folder>\n  kb pack <folder>\n  kb help\n");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    if (command === "create") { if (!targetArg) throw new Error("Usage: kb create <folder>"); createProject(targetArg); }
    else if (command === "validate") { if (!targetArg) throw new Error("Usage: kb validate <folder>"); const p = readProject(targetArg); printValidation(validateMod(p.manifest, p.source)); console.log("\n[KB SDK] Validation successful: " + p.manifest.id); }
    else if (command === "build" || command === "pack") { if (!targetArg) throw new Error("Usage: kb build <folder>"); buildProject(targetArg); }
    else if (command === "help" || command === "--help" || command === "-h") printHelp();
    else throw new Error("Unknown command: " + command);
  } catch (e) { fail(e.message); }
}
