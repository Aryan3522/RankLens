import { launch, type LaunchedChrome } from "chrome-launcher";
import chromium from "@sparticuz/chromium";

import { logger } from "./logger.js";
import { env } from "./env.js";

// ======================================================
// TYPES
// ======================================================

export interface PooledChrome {
  chrome: LaunchedChrome;
  port: number;
  createdAt: number;
  busy: boolean;
}

interface PoolOptions {
  poolSize: number;
  maxIdleMs: number;
  chromeFlags: string[];
}

// ======================================================
// DEFAULT CHROME FLAGS
//
// These match the Lighthouse CLI defaults and are tuned
// for headless server environments (Render, Docker, VPS).
// ======================================================

const DEFAULT_CHROME_FLAGS: string[] = [
  "--headless=new",             // New headless: closer to headed Chrome rendering
  "--no-sandbox",               // Required for Docker / Render
  "--disable-gpu",
  "--disable-dev-shm-usage",    // Avoids /dev/shm exhaustion in containers
  "--disable-setuid-sandbox",
  "--disable-extensions",       // Lighthouse CLI default
  "--disable-default-apps",
  "--disable-background-networking",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-features=TranslateUI",
  "--disable-ipc-flooding-protection",
  "--disable-translate",
  "--no-first-run",
  "--no-default-browser-check",
  "--mute-audio",
];

// ======================================================
// RESOLVE CHROME PATH
//
// Render: system Chromium via CHROME_PATH env var or
//         apt-installed chromium-browser
// Lambda: @sparticuz/chromium
// Local:  chrome-launcher auto-detects
// ======================================================

let resolvedChromePath: string | undefined;

async function resolveChromePath(): Promise<string | undefined> {
  if (resolvedChromePath !== undefined) return resolvedChromePath;

  // 1. Explicit env var (best for Render: set CHROME_PATH in dashboard)
  if (process.env.CHROME_PATH) {
    resolvedChromePath = process.env.CHROME_PATH;
    logger.info({ path: resolvedChromePath }, "Using CHROME_PATH from env");
    return resolvedChromePath;
  }

  // 2. Production: try @sparticuz/chromium (Lambda) or common system paths
  if (env.NODE_ENV === "production") {
    // Try common Render / Linux paths first (cheaper than sparticuz extraction)
    const { existsSync } = await import("fs");
    const systemPaths = [
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/google-chrome",
    ];

    for (const p of systemPaths) {
      if (existsSync(p)) {
        resolvedChromePath = p;
        logger.info({ path: p }, "Using system Chromium");
        return resolvedChromePath;
      }
    }

    // Fallback: @sparticuz/chromium (for Lambda / serverless)
    try {
      resolvedChromePath = await chromium.executablePath();
      logger.info({ path: resolvedChromePath }, "Using @sparticuz/chromium");
      return resolvedChromePath;
    } catch {
      logger.warn("@sparticuz/chromium unavailable, falling back to auto-detect");
    }
  }

  // 3. Development: let chrome-launcher auto-detect
  resolvedChromePath = undefined;
  return resolvedChromePath;
}

// ======================================================
// CHROME POOL
// ======================================================

class ChromePool {
  private pool: PooledChrome[] = [];
  private waiters: Array<{
    resolve: (instance: PooledChrome) => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = [];
  private options: PoolOptions;
  private recycleInterval: ReturnType<typeof setInterval> | null = null;
  private initialized = false;
  private initializing: Promise<void> | null = null;
  private destroyed = false;

  constructor(options?: Partial<PoolOptions>) {
    this.options = {
      poolSize: options?.poolSize ?? (Number(process.env.CHROME_POOL_SIZE) || 2),
      maxIdleMs: options?.maxIdleMs ?? 30 * 60 * 1000, // 30 min
      chromeFlags: options?.chromeFlags ?? DEFAULT_CHROME_FLAGS,
    };
  }

  // --------------------------------------------------
  // INITIALIZE
  // --------------------------------------------------

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializing) return this.initializing;

