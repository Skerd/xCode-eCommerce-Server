import { createClient, RedisClientType } from 'redis';
import { REDIS } from '@environment';
import { getLogger, Logger } from '@loggers/serverLogger';

export const redisInstance = require('redis');

let retryCount = 0;
let firstConnection = true;
let redisClient: RedisClientType;

export async function connectToRedis(instance: string, parentAction?: number): Promise<void> {
    let logger = getLogger("connectingToRedisInstance", Logger.REDIS, Logger.REDIS, parentAction);
    logger.updateSpace();
    logger.start();

    const connectWithRetry = async (): Promise<void> => {
        try {
            logger.debug(`Attempting Redis connection [${retryCount + 1}/${REDIS.RETRY_CAP}]...`);
            logger.debug(`Redis configuration: nodes=${JSON.stringify(REDIS.ROOT_NODES)}, username=${REDIS.USERNAME ? 'provided' : 'not provided'}, password=${REDIS.PASSWORD ? 'provided' : 'not provided'}`);

            // Connect to the first Redis node
            const primaryNode = REDIS.ROOT_NODES[0];
            const [host, port] = primaryNode.split(':');

            logger.debug(`Connecting to Redis at ${host}:${port}`);

            redisClient = createClient({
                socket: {
                    host: host,
                    port: parseInt(port),
                    connectTimeout: REDIS.CONNECT_TIMEOUT,
                    keepAlive: 5000,
                    reconnectStrategy: (retries) => {
                        if (retries > REDIS.RETRY_CAP) {
                            logger.fail('Exceeded Redis retry limit. Exiting...');
                            process.exit(1);
                        }
                        logger.warn(`Redis reconnection attempt ${retries}/${REDIS.RETRY_CAP}`);
                        return Math.min(retries * 100, 3000);
                    }
                },
                username: REDIS.USERNAME,
                password: REDIS.PASSWORD
            });

            // Set up event handlers after creating the client
            logger.debug("Setting up Redis error handler");
            redisClient.on('error', (error) => {
                logger.err(`Redis error: ${error.message}`);
                // Let the built-in reconnect strategy handle reconnection
            });
            logger.debug("Finished setting up Redis error handler");

            logger.debug("Setting up Redis ready handler");
            redisClient.on('ready', () => {
                logger.info('Redis is ready');
                retryCount = 0;
            });
            logger.debug("Finished setting up Redis ready handler");

            logger.debug("Setting up Redis end handler");
            redisClient.on('end', () => {
                logger.warn('Redis connection ended');
                // Let the built-in reconnect strategy handle reconnection
            });
            logger.debug("Finished setting up Redis end handler");

            // Connect to Redis
            await redisClient.connect();

            logger.info('Redis connected successfully');
            retryCount = 0;
        } catch (error: any) {
            retryCount++;

            logger.err(`Redis connection failed: ${error.message}`);
            logger.debug(`Connection details: nodes=${JSON.stringify(REDIS.ROOT_NODES)}, username=${REDIS.USERNAME ? 'provided' : 'not provided'}, password=${REDIS.PASSWORD ? 'provided' : 'not provided'}`);
            logger.err(`Retrying in ${REDIS.CONNECTION_TIMER} ms. Attempt ${retryCount}/${REDIS.RETRY_CAP}`);

            if (retryCount >= REDIS.RETRY_CAP) {
                logger.fail('Exceeded Redis retry limit. Exiting...');
                process.exit(1);
            }
            await new Promise(res => setTimeout(res, REDIS.CONNECTION_TIMER));
            return connectWithRetry();
        }
    };

    logger.debug("Setting up Redis instance");
    logger.updateSpace();

    logger.debug("Setting up SIGINT handler");
    process.on('SIGINT', async () => {
        logger.info('Received SIGINT, closing Redis connection...');
        try {
            if (redisClient) {
                await redisClient.quit();
                logger.info('Redis disconnected successfully');
            }
        } catch (error: any) {
            logger.err('Error closing Redis connection');
        }
        process.exit(0);
    });
    logger.debug("Finished setting up SIGINT handler");

    logger.debug("Setting up SIGTERM handler");
    process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM, closing Redis connection...');
        try {
            if (redisClient) {
                await redisClient.quit();
                logger.info('Redis disconnected successfully');
            }
        } catch (error: any) {
            logger.err('Error closing Redis connection');
        }
        process.exit(0);
    });
    logger.debug("Finished setting up SIGTERM handler");

    logger.updateSpace(-1);
    logger.debug("Finished setting up Redis instance");

    await connectWithRetry();
    firstConnection = false;

    logger.finish();
}

// Export getter function for Redis client
export function getRedisClient(): RedisClientType {
    if (!redisClient) {
        throw new Error('Redis client not initialized. Call connectToRedis() first.');
    }
    return redisClient;
}

// Helper functions for common Redis operations
export async function setKey(key: string, value: string, ttl?: number): Promise<void> {
    const client = getRedisClient();
    if (ttl) {
        await client.setEx(key, ttl, value);
    } else {
        await client.set(key, value);
    }
}

export async function getKey(key: string): Promise<string | null> {
    const client = getRedisClient();
    return await client.get(key);
}

export async function deleteKey(key: string): Promise<number> {
    const client = getRedisClient();
    return await client.del(key);
}

export async function keyExists(key: string): Promise<boolean> {
    const client = getRedisClient();
    const exists = await client.exists(key);
    return exists > 0;
}

export async function setHash(hash: string, field: string, value: string): Promise<void> {
    const client = getRedisClient();
    await client.hSet(hash, field, value);
}

export async function getHash(hash: string, field: string): Promise<string | null> {
    const client = getRedisClient();
    return await client.hGet(hash, field);
}

export async function getAllHash(hash: string): Promise<Record<string, string>> {
    const client = getRedisClient();
    return await client.hGetAll(hash);
}

export async function deleteHash(hash: string, field: string): Promise<number> {
    const client = getRedisClient();
    return await client.hDel(hash, field);
}
