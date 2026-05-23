import dotenv from "dotenv";

dotenv.config();

export const config = {
    PORT: Number(process.env.PORT) || 4003,
    SERVICE_NAME: "Admin-Service",
    NODE_ENV: process.env.NODE_ENV || 'development',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    KAFKA_BROKER: process.env.KAFKA_BROKER,
    KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID,
    DATABASE_URL: process.env.DATABASE_URL,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    INTERNAL_GATEWAY_SECRET:
        process.env.INTERNAL_GATEWAY_SECRET || "bookme-internal-gateway-secret"
}
