const SystemMonitor = require('./system_monitor');
const ApiUsageTracker = require('./api_usage_tracker');
const DatabaseMonitor = require('./db_monitor');
const DockerMonitor = require('./docker_monitor');
const AIModelMonitor = require('./ai_model_monitor');
const AlertsManager = require('./alert_manager');

/**
 * Metrics Collector
 * Main orchestrator for all monitoring components
 */
class MetricsCollector {
    constructor(db) {
        this.db = db;
        this.systemMonitor = new SystemMonitor();
        this.apiUsageTracker = new ApiUsageTracker(db);
        this.databaseMonitor = new DatabaseMonitor(db);
        this.dockerMonitor = new DockerMonitor();
        this.aiModelMonitor = new AIModelMonitor();
        this.alertsManager = new AlertsManager();

        // Start background alert checking
        this.startAlertChecking();
    }

    /**
     * Get all monitoring metrics
     */
    async getAllMetrics() {
        try {
            const [
                systemMetrics,
                apiUsageMetrics,
                databaseMetrics,
                serviceMetrics,
                aiModelMetrics,
                alertsSummary
            ] = await Promise.all([
                this.systemMonitor.getSystemMetrics(),
                this.apiUsageTracker.getApiUsageMetrics(),
                this.databaseMonitor.getDatabaseMetrics(),
                this.dockerMonitor.getServiceMetrics(),
                this.aiModelMonitor.getAIModelMetrics(),
                this.alertsManager.getAlertsSummary()
            ]);

            return {
                system: systemMetrics,
                api_usage: apiUsageMetrics,
                database: databaseMetrics,
                services: serviceMetrics,
                ai_model: aiModelMetrics,
                alerts: alertsSummary,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('[MetricsCollector] Error collecting all metrics:', error);
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get system metrics only
     */
    async getSystemMetrics() {
        return await this.systemMonitor.getSystemMetrics();
    }

    /**
     * Get API usage metrics only
     */
    async getApiUsageMetrics() {
        return await this.apiUsageTracker.getApiUsageMetrics();
    }

    /**
     * Get database metrics only
     */
    async getDatabaseMetrics() {
        return await this.databaseMonitor.getDatabaseMetrics();
    }

    /**
     * Get service metrics only
     */
    async getServiceMetrics() {
        return await this.dockerMonitor.getServiceMetrics();
    }

    /**
     * Get AI model metrics only
     */
    async getAIModelMetrics() {
        return await this.aiModelMonitor.getAIModelMetrics();
    }

    /**
     * Get alerts summary
     */
    getAlertsSummary() {
        return this.alertsManager.getAlertsSummary();
    }

    /**
     * Track API usage
     */
    async trackApiCall(provider, usage = {}, success = true, error = null) {
        return await this.apiUsageTracker.trackCall(provider, usage, success, error);
    }

    /**
     * Update AI model provider
     */
    setActiveProvider(provider, model = null) {
        this.aiModelMonitor.setActiveProvider(provider, model);
    }

    /**
     * Record AI model fallback
     */
    recordFallback(fromProvider, toProvider, reason) {
        this.aiModelMonitor.recordFallback(fromProvider, toProvider, reason);
    }

    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId) {
        return this.alertsManager.acknowledgeAlert(alertId);
    }

    /**
     * Start background alert checking
     */
    startAlertChecking() {
        // Check alerts every 30 seconds
        setInterval(async () => {
            try {
                const [systemMetrics, apiMetrics, dbMetrics] = await Promise.all([
                    this.systemMonitor.getSystemMetrics(),
                    this.apiUsageTracker.getApiUsageMetrics(),
                    this.databaseMonitor.getDatabaseMetrics()
                ]);

                await this.alertsManager.checkThresholds(systemMetrics, apiMetrics, dbMetrics);
                this.alertsManager.cleanupOldAlerts();
            } catch (error) {
                console.error('[MetricsCollector] Error in alert checking:', error);
            }
        }, 30000);
    }

    /**
     * Get alert thresholds
     */
    getAlertThresholds() {
        return this.alertsManager.getThresholds();
    }

    /**
     * Update alert thresholds
     */
    updateAlertThresholds(newThresholds) {
        this.alertsManager.updateThresholds(newThresholds);
    }

    /**
     * Get database table statistics
     */
    async getDatabaseTableStats() {
        return await this.databaseMonitor.getTableStats();
    }

    /**
     * Get Docker system info
     */
    async getDockerSystemInfo() {
        return await this.dockerMonitor.getDockerSystemInfo();
    }
}

module.exports = MetricsCollector;