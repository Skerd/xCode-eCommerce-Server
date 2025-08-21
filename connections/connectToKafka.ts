import { Kafka, Producer, Consumer } from 'kafkajs';
import { KAFKA } from '@environment';
import { getLogger, Logger } from '@loggers/serverLogger';

export const kafkaInstance = require('kafkajs');

let retryCount = 0;
let firstConnection = true;
let kafkaConnection: Kafka;
let producer: Producer;
let consumer: Consumer;

export async function connectToKafka(instance: string, parentAction?: number): Promise<void> {
    let logger = getLogger("connectingToKafkaInstance", Logger.KAFKA, Logger.KAFKA, parentAction);
    logger.updateSpace();
    logger.start();

    const connectWithRetry = async (): Promise<void> => {
        try {
            logger.debug(`Attempting Kafka connection [${retryCount + 1}/${KAFKA.RETRY_CAP}]...`);
            
            // Create Kafka instance
            kafkaConnection = new Kafka({
                clientId: KAFKA.CLIENT_ID,
                brokers: KAFKA.BROKERS,
                retry: {
                    initialRetryTime: 100,
                    retries: 8
                }
            });

            // Create producer with legacy partitioner to avoid v2.0.0 warning
            producer = kafkaConnection.producer({
                createPartitioner: require('kafkajs').Partitioners.LegacyPartitioner
            });
            consumer = kafkaConnection.consumer({ groupId: KAFKA.GROUP_ID });

            // Connect both producer and consumer
            await producer.connect();
            await consumer.connect();
            
            logger.info('Kafka connected successfully');
            retryCount = 0;
        } catch (error) {
            retryCount++;
            logger.err(`Kafka connection failed: ${error.message}. Retrying in ${KAFKA.CONNECTION_TIMER} ms.`);
            if (retryCount >= KAFKA.RETRY_CAP) {
                logger.fail('Exceeded Kafka retry limit. Exiting...');
                process.exit(1);
            }
            await new Promise(res => setTimeout(res, KAFKA.CONNECTION_TIMER));
            return connectWithRetry();
        }
    };

    logger.debug("Setting up Kafka instance");
    logger.updateSpace();

    logger.debug("Setting up producer disconnect handler");
    producer?.on('producer.disconnect', () => {
        logger.warn(`Kafka producer disconnected. Retrying in ${KAFKA.CONNECTION_TIMER} ms.`);
        if (!firstConnection) {
            retryCount++;
            if (retryCount >= KAFKA.RETRY_CAP) {
                logger.fail('Exceeded Kafka producer retry limit. Exiting...');
                process.exit(1);
            }
            setTimeout(async () => {
                try {
                    await producer.connect();
                    logger.info('Kafka producer reconnected successfully');
                    retryCount = 0;
                } catch (err) {
                    logger.err(`Kafka producer reconnection failed: ${err.message}`);
                }
            }, KAFKA.CONNECTION_TIMER);
        }
    });
    logger.debug("Finished setting up producer disconnect handler");

    logger.debug("Setting up consumer disconnect handler");
    consumer?.on('consumer.disconnect', () => {
        logger.warn(`Kafka consumer disconnected. Retrying in ${KAFKA.CONNECTION_TIMER} ms.`);
        if (!firstConnection) {
            retryCount++;
            if (retryCount >= KAFKA.RETRY_CAP) {
                logger.fail('Exceeded Kafka consumer retry limit. Exiting...');
                process.exit(1);
            }
            setTimeout(async () => {
                try {
                    await consumer.connect();
                    logger.info('Kafka consumer reconnected successfully');
                    retryCount = 0;
                } catch (err) {
                    logger.err(`Kafka consumer reconnection failed: ${err.message}`);
                }
            }, KAFKA.CONNECTION_TIMER);
        }
    });
    logger.debug("Finished setting up consumer disconnect handler");

    logger.debug("Setting up SIGINT handler");
    process.on('SIGINT', async () => {
        logger.info('Received SIGINT, closing Kafka connections...');
        try {
            if (producer) {
                await producer.disconnect();
                logger.info('Kafka producer disconnected successfully');
            }
            if (consumer) {
                await consumer.disconnect();
                logger.info('Kafka consumer disconnected successfully');
            }
        } catch (error) {
            logger.err('Error closing Kafka connections');
        }
        process.exit(0);
    });
    logger.debug("Finished setting up SIGINT handler");

    logger.debug("Setting up SIGTERM handler");
    process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM, closing Kafka connections...');
        try {
            if (producer) {
                await producer.disconnect();
                logger.info('Kafka producer disconnected successfully');
            }
            if (consumer) {
                await consumer.disconnect();
                logger.info('Kafka consumer disconnected successfully');
            }
        } catch (error) {
            logger.err('Error closing Kafka connections');
        }
        process.exit(0);
    });
    logger.debug("Finished setting up SIGTERM handler");

    logger.updateSpace(-1);
    logger.debug("Finished setting up Kafka instance");

    await connectWithRetry();
    firstConnection = false;

    logger.finish();
}

// Export getter functions for producer and consumer
export function getKafkaProducer(): Producer {
    if (!producer) {
        throw new Error('Kafka producer not initialized. Call connectToKafka() first.');
    }
    return producer;
}

export function getKafkaConsumer(): Consumer {
    if (!consumer) {
        throw new Error('Kafka consumer not initialized. Call connectToKafka() first.');
    }
    return consumer;
}

export function getKafkaConnection(): Kafka {
    if (!kafkaConnection) {
        throw new Error('Kafka connection not initialized. Call connectToKafka() first.');
    }
    return kafkaConnection;
}