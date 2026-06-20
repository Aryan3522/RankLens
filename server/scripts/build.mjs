import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const IS_WINDOWS = process.platform === "win32";
const IS_LINUX = process.platform === "linux";

function run(command, label) {
  console.log(`[${label}] Running: ${command}`);
  execSync(command, { stdio: "inherit" });
}

async function build() {
  if (IS_LINUX) {
    // Install Chromium and dependencies for Lighthouse (Render / Linux)
    console.log("=== Installing Chromium dependencies ===");
    try {
      execSync(
        "apt-get update -qq && apt-get install -y -qq --no-install-recommends " +
          "chromium-browser " +
          "fonts-liberation " +
          "libappindicator3-1 " +
          "libasound2 " +
          "libatk-bridge2.0-0 " +
          "libatk1.0-0 " +
          "libcups2 " +
          "libdbus-1-3 " +
          "libdrm2 " +
          "libgbm1 " +
          "libgtk-3-0 " +
          "libnspr4 " +
          "libnss3 " +
          "libx11-xcb1 " +
          "libxcomposite1 " +
          "libxdamage1 " +
          "libxrandr2 " +
          "xdg-utils",
        { stdio: "inherit" },
      );
    } catch {
      console.log("Some packages may not be available, continuing...");
    }

    // Detect the installed Chromium path and set CHROME_PATH
    const chromeCandidates = [
      "chromium-browser",
      "chromium",
      "google-chrome-stable",
    ];
    for (const cmd of chromeCandidates) {
      try {
        const chromePath = execSync(`which ${cmd} 2>/dev/null`, {
          encoding: "utf-8",
        }).trim();
        if (chromePath) {
          console.log(`Chrome/Chromium found at: ${chromePath}`);
          process.env.CHROME_PATH = chromePath;
          break;
        }
      } catch {
        // command not found, try next
      }
    }

    if (!process.env.CHROME_PATH) {
      const systemPaths = [
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/google-chrome",
      ];
      for (const p of systemPaths) {
        if (existsSync(p)) {
          process.env.CHROME_PATH = p;
          console.log(`Chrome/Chromium found at: ${p}`);
          break;
        }
      }
    }

    if (!process.env.CHROME_PATH) {
      console.log("WARNING: No Chromium/Chrome binary found. Lighthouse may fail at runtime.");
    }
  } else {
    console.log(`Skipping Chromium installation (not Linux: ${process.platform})`);
  }

  // Compile TypeScript
  console.log("=== Building server ===");
  run("npx tsc", "tsc");
  console.log("=== Build complete ===");
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
