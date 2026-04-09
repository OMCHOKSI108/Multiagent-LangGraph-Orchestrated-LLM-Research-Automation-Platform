-- 012_add_monitoring_tables.sql
-- Add tables for monitoring system and enhanced API key management

-- ===================================
-- 1. Monitoring Metrics Table
-- ===================================
CREATE TABLE IF NOT EXISTS monitoring_metrics (
    id SERIAL PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL, -- 'api_usage', 'system_health', etc.
    provider VARCHAR(50), -- For API metrics, the provider name
    data JSONB NOT NULL, -- Flexible JSON data storage
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(metric_type, provider) -- Ensure one record per metric type/provider
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_type_provider
ON monitoring_metrics(metric_type, provider);

CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_created_at
ON monitoring_metrics(created_at DESC);

-- ===================================
-- 2. Enhanced API Keys Table (with encryption support)
-- ===================================
-- First, check if we need to modify the existing api_keys table
DO $$
BEGIN
    -- Add new columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'api_keys' AND column_name = 'provider') THEN
        ALTER TABLE api_keys ADD COLUMN provider VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'api_keys' AND column_name = 'encrypted_key') THEN
        ALTER TABLE api_keys ADD COLUMN encrypted_key TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'api_keys' AND column_name = 'key_hash') THEN
        ALTER TABLE api_keys ADD COLUMN key_hash VARCHAR(128);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'api_keys' AND column_name = 'last_used') THEN
        ALTER TABLE api_keys ADD COLUMN last_used TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'api_keys' AND column_name = 'usage_count') THEN
        ALTER TABLE api_keys ADD COLUMN usage_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'api_keys' AND column_name = 'rate_limit_remaining') THEN
        ALTER TABLE api_keys ADD COLUMN rate_limit_remaining INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'api_keys' AND column_name = 'rate_limit_reset') THEN
        ALTER TABLE api_keys ADD COLUMN rate_limit_reset TIMESTAMP;
    END IF;
END $$;

-- Update existing records to have provider based on key_value patterns
UPDATE api_keys
SET provider = CASE
    WHEN key_value LIKE 'sk-or-v1%' THEN 'openrouter'
    WHEN key_value LIKE 'gsk_%' THEN 'groq'
    WHEN key_value LIKE 'AIza%' THEN 'gemini'
    WHEN key_value LIKE 'hf_%' THEN 'huggingface'
    ELSE 'unknown'
END
WHERE provider IS NULL;

-- Create indexes for the enhanced api_keys table
CREATE INDEX IF NOT EXISTS idx_api_keys_provider
ON api_keys(provider);

CREATE INDEX IF NOT EXISTS idx_api_keys_is_active
ON api_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_api_keys_last_used
ON api_keys(last_used DESC);

-- ===================================
-- 3. System Alerts Table
-- ===================================
CREATE TABLE IF NOT EXISTS system_alerts (
    id SERIAL PRIMARY KEY,
    alert_id VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'system', 'api', 'database'
    severity VARCHAR(20) NOT NULL, -- 'critical', 'warning', 'info'
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    value DECIMAL,
    threshold DECIMAL,
    provider VARCHAR(50), -- For API alerts
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP,
    acknowledged_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- Indexes for alerts
CREATE INDEX IF NOT EXISTS idx_system_alerts_type_severity
ON system_alerts(type, severity);

CREATE INDEX IF NOT EXISTS idx_system_alerts_acknowledged
ON system_alerts(acknowledged);

CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at
ON system_alerts(created_at DESC);

-- ===================================
-- 4. API Request Logs Table (for detailed tracking)
-- ===================================
CREATE TABLE IF NOT EXISTS api_request_logs (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    endpoint VARCHAR(200),
    method VARCHAR(10),
    request_size INTEGER,
    response_size INTEGER,
    duration_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    tokens_used INTEGER,
    cost_usd DECIMAL(10,6),
    api_key_id INTEGER REFERENCES api_keys(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for request logs (partitioning could be added later for large scale)
CREATE INDEX IF NOT EXISTS idx_api_request_logs_provider_created_at
ON api_request_logs(provider, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_request_logs_api_key_id
ON api_request_logs(api_key_id);

-- ===================================
-- 5. Service Health Checks Table
-- ===================================
CREATE TABLE IF NOT EXISTS service_health_checks (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'healthy', 'unhealthy', 'unknown'
    response_time_ms INTEGER,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    error_message TEXT,
    checked_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for health checks
CREATE INDEX IF NOT EXISTS idx_service_health_checks_service_name
ON service_health_checks(service_name);

CREATE INDEX IF NOT EXISTS idx_service_health_checks_checked_at
ON service_health_checks(checked_at DESC);

-- ===================================
-- 6. Insert default monitoring configuration
-- ===================================
INSERT INTO monitoring_metrics (metric_type, provider, data)
VALUES
    ('config', 'alert_thresholds', '{
        "cpu_usage": 85,
        "memory_usage": 90,
        "disk_usage": 95,
        "api_error_rate": 50,
        "db_connections": 100
    }'::jsonb)
ON CONFLICT (metric_type, provider) DO NOTHING;