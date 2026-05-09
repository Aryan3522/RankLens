import { LRUCache } from "lru-cache";
import { logger } from "./logger.js";

/**
 * Enterprise-grade local rate limiter using LRU Cache.
 */
class LocalRateLimiter {
  private cache: LRUCache<string, number>;
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests = 100, windowMs = 15 * 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.cache = new LRUCache({
      max: 5000,
      ttl: windowMs,
    });
  }

  isRateLimited(key: string): boolean {
    const current = this.cache.get(key) || 0;
    if (current >= this.maxRequests) {
      return true;
    }
    this.cache.set(key, current + 1);
    return false;
  }

  getRemaining(key: string): number {
    const current = this.cache.get(key) || 0;
    return Math.max(0, this.maxRequests - current);
  }
}

/**
 * Strict Concurrency Queue
 */
class TaskQueue {
  private queue: (() => Promise<void>)[] = [];
  private running = 0;
  private maxConcurrency: number;

  constructor(maxConcurrency = 1) {
    this.maxConcurrency = maxConcurrency;
  }

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const wrapper = async () => {
        this.running++;
        try {
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          this.running--;
          this.next();
        }
      };

      this.queue.push(wrapper);
      this.next();
    });
  }

  private next() {
    if (this.running >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (task) {
      task();
    }
  }

  getPendingCount() {
    return this.queue.length;
  }
}

export const analysisQueue = new TaskQueue(1);
export const generalRateLimiter = new LocalRateLimiter(100, 15 * 60 * 1000);
export const analysisRateLimiter = new LocalRateLimiter(5, 60 * 60 * 1000);
