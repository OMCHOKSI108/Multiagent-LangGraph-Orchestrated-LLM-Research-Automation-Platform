/**
 * Database Monitor
 * Monitors PostgreSQL database health and performance
 */
class DatabaseMonitor {
    constructor(db) {
        this.db = db;
        this.cache = new Map();
        this.cacheTimeout = 10000; // 10 seconds
    }

    async getDatabaseMetrics() {
        const now = Date.now();
        const cacheKey = 'db_metrics';

        // Return cached data if still fresh
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (now - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const metrics = await this.collectDatabaseMetrics();
            this.cache.set(cacheKey, { data: metrics, timestamp: now });
            return metrics;
        } catch (error) {
            console.error('[DatabaseMonitor] Error collecting metrics:', error);
            return {
                size: { total: 0, formatted: '0 MB' },
                connections: { active: 0, total: 0 },
                performance: { query_time: 0 },
                error: error.message
            };
        }
    }

    async collectDatabaseMetrics() {
        const metrics = {
            size: await this.getDatabaseSize(),
            connections: await this.getConnectionStats(),
            performance: await this.getPerformanceMetrics(),
            timestamp: new Date().toISOString()
        };

        return metrics;
    }

    async getDatabaseSize() {
        try {
            const query = `
                SELECT
                    pg_size_pretty(pg_database_size(current_database())) as size,
                    pg_database_size(current_database()) as size_bytes
            `;
            const result = await this.db.query(query);
            const size = result.rows[0];

            return {
                total: size.size_bytes,
                formatted: size.size
            };
        } catch (error) {
            return {
                total: 0,
                formatted: 'Unknown',
                error: error.message
            };
        }
    }

    async getConnectionStats() {
        try {
            // Get active connections
            const activeQuery = `
                SELECT count(*) as active_connections
                FROM pg_stat_activity
                WHERE state = 'active'
            `;
            const activeResult = await this.db.query(activeQuery);

            // Get total connections
            const totalQuery = `
                SELECT count(*) as total_connections
                FROM pg_stat_activity
            `;
            const totalResult = await this.db.query(totalQuery);

            return {
                active: parseInt(activeResult.rows[0].active_connections),
                total: parseInt(totalResult.rows[0].total_connections)
            };
        } catch (error) {
            return {
                active: 0,
                total: 0,
                error: error.message
            };
        }
    }

    async getPerformanceMetrics() {
        try {
            // Get average query execution time (last 5 minutes)
            const query = `
                SELECT
                    avg(extract(epoch from (now() - query_start))) * 1000 as avg_query_time_ms
                FROM pg_stat_activity
                WHERE state = 'active'
                AND query_start IS NOT NULL
                AND extract(epoch from (now() - query_start)) < 300
            `;
            const result = await this.db.query(query);
            const avgTime = result.rows[0].avg_query_time_ms;

            return {
                query_time: avgTime ? Math.round(avgTime * 100) / 100 : 0
            };
        } catch (error) {
            return {
                query_time: 0,
                error: error.message
            };
        }
    }

    /**
     * Get table statistics
     */
    async getTableStats() {
        try {
            const query = `
                SELECT
                    schemaname,
                    tablename,
                    n_tup_ins as inserts,
                    n_tup_upd as updates,
                    n_tup_del as deletes,
                    n_live_tup as live_rows,
                    n_dead_tup as dead_rows,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
                FROM pg_stat_user_tables
                ORDER BY n_live_tup DESC
                LIMIT 20
            `;
            const result = await this.db.query(query);
            return result.rows;
        } catch (error) {
            console.error('[DatabaseMonitor] Error getting table stats:', error);
            return [];
        }
    }
}

module.exports = DatabaseMonitor;