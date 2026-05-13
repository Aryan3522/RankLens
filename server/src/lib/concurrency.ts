import { logger } from "./logger.js";

/**
 * Simple in-memory rate limiter
 */

class LocalRateLimiter {
  private requests = new Map<
    string,
    {
      count: number;
      expiresAt: number;
    }
  >();

  constructor(
    private maxRequests = 100,
    private windowMs = 15 * 60 * 1000,
  ) {}

  isRateLimited(key: string): boolean {
    const now = Date.now();

    const existing = this.requests.get(key);

    // RESET WINDOW
    if (!existing || existing.expiresAt < now) {
      this.requests.set(key, {
        count: 1,
        expiresAt: now + this.windowMs,
      });

      return false;
    }

    // RATE LIMITED
    if (existing.count >= this.maxRequests) {
      return true;
    }

    // INCREMENT
    existing.count++;

    return false;
  }

  getRemaining(key: string): number {
    const existing = this.requests.get(key);

    if (!existing) {
      return this.maxRequests;
    }

    return Math.max(0, this.maxRequests - existing.count);
  }

  cleanup() {
    const now = Date.now();

    for (const [key, value] of this.requests.entries()) {
      if (value.expiresAt < now) {
        this.requests.delete(key);
      }
    }
  }
}

/**
 * Lightweight async task queue
 */

class TaskQueue {
  private queue: (() => Promise<void>)[] = [];

  private running = 0;

  constructor(private maxConcurrency = 1) {}

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const wrappedTask = async () => {
        this.running++;

        try {
          const result = await task();

          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;

          this.next();
        }
      };

      this.queue.push(wrappedTask);

      this.next();
    });
  }

  private next() {
    if (
      this.running >= this.maxConcurrency ||
      this.queue.length === 0
    ) {
      return;
    }

    const task = this.queue.shift();

    if (!task) {
      return;
    }

    void task();
  }

  getPendingCount() {
    return this.queue.length;
  }
}

/**
 * Cleanup expired rate limit entries every 10 mins
 */

const cleanupInterval = setInterval(() => {
  generalRateLimiter.cleanup();
  analysisRateLimiter.cleanup();

  logger.info("Rate limiter cleanup completed");
}, 10 * 60 * 1000);

cleanupInterval.unref();

/**
 * Shared instances
 */

export const analysisQueue = new TaskQueue(1);

export const generalRateLimiter =
  new LocalRateLimiter(100, 15 * 60 * 1000);

export const analysisRateLimiter =
  new LocalRateLimiter(5, 60 * 60 * 1000);