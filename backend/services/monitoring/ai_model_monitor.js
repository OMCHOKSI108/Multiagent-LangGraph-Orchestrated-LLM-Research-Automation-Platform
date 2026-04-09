/**
 * AI Model Monitor
 * Tracks active LLM provider, fallback events, and model performance
 */
class AIModelMonitor {
    constructor() {
        this.currentProvider = 'unknown';
        this.fallbackEvents = [];
        this.modelStats = new Map();
        this.cache = new Map();
        this.cacheTimeout = 10000; // 10 seconds
    }

    /**
     * Update the active provider
     * @param {string} provider - The current active provider
     * @param {string} model - The specific model being used
     */
    setActiveProvider(provider, model = null) {
        this.currentProvider = provider;
        this.lastProviderChange = new Date();

        // Track model usage
        const key = `${provider}:${model || 'default'}`;
        if (!this.modelStats.has(key)) {
            this.modelStats.set(key, {
                provider,
                model: model || 'default',
                usage_count: 0,
                last_used: null,
                errors: 0
            });
        }

        const stats = this.modelStats.get(key);
        stats.usage_count++;
        stats.last_used = new Date();
    }

    /**
     * Record a fallback event
     * @param {string} fromProvider - Provider that failed
     * @param {string} toProvider - Provider that took over
     * @param {string} reason - Reason for fallback
     */
    recordFallback(fromProvider, toProvider, reason) {
        this.fallbackEvents.push({
            timestamp: new Date(),
            from_provider: fromProvider,
            to_provider: toProvider,
            reason: reason
        });

        // Keep only last 20 fallback events
        if (this.fallbackEvents.length > 20) {
            this.fallbackEvents = this.fallbackEvents.slice(-20);
        }

        // Track error for the failed provider
        const key = `${fromProvider}:default`;
        if (this.modelStats.has(key)) {
            this.modelStats.get(key).errors++;
        }
    }

    /**
     * Get AI model metrics
     */
    async getAIModelMetrics() {
        const now = Date.now();
        const cacheKey = 'ai_model_metrics';

        // Return cached data if still fresh
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (now - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        const metrics = {
            active_provider: this.currentProvider,
            last_provider_change: this.lastProviderChange,
            fallback_events: this.fallbackEvents.slice(-5), // Last 5 events
            model_stats: Array.from(this.modelStats.values()),
            timestamp: new Date().toISOString()
        };

        this.cache.set(cacheKey, { data: metrics, timestamp: now });
        return metrics;
    }

    /**
     * Get provider health status
     */
    getProviderHealth() {
        const providers = ['openrouter', 'groq', 'gemini', 'huggingface', 'ollama'];
        const health = {};

        providers.forEach(provider => {
            const models = Array.from(this.modelStats.values())
                .filter(stat => stat.provider === provider);

            const totalUsage = models.reduce((sum, model) => sum + model.usage_count, 0);
            const totalErrors = models.reduce((sum, model) => sum + model.errors, 0);

            health[provider] = {
                usage_count: totalUsage,
                error_count: totalErrors,
                success_rate: totalUsage > 0 ?
                    Math.round(((totalUsage - totalErrors) / totalUsage) * 100 * 100) / 100 : 0,
                models: models.length,
                last_used: models.length > 0 ?
                    Math.max(...models.map(m => m.last_used?.getTime() || 0)) : null
            };
        });

        return health;
    }

    /**
     * Check if a provider is experiencing issues
     * @param {string} provider - Provider to check
     */
    isProviderUnhealthy(provider) {
        const models = Array.from(this.modelStats.values())
            .filter(stat => stat.provider === provider);

        if (models.length === 0) return false;

        const totalUsage = models.reduce((sum, model) => sum + model.usage_count, 0);
        const totalErrors = models.reduce((sum, model) => sum + model.errors, 0);

        // Consider unhealthy if error rate > 50% and at least 5 requests
        return totalUsage >= 5 && (totalErrors / totalUsage) > 0.5;
    }

    /**
     * Get recent fallback summary
     */
    getFallbackSummary(hours = 24) {
        const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));

        const recentFallbacks = this.fallbackEvents.filter(
            event => event.timestamp > cutoff
        );

        const summary = {};
        recentFallbacks.forEach(event => {
            const key = `${event.from_provider}->${event.to_provider}`;
            summary[key] = (summary[key] || 0) + 1;
        });

        return {
            total_fallbacks: recentFallbacks.length,
            by_transition: summary,
            time_window_hours: hours
        };
    }
}

module.exports = AIModelMonitor;