    this.initializing = this._doInit();
    return this.initializing;
  }

  private async _doInit(): Promise<void> {
    const start = Date.now();
    logger.info(
      { poolSize: this.options.poolSize },
      "Initializing Chrome pool",
    );

    const chromePath = await resolveChromePath();

    // Launch instances in parallel
    const launches = Array.from(
      { length: this.options.poolSize },
      () => this.launchInstance(chromePath),
    );

    const results = await Promise.allSettled(launches);

    for (const result of results) {
      if (result.status === "fulfilled") {
        this.pool.push(result.value);
      } else {
        logger.error(
          { error: result.reason },
          "Failed to launch pooled Chrome instance",
        );
      }
    }

    if (this.pool.length === 0) {
      throw new Error(
        "Chrome pool failed to initialize: no instances launched",
      );
    }

    // Start idle recycling
    this.recycleInterval = setInterval(
      () => this.recycleIdleInstances(),
      5 * 60 * 1000, // check every 5 min
    );
    this.recycleInterval.unref();

    this.initialized = true;
    logger.info(
      {
        poolSize: this.pool.length,
        durationMs: Date.now() - start,
      },
      "Chrome pool ready",
    );
  }

  // --------------------------------------------------
  // LAUNCH INSTANCE
  // --------------------------------------------------

  private async launchInstance(
    chromePath?: string,
  ): Promise<PooledChrome> {
    const chrome = await launch({
      chromePath,
      chromeFlags: this.options.chromeFlags,
    });

    return {
      chrome,
      port: chrome.port,
      createdAt: Date.now(),
      busy: false,
    };
  }

  // --------------------------------------------------
  // ACQUIRE (with timeout)
  // --------------------------------------------------

  async acquire(timeoutMs = 30_000): Promise<PooledChrome> {
    if (this.destroyed) {
      throw new Error("Chrome pool is destroyed");
    }

    await this.initialize();

    // Try to find a free instance
    const free = this.pool.find((i) => !i.busy);
    if (free) {
      free.busy = true;
      return free;
    }

    // All busy — wait for one to be released
    return new Promise<PooledChrome>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.waiters.findIndex((w) => w.resolve === resolve);
        if (idx !== -1) this.waiters.splice(idx, 1);
        reject(new Error(`Chrome pool acquire timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.waiters.push({ resolve, reject, timer });
    });
  }

  // --------------------------------------------------
  // RELEASE
  // --------------------------------------------------

  release(instance: PooledChrome): void {
    instance.busy = false;

    // If someone is waiting, hand it off immediately
    if (this.waiters.length > 0) {
      const waiter = this.waiters.shift()!;
      clearTimeout(waiter.timer);
      instance.busy = true;
      waiter.resolve(instance);
      return;
    }
  }

  // --------------------------------------------------
  // RECYCLE IDLE INSTANCES
  // --------------------------------------------------

  private async recycleIdleInstances(): Promise<void> {
    const now = Date.now();

    for (let i = this.pool.length - 1; i >= 0; i--) {
      const instance = this.pool[i]!;

      if (
        !instance.busy &&
        now - instance.createdAt > this.options.maxIdleMs
      ) {
        logger.info(
          { port: instance.port },
          "Recycling idle Chrome instance",
        );

        this.pool.splice(i, 1);

        try {
          await instance.chrome.kill();
        } catch {
          // already dead
        }

        // Relaunch a fresh one
        try {
          const chromePath = await resolveChromePath();
          const fresh = await this.launchInstance(chromePath);
          this.pool.push(fresh);
        } catch (err) {
          logger.error({ error: err }, "Failed to relaunch recycled Chrome");
        }
      }
    }
  }

  // --------------------------------------------------
  // DESTROY ALL
  // --------------------------------------------------

  async destroyAll(): Promise<void> {
    this.destroyed = true;

    if (this.recycleInterval) {
      clearInterval(this.recycleInterval);
      this.recycleInterval = null;
    }

    // Reject all waiters
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error("Chrome pool is shutting down"));
    }
    this.waiters = [];

    // Kill all Chrome instances
    const kills = this.pool.map(async (instance) => {
      try {
        await instance.chrome.kill();
      } catch {
        // already dead
      }
    });

    await Promise.allSettled(kills);
    this.pool = [];

    logger.info("Chrome pool destroyed");
  }

  // --------------------------------------------------
  // METRICS
  // --------------------------------------------------

  getStats() {
    return {
      total: this.pool.length,
      busy: this.pool.filter((i) => i.busy).length,
      idle: this.pool.filter((i) => !i.busy).length,
      waiters: this.waiters.length,
    };
  }
}

// ======================================================
// SINGLETON
// ======================================================

export const chromePool = new ChromePool();
