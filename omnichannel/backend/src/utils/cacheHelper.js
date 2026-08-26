/**
 * Redis Cache Utility
 * Provides caching layer for frequently accessed data
 */

import redisConnection from '../config/redis.js';

const DEFAULT_TTL = 60; // 60 seconds default

/**
 * Get cached value
 */
export const cacheGet = async (key) => {
    try {
        const client = redisConnection;
        if (!client?.status || client.status !== 'ready') {
            return null;
        }
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.warn('[Cache] Get error:', e.message);
        return null;
    }
};

/**
 * Set cached value with TTL
 */
export const cacheSet = async (key, value, ttl = DEFAULT_TTL) => {
    try {
        const client = redisConnection;
        if (!client?.status || client.status !== 'ready') {
            return false;
        }
        await client.setex(key, ttl, JSON.stringify(value));
        return true;
    } catch (e) {
        console.warn('[Cache] Set error:', e.message);
        return false;
    }
};

/**
 * Delete cached value
 */
export const cacheDel = async (key) => {
    try {
        const client = redisConnection;
        if (!client?.status || client.status !== 'ready') {
            return false;
        }
        await client.del(key);
        return true;
    } catch (e) {
        console.warn('[Cache] Del error:', e.message);
        return false;
    }
};

/**
 * Delete cached values by pattern
 */
export const cacheDelPattern = async (pattern) => {
    try {
        const client = redisConnection;
        if (!client?.status || client.status !== 'ready') {
            return false;
        }
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(...keys);
        }
        return true;
    } catch (e) {
        console.warn('[Cache] DelPattern error:', e.message);
        return false;
    }
};

/**
 * Cache helper for inbox conversations
 */
export const cacheInboxConversations = async (orgId, userId, filters, data) => {
    const filterHash = JSON.stringify(filters || {});
    const key = `inbox:convs:${orgId}:${userId}:${hashString(filterKey)}`;
    await cacheSet(key, data, 10); // 10 second cache
};

export const getCachedInboxConversations = async (orgId, userId, filters) => {
    const filterHash = JSON.stringify(filters || {});
    const key = `inbox:convs:${orgId}:${userId}:${hashString(filterKey)}`;
    return await cacheGet(key);
};

export const invalidateInboxConversations = async (orgId, userId) => {
    await cacheDelPattern(`inbox:convs:${orgId}:${userId}:*`);
};

/**
 * Cache helper for organization settings
 */
export const cacheOrgSettings = async (orgId, data) => {
    const key = `org:settings:${orgId}`;
    await cacheSet(key, data, 300); // 5 minute cache
};

export const getCachedOrgSettings = async (orgId) => {
    const key = `org:settings:${orgId}`;
    return await cacheGet(key);
};

export const invalidateOrgSettings = async (orgId) => {
    const key = `org:settings:${orgId}`;
    await cacheDel(key);
};

/**
 * Cache helper for contact lists
 */
export const cacheContacts = async (orgId, filters, data) => {
    const filterHash = hashString(JSON.stringify(filters || {}));
    const key = `contacts:list:${orgId}:${filterHash}`;
    await cacheSet(key, data, 60); // 60 second cache
};

export const getCachedContacts = async (orgId, filters) => {
    const filterHash = hashString(JSON.stringify(filters || {}));
    const key = `contacts:list:${orgId}:${filterHash}`;
    return await cacheGet(key);
};

export const invalidateContacts = async (orgId) => {
    await cacheDelPattern(`contacts:list:${orgId}:*`);
};

/**
 * Cache helper for unread counts
 */
export const cacheUnreadCount = async (orgId, userId, data) => {
    const key = `inbox:unread:${orgId}:${userId}`;
    await cacheSet(key, data, 30); // 30 second cache
};

export const getCachedUnreadCount = async (orgId, userId) => {
    const key = `inbox:unread:${orgId}:${userId}`;
    return await cacheGet(key);
};

export const invalidateUnreadCount = async (orgId, userId) => {
    const key = `inbox:unread:${orgId}:${userId}`;
    await cacheDel(key);
};

// Simple string hash function
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

let filterKey = '';
export const setFilterKey = (key) => { filterKey = key; };
