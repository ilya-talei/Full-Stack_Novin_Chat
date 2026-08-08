import express from "express";
import "dotenv/config";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cors from "cors";
import { pinoHttp } from "pino-http";
import logger from "./config/pino.js";
import TenantMiddleware, { Tenant } from "./middlewares/tenantMiddleware.js";
import ErrorMiddleware from "./middlewares/errorMiddleware.js";
import routes from "./routes/index.js";
import http from "http";
import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import { getRedisUrl, redisReady } from "./config/redis.js";
import { setIO } from "./config/io.js";

if (process.env.JWT_EC_PUBLIC_KEY === undefined || process.env.JWT_EC_PRIVATE_KEY === undefined) {
    throw new Error("JWT_EC_PUBLIC_KEY and JWT_EC_PRIVATE_KEY are required");
}

const localMode = process.env.LOCAL_MODE === "true";

const app: express.Application = express();
const server = http.createServer(app);

const corsOriginEnv = process.env.CORS_ORIGIN ?? "http://localhost:5173";
const corsOrigins = [
    ...corsOriginEnv.split(",").map((v) => v.trim()).filter(Boolean),
    // Capacitor Android / iOS WebView origins
    "https://localhost",
    "http://localhost",
    "capacitor://localhost",
    "ionic://localhost",
];

function corsOriginCheck(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Non-browser / same-origin / native shells may omit Origin
    if (!origin) {
        callback(null, true);
        return;
    }
    if (corsOrigins.includes(origin)) {
        callback(null, true);
        return;
    }
    callback(null, false);
}

export const io = new Server(server, {
    cors: {
        origin: corsOrigins,
        credentials: true,
    },
});
setIO(io);

async function setupSocketAdapter() {
    // In local single-process mode, skip Redis entirely (connect() hangs if Redis is down).
    if (localMode) {
        logger.warn("Redis adapter skipped in LOCAL_MODE (single-process sockets)");
        return;
    }

    const redisUrl = getRedisUrl();
    const pubClient = createClient({
        url: redisUrl,
        socket: {
            connectTimeout: 2000,
            reconnectStrategy: false,
        },
    });
    const subClient = pubClient.duplicate();

    pubClient.on("error", (err) => {
        logger.error({ err }, "redis pub client error");
    });
    subClient.on("error", (err) => {
        logger.error({ err }, "redis sub client error");
    });

    try {
        await pubClient.connect();
        await subClient.connect();
        io.adapter(createAdapter(pubClient, subClient));
        logger.info("Socket.IO Redis adapter enabled");
    } catch (error) {
        await Promise.allSettled([pubClient.quit(), subClient.quit()]);
        throw error;
    }
}

await setupSocketAdapter();
await redisReady;

io.on("connection", async (socket) => {
    try {
        const hostHeader = socket.handshake.headers.host ?? "";
        const hostname = hostHeader.split(":")[0] || "localhost";
        const tenant = await Tenant.get(hostname);
        await tenant.services.SocketService.handleConnection(socket as never);
    } catch (error) {
        logger.error({ err: error }, "socket connection failed");
        socket.emit("error", "خطای اتصال");
        socket.disconnect(true);
    }
});

app.use(
    cors({
        origin: corsOriginCheck,
        credentials: true,
    }),
);
app.use(
    pinoHttp({
        logger: logger,
        genReqId: () => {
            return crypto.randomUUID();
        },
    }),
);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json());
app.use(cookieParser());

app.get("/", (_req, res) => {
    res.status(200).json({
        ok: true,
        service: "chat-backend",
        localMode,
        message: "API is running. Open the frontend at http://localhost:5173",
    });
});

app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});

app.use(TenantMiddleware);

app.use(routes);

app.use(ErrorMiddleware);

const APP_PORT = Number(process.env.APP_PORT ?? 3000);

server.listen(APP_PORT, () => {
    logger.info(`Server listening on ${APP_PORT} (LOCAL_MODE=${localMode})`);
});

export default app;
