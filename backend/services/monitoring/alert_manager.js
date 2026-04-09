/**
 * Alerts Manager
 * Manages system alerts and notifications
 */
class AlertsManager {
    constructor() {
        this.alerts = [];
        this.thresholds = {
            cpu_usage: 85,
            memory_usage: 90,
            disk_usage: 95,
            api_error_rate: 50,
            db_connections: 100
        };
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
    }

    /**
     * Check system metrics against thresholds and generate alerts
     * @param {object} systemMetrics - System metrics from SystemMonitor
     * @param {object} apiMetrics - API usage metrics from ApiUsageTracker
     * @param {object} dbMetrics - Database metrics from DatabaseMonitor
     */
    async checkThresholds(systemMetrics, apiMetrics, dbMetrics) {
        const newAlerts = [];

        // CPU usage alert
        if (systemMetrics.cpu?.usage > this.thresholds.cpu_usage) {
            newAlerts.push({
                id: `cpu_${Date.now()}`,
                type: 'system',
                severity: 'warning',
                title: 'High CPU Usage',
                message: `CPU usage is ${systemMetrics.cpu.usage}% (threshold: ${this.thresholds.cpu_usage}%)`,
                value: systemMetrics.cpu.usage,
                threshold: this.thresholds.cpu_usage,
                timestamp: new Date(),
                acknowledged: false
            });
        }

        // Memory usage alert
        if (systemMetrics.memory?.percentage > this.thresholds.memory_usage) {
            newAlerts.push({
                id: `memory_${Date.now()}`,
                type: 'system',
                severity: 'critical',
                title: 'High Memory Usage',
                message: `Memory usage is ${systemMetrics.memory.percentage}% (threshold: ${this.thresholds.memory_usage}%)`,
                value: systemMetrics.memory.percentage,
                threshold: this.thresholds.memory_usage,
                timestamp: new Date(),
                acknowledged: false
            });
        }

        // Disk usage alert
        if (systemMetrics.disk?.percentage > this.thresholds.disk_usage) {
            newAlerts.push({
                id: `disk_${Date.now()}`,
                type: 'system',
                severity: 'critical',
                title: 'High Disk Usage',
                message: `Disk usage is ${systemMetrics.disk.percentage}% (threshold: ${this.thresholds.disk_usage}%)`,
                value: systemMetrics.disk.percentage,
                threshold: this.thresholds.disk_usage,
                timestamp: new Date(),
                acknowledged: false
            });
        }

        // API error rate alerts
        Object.entries(apiMetrics).forEach(([provider, metrics]) => {
            if (metrics.error_count && metrics.request_count) {
                const errorRate = (metrics.error_count / metrics.request_count) * 100;
                if (errorRate > this.thresholds.api_error_rate) {
                    newAlerts.push({
                        id: `api_${provider}_${Date.now()}`,
                        type: 'api',
                        severity: 'warning',
                        title: `High API Error Rate - ${provider}`,
                        message: `Error rate for ${provider} is ${errorRate.toFixed(1)}% (threshold: ${this.thresholds.api_error_rate}%)`,
                        value: errorRate,
                        threshold: this.thresholds.api_error_rate,
                        provider,
                        timestamp: new Date(),
                        acknowledged: false
                    });
                }
            }
        });

        // Database connection alert
        if (dbMetrics.connections?.total > this.thresholds.db_connections) {
            newAlerts.push({
                id: `db_connections_${Date.now()}`,
                type: 'database',
                severity: 'warning',
                title: 'High Database Connections',
                message: `Database has ${dbMetrics.connections.total} connections (threshold: ${this.thresholds.db_connections})`,
                value: dbMetrics.connections.total,
                threshold: this.thresholds.db_connections,
                timestamp: new Date(),
                acknowledged: false
            });
        }

        // Add new alerts to the list
        this.alerts.unshift(...newAlerts);

        // Keep only last 100 alerts
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(0, 100);
        }

        return newAlerts;
    }

    /**
     * Get all active alerts
     */
    getActiveAlerts() {
        return this.alerts.filter(alert => !alert.acknowledged);
    }

    /**
     * Get alerts summary
     */
    getAlertsSummary() {
        const now = Date.now();
        const cacheKey = 'alerts_summary';

        // Return cached data if still fresh
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (now - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        const active = this.getActiveAlerts();
        const last24h = this.alerts.filter(alert =>
            (now - alert.timestamp.getTime()) < (24 * 60 * 60 * 1000)
        );

        const summary = {
            total_active: active.length,
            by_severity: {
                critical: active.filter(a => a.severity === 'critical').length,
                warning: active.filter(a => a.severity === 'warning').length,
                info: active.filter(a => a.severity === 'info').length
            },
            by_type: {
                system: active.filter(a => a.type === 'system').length,
                api: active.filter(a => a.type === 'api').length,
                database: active.filter(a => a.type === 'database').length
            },
            last_24h_count: last24h.length,
            recent_alerts: active.slice(0, 5), // Last 5 active alerts
            timestamp: new Date().toISOString()
        };

        this.cache.set(cacheKey, { data: summary, timestamp: now });
        return summary;
    }

    /**
     * Acknowledge an alert
     * @param {string} alertId - ID of the alert to acknowledge
     */
    acknowledgeAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledged_at = new Date();
            return true;
        }
        return false;
    }

    /**
     * Clear old acknowledged alerts (older than 7 days)
     */
    cleanupOldAlerts() {
        const cutoff = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
        this.alerts = this.alerts.filter(alert =>
            !alert.acknowledged || alert.timestamp > cutoff
        );
    }

    /**
     * Update alert thresholds
     * @param {object} newThresholds - New threshold values
     */
    updateThresholds(newThresholds) {
        Object.assign(this.thresholds, newThresholds);
    }

    /**
     * Get current thresholds
     */
    getThresholds() {
        return { ...this.thresholds };
    }
}

module.exports = AlertsManager;