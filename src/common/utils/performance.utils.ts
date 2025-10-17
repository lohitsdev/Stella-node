/**
 * Performance utilities for async operations, timeouts, and circuit breakers
 */

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
}

export interface TimeoutOptions {
  timeout: number;
  signal?: AbortSignal;
}

/**
 * Circuit Breaker implementation for resilient service calls
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.options.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.options.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }
}

/**
 * Retry utility with exponential backoff and jitter
 */
export class RetryManager {
  constructor(private options: RetryOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === this.options.maxAttempts) {
          throw lastError;
        }

        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.options.baseDelay * Math.pow(2, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, this.options.maxDelay);

    if (this.options.jitter) {
      const jitterAmount = cappedDelay * 0.1;
      const jitter = (Math.random() - 0.5) * 2 * jitterAmount;
      return Math.max(0, cappedDelay + jitter);
    }

    return cappedDelay;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Timeout utility for async operations
 */
export class TimeoutManager {
  static async withTimeout<T>(operation: () => Promise<T>, options: TimeoutOptions): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${options.timeout}ms`));
      }, options.timeout);

      const abortController = new AbortController();

      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          abortController.abort();
        });
      }

      operation()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static timers = new Map<string, number>();

  static startTimer(label: string): void {
    this.timers.set(label, performance.now());
  }

  static endTimer(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      throw new Error(`Timer '${label}' was not started`);
    }

    const duration = performance.now() - startTime;
    this.timers.delete(label);
    return duration;
  }

  static measureAsync<T>(label: string, operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    this.startTimer(label);
    return operation()
      .then(result => ({
        result,
        duration: this.endTimer(label)
      }))
      .catch(error => {
        this.endTimer(label);
        throw error;
      });
  }
}

/**
 * Memory usage monitoring
 */
export class MemoryMonitor {
  static getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  static getMemoryUsageMB(): Record<string, number> {
    const usage = this.getMemoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024)
    };
  }

  static isMemoryPressure(): boolean {
    const usage = this.getMemoryUsage();
    const heapUsedRatio = usage.heapUsed / usage.heapTotal;
    return heapUsedRatio > 0.8; // 80% heap usage threshold
  }
}

/**
 * CPU usage monitoring
 */
export class CPUMonitor {
  private static lastCpuUsage = process.cpuUsage();
  private static lastCheck = Date.now();

  static getCPUUsage(): { user: number; system: number; percentage: number } {
    const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
    const currentTime = Date.now();
    const timeDiff = (currentTime - this.lastCheck) / 1000; // Convert to seconds

    const userTime = currentCpuUsage.user / 1000000; // Convert to seconds
    const systemTime = currentCpuUsage.system / 1000000; // Convert to seconds
    const totalTime = userTime + systemTime;

    const percentage = Math.min(100, (totalTime / timeDiff) * 100);

    this.lastCpuUsage = process.cpuUsage();
    this.lastCheck = currentTime;

    return {
      user: userTime,
      system: systemTime,
      percentage: Math.round(percentage * 100) / 100
    };
  }
}

/**
 * Default configurations for performance utilities
 */
export const DEFAULT_CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  monitoringPeriod: 10000 // 10 seconds
};

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  jitter: true
};

export const DEFAULT_TIMEOUT_OPTIONS: TimeoutOptions = {
  timeout: 30000 // 30 seconds
};
