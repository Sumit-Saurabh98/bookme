import { producer, connectProducer } from "../../config/kafka.js"
import { logger } from "../../config/logger.js"
import { KAFKA_TOPICS } from "../topics/index.js"

export class AdminProducer {
    constructor() {
        this.isInitialized = false;
    }

    async initialize() {
        if (!this.isInitialized) {
            await connectProducer();
            this.isInitialized = true;
        }
    }

    async sendMessage(topic, key, value) {
        try {
            await this.initialize()
            const result = await producer.send({
                topic,
                messages: [
                    {
                        key: key || `${topic}-${Date.now()}`,
                        value: JSON.stringify(value),
                        timestamp: Date.now().toString(),
                    }
                ]
            })

            logger.info(`Message sent to topic: ${topic}`, {
                key,
                partition: result[0].partition,
                offset: result[0].offset,
            });

            return result;
        } catch (error) {
            logger.error(`Failed to send message to topic: ${topic}`, {
                error: error.message,
                key,
            });
            throw error;
        }
    }

    async publishStationCreated(station) {
        return this.sendMessage(
            KAFKA_TOPICS.STATION_CREATED,
            `station-${station.id}`,
            { eventType: 'STATION_CREATED', data: station, timestamp: new Date().toISOString() }
        )
    }

    async publishStationUpdated(station) {
        return this.sendMessage(
            KAFKA_TOPICS.STATION_UPDATED,
            `station-${station.id}`,
            { eventType: 'STATION_UPDATED', data: station, timestamp: new Date().toISOString() }
        )
    }

    async publishStationDeleted(station) {
        return this.sendMessage(
            KAFKA_TOPICS.STATION_DELETED,
            `station-${station.id}`,
            { eventType: 'STATION_DELETED', data: station, timestamp: new Date().toISOString() }
        )
    }

    async publishTrainCreated(trainData) {
        return this.sendMessage(
            KAFKA_TOPICS.TRAIN_CREATED,
            `train-${trainData.id}`,
            trainData
        );
    }

    async publishTrainUpdated(trainData) {
        return this.sendMessage(
            KAFKA_TOPICS.TRAIN_UPDATED,
            `train-${trainData.id}`,
            trainData
        );
    }

    async publishTrainDeleted(trainData) {
        return this.sendMessage(
            KAFKA_TOPICS.TRAIN_DELETED,
            `train-${trainData.id}`,
            trainData
        );
    }

    async publishRouteCreated(routeData) {
        return this.sendMessage(
            KAFKA_TOPICS.ROUTE_CREATED,
            `route-${routeData.id}`,
            routeData
        );
    }

    async publishRouteUpdated(routeData) {
        return this.sendMessage(
            KAFKA_TOPICS.ROUTE_UPDATED,
            `route-${routeData.id}`,
            routeData
        );
    }

    async publishRouteDeleted(routeData) {
        return this.sendMessage(
            KAFKA_TOPICS.ROUTE_DELETED,
            `route-${routeData.id}`,
            routeData
        );
    }

    async publishCoachCreated(coachData) {
        return this.sendMessage(
            KAFKA_TOPICS.COACH_CREATED,
            `coach-${coachData.id}`,
            coachData
        );
    }

    async publishCoachUpdated(coachData) {
        return this.sendMessage(
            KAFKA_TOPICS.COACH_UPDATED,
            `coach-${coachData.id}`,
            coachData
        );
    }

    async publishCoachDeleted(coachData) {
        return this.sendMessage(
            KAFKA_TOPICS.COACH_DELETED,
            `coach-${coachData.id}`,
            coachData
        );
    }

    async publishSeatCreated(seatData) {
        return this.sendMessage(
            KAFKA_TOPICS.SEAT_CREATED,
            `seat-${seatData.id}`,
            seatData
        );
    }

    async publishSeatUpdated(seatData) {
        return this.sendMessage(
            KAFKA_TOPICS.SEAT_UPDATED,
            `seat-${seatData.id}`,
            seatData
        );
    }

    async publishSeatDeleted(seatData) {
        return this.sendMessage(
            KAFKA_TOPICS.SEAT_DELETED,
            `seat-${seatData.id}`,
            seatData
        );
    }

    async publishScheduleCreated(scheduleData) {
        return this.sendMessage(
            KAFKA_TOPICS.SCHEDULE_CREATED,
            `schedule-${scheduleData.scheduleId}`,
            scheduleData
        );
    }

    async publishScheduleCancelled(scheduleData) {
        return this.sendMessage(
            KAFKA_TOPICS.SCHEDULE_CANCELLED,
            `schedule-${scheduleData.id}`,
            scheduleData
        );
    }

    async publishScheduleActivated(scheduleData) {
        return this.sendMessage(
            KAFKA_TOPICS.SCHEDULE_ACTIVATED,
            `schedule-${scheduleData.id}`,
            scheduleData
        );
    }

    async publishScheduleRescheduled(scheduleData) {
        return this.sendMessage(
            KAFKA_TOPICS.SCHEDULE_RESCHEDULED,
            `schedule-${scheduleData.id}`,
            scheduleData
        );
    }
}

export const adminProducer = new AdminProducer();
