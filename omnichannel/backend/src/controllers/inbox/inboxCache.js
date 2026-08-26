import redisConnection from '../../config/redis.js';

export const cacheGet = async (key) => {
    try {
        const client = redisConnection;
        if (!client?.status || client.status !== 'ready') return null;
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    } catch { return null; }
};

export const cacheSet = async (key, value, ttl = 30) => {
    try {
        const client = redisConnection;
        if (!client?.status || client.status !== 'ready') return false;
        await client.setex(key, ttl, JSON.stringify(value));
        return true;
    } catch { return false; }
};

export const cacheDel = async (key) => {
    try {
        const client = redisConnection;
        if (!client?.status || client.status !== 'ready') return false;
        await client.del(key);
        return true;
    } catch { return false; }
};

export const cacheDelPattern = async (pattern) => {
    try {
        const client = redisConnection;
        if (!client?.status || client.status !== 'ready') return false;
        return new Promise((resolve) => {
            const stream = client.scanStream({ match: pattern, count: 100 });
            stream.on('data', async (keys) => {
                if (keys.length > 0) {
                    const pipeline = client.pipeline();
                    keys.forEach(k => pipeline.del(k));
                    await pipeline.exec().catch(() => {});
                }
            });
            stream.on('end', () => resolve(true));
            stream.on('error', () => resolve(false));
        });
    } catch { return false; }
};

export const getUnreadCacheKey = (orgId, userId, inboxIds) => `inbox:unread:${orgId}:${userId}:${JSON.stringify(inboxIds || [])}`;
export const getConvsCacheKey = (orgId, userId, hash) => `inbox:convs:${orgId}:${userId}:${hash}`;

export const invalidateInboxCache = async (organizationId) => {
    await cacheDelPattern(`inbox:unread:${organizationId}:*`);
    await cacheDelPattern(`inbox:convs:${organizationId}:*`);
};
