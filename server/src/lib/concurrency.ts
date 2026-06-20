import { logger } from "./logger.js";

// ======================================================
// RATE LIMITER
// ======================================================

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

// ======================================================
// TASK QUEUE
//
// Supports configurable concurrency, backpressure via
// max queue depth, and metrics/observability.
// ======================================================

class TaskQueue {
  private queue: (() => Promise<void>)[] = [];
  private running = 0;
  private completed = 0;
  private failed = 0;

  constructor(
    private maxConcurrency: number,
    private maxQueueDepth: number = 10,
  ) {}

  /**
   * Add a task. Throws if queue is full (backpressure).
   */
  async add<T>(task: () => Promise<T>): Promise<T> {
    // Backpressure: reject if queue is too deep
    if (this.queue.length >= this.maxQueueDepth) {
      throw new QueueFullError(
        `Analysis queue is full (${this.queue.length}/${this.maxQueueDepth}). Try again later.`,
      );
    }

    return new Promise((resolve, reject) => {
      const wrappedTask = async () => {
        this.running++;

        try {
          const result = await task();
          this.completed++;
          resolve(result);
        } catch (error) {
          this.failed++;
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

  getStats() {
    return {
      pending: this.queue.length,
      running: this.running,
      completed: this.completed,
      failed: this.failed,
      maxConcurrency: this.maxConcurrency,
      maxQueueDepth: this.maxQueueDepth,
    };
  }
}

/**
 * Custom error for queue full / backpressure
 */
export class QueueFullError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QueueFullError";
  }
}

// ======================================================
// CLEANUP
// ======================================================

const cleanupInterval = setInterval(() => {
  generalRateLimiter.cleanup();
  analysisRateLimiter.cleanup();

  logger.info("Rate limiter cleanup completed");
}, 10 * 60 * 1000);

cleanupInterval.unref();

// ======================================================
// SHARED INSTANCES
//
// Queue concurrency matches pool size (default 2).
// Max queue depth = 10: beyond this, return 503.
// ======================================================

const poolSize = Number(process.env.CHROME_POOL_SIZE) || 2;

export const analysisQueue = new TaskQueue(poolSize, 10);

export const generalRateLimiter =
  new LocalRateLimiter(100, 15 * 60 * 1000);

// Product rule: 1 analysis per user per minute (the client shows a 60s countdown).
export const analysisRateLimiter =
  new LocalRateLimiter(1, 60 * 1000);