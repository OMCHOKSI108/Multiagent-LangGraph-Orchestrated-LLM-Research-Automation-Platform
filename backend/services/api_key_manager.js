const crypto = require('crypto');
const db = require('../config/db');

/**
 * API Key Manager
 * Handles encrypted storage, dynamic switching, and management of API keys
 */
class ApiKeyManager {
    constructor() {
        // Use a fixed key for encryption (in production, use KMS or environment variable)
        this.encryptionKey = process.env.API_KEY_ENCRYPTION_KEY ||
            'your-32-character-encryption-key-here';
        this.algorithm = 'aes-256-gcm';
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 minutes
    }

    /**
     * Encrypt an API key
     * @param {string} plainKey - The plain text API key
     * @returns {string} - Encrypted key as hex string
     */
    encryptKey(plainKey) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);

        let encrypted = cipher.update(plainKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        // Return format: iv:authTag:encrypted
        return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    }

    /**
     * Decrypt an API key
     * @param {string} encryptedKey - The encrypted key string
     * @returns {string} - Decrypted plain text key
     */
    decryptKey(encryptedKey) {
        try {
            const parts = encryptedKey.split(':');
            if (parts.length !== 3) {
                throw new Error('Invalid encrypted key format');
            }

            const iv = Buffer.from(parts[0], 'hex');
            const authTag = Buffer.from(parts[1], 'hex');
            const encrypted = parts[2];

            const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('[ApiKeyManager] Decryption failed:', error);
            throw new Error('Failed to decrypt API key');
        }
    }

    /**
     * Create a hash for key identification (without storing the actual key)
     * @param {string} key - The API key
     * @returns {string} - SHA-256 hash
     */
    createKeyHash(key) {
        return crypto.createHash('sha256').update(key).digest('hex');
    }

    /**
     * Add a new API key
     * @param {number} userId - User ID
     * @param {string} provider - Provider name (openrouter, groq, etc.)
     * @param {string} keyName - Display name for the key
     * @param {string} apiKey - The actual API key
     */
    async addApiKey(userId, provider, keyName, apiKey) {
        const encryptedKey = this.encryptKey(apiKey);
        const keyHash = this.createKeyHash(apiKey);

        const query = `
            INSERT INTO api_keys (
                user_id, provider, name, encrypted_key, key_hash,
                is_active, created_at
            )
            VALUES ($1, $2, $3, $4, $5, TRUE, NOW())
            RETURNING id, name, provider, is_active, created_at
        `;

        const result = await db.query(query, [userId, provider, keyName, encryptedKey, keyHash]);

        // Clear cache for this provider
        this.clearProviderCache(provider);

        return result.rows[0];
    }

    /**
     * Get active API key for a provider
     * @param {string} provider - Provider name
     * @returns {string|null} - Decrypted API key or null if not found
     */
    async getActiveApiKey(provider) {
        const now = Date.now();
        const cacheKey = `active_key_${provider}`;

        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (now - cached.timestamp < this.cacheTimeout) {
                return cached.key;
            }
        }

        try {
            const query = `
                SELECT encrypted_key, id
                FROM api_keys
                WHERE provider = $1 AND is_active = TRUE
                ORDER BY last_used DESC NULLS LAST, created_at DESC
                LIMIT 1
            `;

            const result = await db.query(query, [provider]);

            if (result.rows.length === 0) {
                this.cache.set(cacheKey, { key: null, timestamp: now });
                return null;
            }

            const decryptedKey = this.decryptKey(result.rows[0].encrypted_key);
            const keyId = result.rows[0].id;

            // Update last_used timestamp
            await db.query(
                'UPDATE api_keys SET last_used = NOW(), usage_count = usage_count + 1 WHERE id = $1',
                [keyId]
            );

            // Cache the result
            this.cache.set(cacheKey, { key: decryptedKey, timestamp: now });

            return decryptedKey;
        } catch (error) {
            console.error(`[ApiKeyManager] Error getting active key for ${provider}:`, error);
            return null;
        }
    }

    /**
     * Get all API keys for admin management (without decrypting)
     */
    async getAllApiKeys() {
        const query = `
            SELECT
                id, user_id, provider, name, is_active, created_at,
                last_used, usage_count, rate_limit_remaining, rate_limit_reset,
                u.email as user_email
            FROM api_keys ak
            LEFT JOIN users u ON ak.user_id = u.id
            ORDER BY provider, created_at DESC
        `;

        const result = await db.query(query);
        return result.rows;
    }

    /**
     * Update API key status
     * @param {number} keyId - Key ID
     * @param {boolean} isActive - New active status
     */
    async updateApiKeyStatus(keyId, isActive) {
        const result = await db.query(
            'UPDATE api_keys SET is_active = $1 WHERE id = $2 RETURNING provider',
            [isActive, keyId]
        );

        if (result.rows.length > 0) {
            // Clear cache for this provider
            this.clearProviderCache(result.rows[0].provider);
        }

        return result.rows.length > 0;
    }

    /**
     * Delete an API key
     * @param {number} keyId - Key ID
     */
    async deleteApiKey(keyId) {
        const result = await db.query(
            'DELETE FROM api_keys WHERE id = $1 RETURNING provider',
            [keyId]
        );

        if (result.rows.length > 0) {
            // Clear cache for this provider
            this.clearProviderCache(result.rows[0].provider);
        }

        return result.rows.length > 0;
    }

    /**
     * Update rate limit information for a key
     * @param {number} keyId - Key ID
     * @param {number} remaining - Remaining requests
     * @param {Date} resetTime - Reset timestamp
     */
    async updateRateLimit(keyId, remaining, resetTime) {
        await db.query(
            'UPDATE api_keys SET rate_limit_remaining = $1, rate_limit_reset = $2 WHERE id = $3',
            [remaining, resetTime, keyId]
        );
    }

    /**
     * Get API keys by provider
     * @param {string} provider - Provider name
     */
    async getApiKeysByProvider(provider) {
        const query = `
            SELECT id, name, is_active, created_at, last_used, usage_count
            FROM api_keys
            WHERE provider = $1
            ORDER BY is_active DESC, last_used DESC NULLS LAST
        `;

        const result = await db.query(query, [provider]);
        return result.rows;
    }

    /**
     * Clear cache for a specific provider
     * @param {string} provider - Provider name
     */
    clearProviderCache(provider) {
        const cacheKey = `active_key_${provider}`;
        this.cache.delete(cacheKey);
    }

    /**
     * Get API key statistics
     */
    async getApiKeyStats() {
        const query = `
            SELECT
                provider,
                COUNT(*) as total_keys,
                COUNT(CASE WHEN is_active THEN 1 END) as active_keys,
                SUM(usage_count) as total_usage,
                MAX(last_used) as last_used
            FROM api_keys
            GROUP BY provider
            ORDER BY provider
        `;

        const result = await db.query(query);
        return result.rows;
    }

    /**
     * Rotate API keys for a provider (deactivate old, activate new)
     * @param {string} provider - Provider name
     * @param {string} newKeyName - Name for the new key
     * @param {string} newApiKey - The new API key
     * @param {number} userId - User ID creating the new key
     */
    async rotateApiKey(provider, newKeyName, newApiKey, userId) {
        // Start transaction
        const client = await db.connect();

        try {
            await client.query('BEGIN');

            // Deactivate all existing keys for this provider
            await client.query(
                'UPDATE api_keys SET is_active = FALSE WHERE provider = $1',
                [provider]
            );

            // Add the new key
            const encryptedKey = this.encryptKey(newApiKey);
            const keyHash = this.createKeyHash(newApiKey);

            const insertQuery = `
                INSERT INTO api_keys (
                    user_id, provider, name, encrypted_key, key_hash, is_active
                )
                VALUES ($1, $2, $3, $4, $5, TRUE)
                RETURNING id, name, provider
            `;

            const result = await client.query(insertQuery,
                [userId, provider, newKeyName, encryptedKey, keyHash]
            );

            await client.query('COMMIT');

            // Clear cache
            this.clearProviderCache(provider);

            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = ApiKeyManager;