import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Parse REDIS_URL if provided, otherwise use individual params
// Export this so Workers can create their own connections
export const redisConfig = process.env.REDIS_URL || {
  host: '127.0.0.1', // Force IPv4
  port: 6379,
  maxRetriesPerRequest: null, // REQUIRED for BullMQ
  enableReadyCheck: false,
};

// Shared connection for general non-blocking usage (e.g. caching, queue producers)
const connection = new IORedis(redisConfig, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,    // Recommended for failover scenarios
});

export default connection;
