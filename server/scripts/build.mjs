import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));

function run(command, label) {
  console.log(`[${label}] Running: ${command}`);
  execSync(command, { stdio: "inherit" });
}

function ensureChromium() {
  // On Linux (Render), explicitly run Puppeteer's install script to
  // download Chromium. This covers cases where npm skips the postinstall
  // hook due to node_modules cache.
  if (process.platform !== "linux") return;

  const installScript = resolve(ROOT, "../node_modules/puppeteer/install.mjs");

  if (existsSync(installScript)) {
    console.log("Downloading Chromium for Puppeteer...");
    run(`node ${installScript}`, "puppeteer:install");
  } else {
    console.log("Puppeteer install script not found, skipping Chromium download");
  }
}

function build() {
  console.log("Compiling TypeScript...");
  run("npx tsc", "tsc");

  ensureChromium();

  console.log("=== Build complete ===");
}

build();
