import { Kafka, logLevel } from "kafkajs"
import { logger } from "./logger.js"
import { config } from "./index.js"

export const kafka = new Kafka({
    clientId: config.KAFKA_CLIENT_ID,
    brokers: [config.KAFKA_BROKER || 'localhost:9093'],
    logLevel: logLevel.ERROR,
    retry: {
        initialRetryTime: 300,
        retries: 10,
        maxRetryTime: 30000,
        multiplier: 2,
    },
})

export const consumer = kafka.consumer({
     groupId: 'notification-service-group',
     sessionTimeout: 30000,
     heartbeatInterval: 3000,
});

// Separate producer for Dead Letter Queue
export const dlqProducer = kafka.producer({
     allowAutoTopicCreation: true,
     retry: {
          retries: 3,
     },
});

export const connectDlqProducer = async () => {
     await dlqProducer.connect();
     logger.info('DLQ Kafka producer connected');
};

export const shutdown = async () => {
     logger.info('Shutting down Kafka connections...');
     await consumer.disconnect();
     await dlqProducer.disconnect().catch(() => {});
     process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);