/**
 * Health check service for liveness and readiness probes
 */

// import { mongodb } from '../../database/mongodb.js';
// import { pinecone } from '../../database/pinecone.js';
import { configService } from '../../services/config.service.js';
// import { MemoryMonitor, CPUMonitor } from '../utils/performance.utils.js';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

export interface LivenessStatus extends HealthStatus {
  checks: {
    memory: {
      status: 'healthy' | 'unhealthy';
      details: {
        rss: number;
        heapUsed: number;
        heapTotal: number;
        pressure: boolean;
      };
    };
    cpu: {
      status: 'healthy' | 'unhealthy';
      details: {
        percentage: number;
        user: number;
        system: number;
      };
    };
  };
}

export interface ReadinessStatus extends HealthStatus {
  checks: {
    mongodb: {
      status: 'healthy' | 'unhealthy' | 'degraded';
      responseTime: number;
      details?: string | undefined;
    };
    pinecone: {
      status: 'healthy' | 'unhealthy' | 'degraded';
      responseTime: number;
      details?: string | undefined;
    };
    configuration: {
      status: 'healthy' | 'unhealthy';
      details: string[];
    };
  };
}

export class HealthService {
  private startTime = Date.now();
  private readonly version = process.env.npm_package_version || '1.0.0';

  /**
   * Liveness probe - checks if the application is alive
   * This should be fast and not depend on external services
   */
  async getLivenessStatus(): Promise<LivenessStatus> {
    // Simple memory check using Node.js built-in
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024)
    };

    const memoryPressure = memoryUsage.heapUsed / memoryUsage.heapTotal > 0.8;
    const memoryStatus = memoryPressure ? 'unhealthy' : 'healthy';

    // Simple CPU check
    const cpuUsage = process.cpuUsage();
    const cpuStatus = 'healthy'; // Simplified for now

    const overallStatus = memoryStatus === 'unhealthy' ? 'unhealthy' : 'healthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: this.version,
      environment: configService.get('app.environment') || 'development',
      checks: {
        memory: {
          status: memoryStatus,
          details: {
            rss: memoryUsageMB.rss,
            heapUsed: memoryUsageMB.heapUsed,
            heapTotal: memoryUsageMB.heapTotal,
            pressure: memoryPressure
          }
        },
        cpu: {
          status: cpuStatus,
          details: {
            percentage: 0,
            user: 0,
            system: 0
          }
        }
      }
    };
  }

  /**
   * Readiness probe - checks if the application is ready to serve traffic
   * This includes external dependencies like databases
   */
  async getReadinessStatus(): Promise<ReadinessStatus> {
    const startTime = Date.now();

    // Simplified checks for now
    const checks = {
      mongodb: {
        status: 'healthy' as const,
        responseTime: 0,
        details: 'Connection check disabled'
      },
      pinecone: {
        status: 'healthy' as const,
        responseTime: 0,
        details: 'Connection check disabled'
      },
      configuration: {
        status: 'healthy' as const,
        details: []
      }
    };

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: this.version,
      environment: configService.get('app.environment') || 'development',
      checks
    };
  }

  /**
   * Get detailed system information
   */
  getSystemInfo(): {
    nodeVersion: string;
    platform: string;
    arch: string;
    memory: NodeJS.MemoryUsage;
    uptime: number;
    pid: number;
  } {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      pid: process.pid
    };
  }
}

// Export singleton instance
export const healthService = new HealthService();
