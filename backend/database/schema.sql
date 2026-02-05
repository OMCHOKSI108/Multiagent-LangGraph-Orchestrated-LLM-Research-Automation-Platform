-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    key_value VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Research History / Job Queue Table
CREATE TABLE IF NOT EXISTS research_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    task VARCHAR(500),
    status VARCHAR(50) DEFAULT 'queued', -- 'queued', 'processing', 'completed', 'failed'
    result_json JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat History Table (Context Management)
CREATE TABLE IF NOT EXISTS chat_history (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL, -- UUID for the conversation window
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    message TEXT NOT NULL,
    context_embedding VECTOR(768), -- Optional: if using pgvector later
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

