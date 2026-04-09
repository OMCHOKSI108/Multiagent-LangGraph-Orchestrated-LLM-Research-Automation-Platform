const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

/**
 * System Metrics Collector
 * Collects CPU, RAM, Disk, and Uptime metrics
 */
class SystemMonitor {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5000; // 5 seconds
    }

    async getSystemMetrics() {
        const now = Date.now();
        const cacheKey = 'system_metrics';

        // Return cached data if still fresh
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (now - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const metrics = {
                cpu: this.getCpuUsage(),
                memory: this.getMemoryUsage(),
                disk: await this.getDiskUsage(),
                uptime: os.uptime(),
                timestamp: new Date().toISOString()
            };

            this.cache.set(cacheKey, { data: metrics, timestamp: now });
            return metrics;
        } catch (error) {
            console.error('[SystemMonitor] Error collecting metrics:', error);
            return {
                cpu: { usage: 0 },
                memory: { used: 0, total: 0, percentage: 0 },
                disk: { used: 0, total: 0, percentage: 0 },
                uptime: os.uptime(),
                error: error.message
            };
        }
    }

    getCpuUsage() {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;

        cpus.forEach(cpu => {
            for (let type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });

        const idle = totalIdle / cpus.length;
        const total = totalTick / cpus.length;
        const usage = 100 - ~~(100 * idle / total);

        return { usage: Math.max(0, Math.min(100, usage)) };
    }

    getMemoryUsage() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const percentage = (usedMem / totalMem) * 100;

        return {
            used: Math.round(usedMem / 1024 / 1024), // MB
            total: Math.round(totalMem / 1024 / 1024), // MB
            percentage: Math.round(percentage * 100) / 100
        };
    }

    async getDiskUsage() {
        try {
            // Use df command to get disk usage
            const { stdout } = await execAsync('df -BG / | tail -1');
            const parts = stdout.trim().split(/\s+/);
            const usedGB = parseInt(parts[2].replace('G', ''));
            const totalGB = parseInt(parts[1].replace('G', ''));

            return {
                used: usedGB,
                total: totalGB,
                percentage: Math.round((usedGB / totalGB) * 100 * 100) / 100
            };
        } catch (error) {
            // Fallback for Windows or if df fails
            return {
                used: 0,
                total: 0,
                percentage: 0,
                error: 'Disk usage unavailable'
            };
        }
    }
}

module.exports = SystemMonitor;