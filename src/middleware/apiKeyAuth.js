const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

// Database connection configuration
const dbConfig = {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '123',
    database: 'db_waapi'
};

async function validateApiKey(req, res, next) {
    try {
        // Support both Authorization and X-API-Key headers
        const authHeader = req.headers.authorization;
        const apiKeyHeader = req.headers['x-api-key'];
        
        if (!authHeader && !apiKeyHeader) {
            return res.status(401).json({
                success: false,
                error: 'API key required',
                message: 'Authorization header or X-API-Key header with API key is required'
            });
        }

        // Extract API key from header (format: "Bearer wapi_xxxxx" or "wapi_xxxxx" or direct key)
        let apiKey;
        if (authHeader) {
            apiKey = authHeader.startsWith('Bearer ') 
                ? authHeader.substring(7) 
                : authHeader;
        } else {
            apiKey = apiKeyHeader;
        }

        if (!apiKey || (!apiKey.startsWith('wapi_') && !apiKey.startsWith('wa_'))) {
            return res.status(401).json({
                success: false,
                error: 'Invalid API key format',
                message: 'API key must start with "wapi_" or "wa_"'
            });
        }

        // Get key prefix for lookup (first 8 characters)
        const keyPrefix = apiKey.substring(0, 8);

        // Connect to database
        const connection = await mysql.createConnection(dbConfig);

        try {
            // Find API key by prefix
            const [rows] = await connection.execute(
                'SELECT * FROM api_keys WHERE key_prefix = ? AND is_active = 1',
                [keyPrefix]
            );

            if (rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid API key',
                    message: 'API key not found or inactive'
                });
            }

            const apiKeyRecord = rows[0];

            // Check if key is expired
            if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
                return res.status(401).json({
                    success: false,
                    error: 'API key expired',
                    message: 'Your API key has expired'
                });
            }

            // Check usage limit
            if (apiKeyRecord.usage_limit && apiKeyRecord.usage_count >= apiKeyRecord.usage_limit) {
                return res.status(429).json({
                    success: false,
                    error: 'Usage limit exceeded',
                    message: 'API key usage limit has been reached'
                });
            }

            // Validate the actual key (compare with hash)
            // PHP Laravel uses $2y$ bcrypt format, Node.js bcrypt handles $2b$ and $2a$
            // Convert $2y$ to $2b$ for compatibility
            let hashToCompare = apiKeyRecord.key;
            if (hashToCompare.startsWith('$2y$')) {
                hashToCompare = hashToCompare.replace('$2y$', '$2b$');
            }
            
            const isValidKey = await bcrypt.compare(apiKey, hashToCompare);
            
            if (!isValidKey) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid API key',
                    message: 'API key authentication failed'
                });
            }

            // Get user information
            const [userRows] = await connection.execute(
                'SELECT * FROM users WHERE id = ?',
                [apiKeyRecord.user_id]
            );

            if (userRows.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'User not found',
                    message: 'Associated user account not found'
                });
            }

            const user = userRows[0];

            // Update usage statistics
            await connection.execute(
                'UPDATE api_keys SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = ?',
                [apiKeyRecord.id]
            );

            // Attach user and API key info to request
            req.user = user;
            req.apiKey = apiKeyRecord;

            next();

        } finally {
            await connection.end();
        }

    } catch (error) {
        console.error('API key validation error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication error',
            message: 'Failed to validate API key'
        });
    }
}

module.exports = { validateApiKey };
