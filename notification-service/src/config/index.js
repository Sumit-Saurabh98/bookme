import dotenv from "dotenv"
dotenv.config()

export const config = {
     SERVICE_NAME: 'Notification-Service',
     PORT: Number(process.env.PORT) || 4004,
     NODE_ENV: process.env.NODE_ENV || "development",
     LOG_LEVEL: process.env.LOG_LEVEL || "info",
     ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
     GMAIL_USER: process.env.GMAIL_USER,
     GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
     KAFKA_BROKER: process.env.KAFKA_BROKER,
     KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID,
     FRONTEND_URL: process.env.FRONTEND_URL,
     MAIL_SEND: process.env.MAIL_SEND
}