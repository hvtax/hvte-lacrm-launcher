// Shared mechanical steps for Actions and release.ps1. No runtime dependency.
import { readFileSync, writeFileSync, readdirSync, copyFileSync, existsSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPOSITORY = "hvtax/hvte-lacrm-launcher";
export const UPDATE_URL = "https://hvtax.github.io/hvte-lacrm-launcher/updates.json";
export const ADDON_ID = "hvte-lacrm-launcher@hvtaxexperts.com";
const readJson = path => JSON.parse(readFileSync(path, "utf8"));
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
export function repositoryFromRemote(remote) {
  const match = /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([^/]+\/[^/]+?)(?:\.git)?\/?$/.exec(remote);
  return match?.[1] || null;
}
export function assertConfiguration(manifest, repository) {
  if (repository !== REPOSITORY) throw new Error(`HARD STOP: repository must be ${REPOSITORY}; found ${repository || "unknown"}`);
  const gecko = manifest.browser_specific_settings?.gecko;
  if (gecko?.update_url !== UPDATE_URL || gecko?.id !== ADDON_ID) throw new Error("HARD STOP: add-on ID or update_url differs from the settled repository configuration");
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error("Use a three-part numeric release version");
}
export function assertNewVersion(version, tags) {
  const compare = (a, b) => {
    const x = a.split(".").map(Number), y = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return Math.sign(x[i] - y[i]);
    return 0;
  };
  for (const tag of tags) {
    if (/^v\d+\.\d+\.\d+$/.test(tag) && compare(version, tag.slice(1)) <= 0) {
      throw new Error(`Version ${version} must be higher than existing release tag ${tag}`);
    }
  }
}
function guard() {
  const manifest = readJson("manifest.json");
  assertConfiguration(manifest, repositoryFromRemote(git("remote", "get-url", "origin")));
  if (process.env.GITHUB_REPOSITORY) assertConfiguration(manifest, process.env.GITHUB_REPOSITORY);
  assertNewVersion(manifest.version, git("tag", "--list").split(/\r?\n/));
  if (git("status", "--porcelain", "--untracked-files=normal")) throw new Error("Commit source changes before release; working tree must be clean");
  return manifest;
}
function sign() {
  guard();
  if (!process.env.AMO_JWT_ISSUER || !process.env.AMO_JWT_SECRET) throw new Error("Set AMO_JWT_ISSUER and AMO_JWT_SECRET in environment variables only");
  const signedDir = "web-ext-artifacts/signed";
  if (existsSync(signedDir) && readdirSync(signedDir).some(name => name.endsWith(".xpi"))) throw new Error("Archive previous signed artifacts outside web-ext-artifacts/signed before signing");
  const env = { ...process.env, WEB_EXT_API_KEY: process.env.AMO_JWT_ISSUER, WEB_EXT_API_SECRET: process.env.AMO_JWT_SECRET };
  const child = spawnSync(process.execPath, ["node_modules/web-ext/bin/web-ext.js", "sign", "--config", "tools/web-ext-config.cjs", "--channel=unlisted", "--artifacts-dir", signedDir, "--approval-timeout", "900000"], { env, stdio: "inherit" });
  if (child.error || child.status !== 0) throw new Error("AMO signing failed; stop and report the signing step to the owner");
}
function prepare() {
  const manifest = readJson("manifest.json");
  assertConfiguration(manifest, repositoryFromRemote(git("remote", "get-url", "origin")));
  const files = readdirSync("web-ext-artifacts/signed").filter(name => name.endsWith(".xpi"));
  if (files.length !== 1) throw new Error("Expected exactly one signed XPI from the signing step");
  const version = manifest.version;
  const filename = `hvte-lacrm-launcher-${version}.xpi`;
  const asset = `web-ext-artifacts/${filename}`;
  copyFileSync(`web-ext-artifacts/signed/${files[0]}`, asset);
  const update_link = `https://github.com/${REPOSITORY}/releases/download/v${version}/${filename}`;
  const update_hash = `sha256:${createHash("sha256").update(readFileSync(asset)).digest("hex")}`;
  const updates = readJson("updates.json");
  const prior = updates.addons[ADDON_ID].updates.filter(entry => entry.version !== version);
  updates.addons[ADDON_ID].updates = [{ version, update_link, update_hash }, ...prior];
  writeFileSync("updates.json", JSON.stringify(updates, null, 2) + "\n");
  console.log(`Prepared ${asset}\nSHA-256: ${update_hash}\nUpdate URL: ${UPDATE_URL}`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const command = process.argv[2];
    if (command === "guard") console.log(`Release checks passed for ${guard().version}`);
    else if (command === "sign") sign();
    else if (command === "prepare") prepare();
    else throw new Error("Usage: node tools/release.mjs guard|sign|prepare");
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
