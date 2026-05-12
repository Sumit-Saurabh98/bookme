import { consumer, dlqProducer, connectDlqProducer } from "../../config/kafka.js"
import { emailService } from "../../services/email.service.js"
import { logger } from "../../config/logger.js"
import { TOPICS } from "../../utils/constants.js"

class EmailConsumer {
    constructor() {
        this.isDlqConnected = false;
    }

    async start() {
        try {
            await consumer.connect()
            logger.info("Email consumer connected to kafka")

            // Connect DLQ producer
            await connectDlqProducer();
            this.isDlqConnected = true;
            logger.info("DLQ producer connected");

            await consumer.subscribe({
                topics: [TOPICS.OTP_EMAIL, TOPICS.WELCOME_EMAIL],
                fromBeginning: false
            })

            await consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        const value = JSON.parse(message.value.toString());
                        logger.info(`Processing message from topic: ${topic}`, {
                            partition,
                            offset: message.offset,
                            key: message.key?.toString(),
                        });
                        await this.handleMessage(topic, value);
                    } catch (error) {
                        logger.error('Error processing message', {
                            topic,
                            partition,
                            offset: message.offset,
                            error: error.message,
                            stack: error.stack,
                        });

                        // Send to dead letter queue for failed messages
                        await this.sendToDeadLetterQueue(topic, message, error);
                    }
                }
            })
            logger.info('Email consumer is running and listening for messages...');
        } catch (error) {
            logger.error('Failed to start email consumer', { error: error.message });
            throw error;
        }
    }


    async handleMessage(topic, data) {
        switch (topic) {
            case TOPICS.OTP_EMAIL:
                await this.handleOtpEmail(data);
                break;

            case TOPICS.WELCOME_EMAIL:
                await this.handleWelcomeEmail(data);
                break;

            default:
                logger.warn(`Unknown topic: ${topic}`);
        }
    }

    async handleOtpEmail(data) {
        const { email, otp, ttlMinutes } = data;

        if (!email || !otp) {
            throw new Error('Missing required fields: email or otp');
        }

        await emailService.sendOtpEmail(email, otp, ttlMinutes || 5);
        logger.info(`OTP email sent to ${email}`);
    }

    async handleWelcomeEmail(data) {
        const { email, firstName } = data;

        if (!email || !firstName) {
            throw new Error('Missing required fields: email or firstName');
        }

        await emailService.sendWelcomeEmail(email, firstName);
        logger.info(`Welcome email sent to ${email}`);
    }

    async sendToDeadLetterQueue(originalTopic, message, error) {
        try {
            if (!this.isDlqConnected) {
                logger.error('DLQ producer not connected, cannot send to DLQ');
                return;
            }

            const dlqMessage = {
                originalTopic,
                originalKey: message.key?.toString() || null,
                originalMessage: message.value.toString(),
                error: {
                    message: error.message,
                    stack: error.stack,
                },
                failedAt: new Date().toISOString(),
                originalOffset: message.offset,
                originalTimestamp: message.timestamp,
            };

            await dlqProducer.send({
                topic: TOPICS.DLQ,
                messages: [{
                    key: `dlq-${originalTopic}-${Date.now()}`,
                    value: JSON.stringify(dlqMessage),
                    timestamp: Date.now().toString(),
                }]
            });

            logger.info(`Message sent to DLQ from topic: ${originalTopic}`, {
                originalOffset: message.offset,
                error: error.message,
            });
        } catch (dlqError) {
            // Last resort: log the failed DLQ send so the message isn't silently lost
            logger.error('CRITICAL: Failed to send message to DLQ', {
                originalTopic,
                originalOffset: message.offset,
                dlqError: dlqError.message,
                originalError: error.message,
            });
        }
    }

    async stop() {
        await consumer.disconnect();
        if (this.isDlqConnected) {
            await dlqProducer.disconnect();
            this.isDlqConnected = false;
        }
        logger.info('Email consumer disconnected');
    }
}

export const emailConsumer = new EmailConsumer();