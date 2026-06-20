import { execSync } from "node:child_process";

function run(command, label) {
  console.log(`[${label}] Running: ${command}`);
  execSync(command, { stdio: "inherit" });
}

async function build() {
  // Chromium is provided by the `puppeteer` package (downloaded during
  // npm install) and resolved at runtime by browser-pool.ts. No system
  // install needed.
  console.log("Compiling TypeScript...");

  run("npx tsc", "tsc");
  console.log("=== Build complete ===");
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
