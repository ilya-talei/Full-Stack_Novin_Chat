import express from "express";
import "dotenv/config";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import logger from "./config/pino.js";
import TenantMiddleware from "./middlewares/tenantMiddleware.js";
import ErrorMiddleware from "./middlewares/errorMiddleware.js";
import routes from "./routes/index.js";
import http from "http";
import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import "./config/redis.js";

const app: express.Application = express();
const server = http.createServer(app);

export const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

const pubClient = createClient({ url: "redis://:amir1234@localhost:6379" });
const subClient = pubClient.duplicate();

await pubClient.connect();
await subClient.connect();

io.adapter(createAdapter(pubClient, subClient));

app.use(
    pinoHttp({
        logger: logger,
        genReqId: () => {
            return crypto.randomUUID();
        },
    }),
);
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(TenantMiddleware);

app.use(routes);

app.use(ErrorMiddleware);

const APP_PORT = Number(process.env.APP_PORT ?? 3000);

server.listen(APP_PORT, () => {
    logger.info(`Server listening on ${APP_PORT}`);
});

export default app;
