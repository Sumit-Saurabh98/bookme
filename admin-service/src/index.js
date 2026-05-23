import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { config } from "./config/index.js";
import { logger } from "./config/logger.js";
import { disconnectProducer } from "./config/kafka.js";

import { corsMiddleware } from "./middlewares/cors.middleware.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { getUserContext, requireAdminContext, requireGateway } from "./middlewares/getUserContext.middleware.js";
import { reqLogger } from "./middlewares/req.middleware.js";

import stationRoutes from "./routes/station.route.js";
import trainRoutes from "./routes/train.route.js";
import routeRoutes from "./routes/route.route.js";
import scheduleRoutes from "./routes/schedule.route.js";
import coachRoutes from "./routes/coach.route.js";
import seatRoutes from "./routes/seat.route.js";
import dashboardRoutes from "./routes/dashboard.route.js";

const app = express();

app.use(corsMiddleware);
app.use(helmet({
     crossOriginOpenerPolicy: false,
     crossOriginEmbedderPolicy: false
}));
app.use(reqLogger);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.get("/", (req, res) => {
     res.send("Hello from index.js of admin-service");
});

app.get('/health', (req, res) => {
     res.status(200).json({
          success: true,
          message: 'Admin Service is healthy',
          timestamp: new Date().toISOString()
     });
});

const adminOnly = [requireGateway, getUserContext, requireAdminContext];

app.use("/api/v1/stations", adminOnly, stationRoutes);
app.use("/api/v1/trains", adminOnly, trainRoutes);
app.use("/api/v1/routes", adminOnly, routeRoutes);
app.use("/api/v1/schedules", adminOnly, scheduleRoutes);
app.use("/api/v1", adminOnly, coachRoutes);
app.use("/api/v1", adminOnly, seatRoutes);
app.use("/api/v1/dashboard", adminOnly, dashboardRoutes);

app.use(errorMiddleware);

const startServer = async () => {
     try {
          const server = app.listen(config.PORT, () => {
               logger.info(`${config.SERVICE_NAME} is running on port ${config.PORT}`);
          });

          const shutdown = async () => {
               logger.info('Shutting down gracefully...');

               server.close(async () => {
                    await disconnectProducer();
                    logger.info('Server closed');
                    process.exit(0);
               });
          };

          process.on('SIGTERM', shutdown);
          process.on('SIGINT', shutdown);
     } catch (error) {
          logger.error('Failed to start server', error);
          process.exit(1);
     }
};

startServer();

export default app;
