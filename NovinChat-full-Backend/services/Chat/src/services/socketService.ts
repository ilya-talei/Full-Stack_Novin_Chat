import { Socket } from "socket.io";
import { parseCookie } from "cookie";
import type { jwtSession } from "../middlewares/authMiddleware.js";
import jwt from "jsonwebtoken";
import { Tenant, type Services } from "../middlewares/tenantMiddleware.js";
import { AppError } from "../middlewares/errorMiddleware.js";
import type { Session, User } from "../generated/prisma/client.js";
import redis from "../config/redis.js";
import type { SaveMessageToDbReturnType, SendMessageDataType } from "./messageService.js";
import z from "zod";

class SocketError extends Error {
    constructor(
        message: string,
        private disconnect: boolean = true,
    ) {
        super(message);
    }

    sendError(socket: Socket) {
        socket.emit("error", this.message);
        socket.disconnect(this.disconnect);
    }

    static sendError(socket: Socket, message: string, disconnect: boolean = true) {
        socket.emit("error", message);
        socket.disconnect(disconnect);
    }

    static sendUnknownError(socket: Socket) {
        socket.emit("error", "خطای ناشناخته");
        socket.disconnect(true);
    }
}

class ChatSocket extends Socket {
    jwtSession?: jwtSession;
    tenant?: Tenant;

    session?: Session;
}

const textMessageSchema = z.object({
    type: z.literal("text"),
    content: z.string().min(1).max(4096),
    created_at: z.date(),
    sender_id: z.number(),
    chat_id: z.number(),
});

const messageSchema = z.discriminatedUnion("type", [textMessageSchema]);

const sendMessageSchema = z.object({
    chat_id: z.number(),
    message_type: z.enum(["text"]),
    message_uuid: z.string().length(36),
    message_data: messageSchema,
});

const deleteMessageSchema = z.object({
    chat_id: z.number(),
    message_id: z.number(),
});

type deleteMessageType = {
    chat_id: number;
    message_id: number;
};

type deleteMessageWsType = {
    chat_id: number;
    message_id: number;
};

const connectUserScript = `
redis.call('sadd', KEYS[1], ARGV[1])
redis.call('sadd', KEYS[2], ARGV[2])
`;
const connectUserSha = (await redis.script("LOAD", connectUserScript)) as string;

const disconnectUserScript = `
redis.call('srem', KEYS[1], ARGV[1])
if redis.call('scard', KEYS[1]) == 0 then
  redis.call('srem', KEYS[2], ARGV[2])
end
`;
const disconnectUserSha = (await redis.script("LOAD", disconnectUserScript)) as string;

class SocketService {
    public servies?: Services;

    private on(
        socket: ChatSocket,
        event: string,
        handler: (socket: ChatSocket, data?: unknown) => Promise<void>,
    ) {
        socket.on(event, async (data?: unknown) => {
            try {
                await handler(socket, data);
            } catch (error) {
                if (error instanceof SocketError) {
                    error.sendError(socket);
                } else if (error instanceof AppError) {
                    SocketError.sendError(socket, error.message, true);
                } else {
                    SocketError.sendUnknownError(socket);
                }
            }
        });
    }

    async handleConnection(socket: ChatSocket) {
        try {
            const hostname = socket.handshake.headers.host;
            if (hostname === undefined) {
                throw new SocketError("Unknown Error", true);
            }

            const cookies = parseCookie(socket.handshake.headers.cookie ?? "");

            const token = cookies.token;

            if (token === undefined) {
                throw new SocketError("Authentication Failed", true);
            }

            let decoded: jwtSession;
            try {
                decoded = jwt.verify(token, process.env.JWT_EC_PUBLIC_KEY!, {
                    algorithms: ["ES256"],
                }) as jwtSession;
            } catch (_error) {
                throw new SocketError("Authentication Failed", true);
            }

            const tenant: Tenant = await Tenant.get(hostname);
            if (tenant.data.id !== decoded.tenant_id) {
                throw new SocketError("Authentication failed");
            }

            const session: Session | null = await tenant.services.SessionService.getSessionById(
                decoded.sessionId,
            );
            if (!session || !session.active || session.user_id !== decoded.userId) {
                throw new SocketError("Authentication Failed", true);
            }

            const user: User | null = await tenant.services.UserService.getUserById(decoded.userId);
            if (!user || !user.active) {
                throw new SocketError("Authentication Failed", true);
            }

            socket.jwtSession = decoded;
            socket.tenant = tenant;
            socket.session = session;

            const chatIds: number[] = await this.servies!.ChatService.getUserChatIdsByUserID(
                user.id,
            );

            await Promise.all(
                chatIds.map((chat_id) =>
                    Promise.resolve(
                        socket.join(`tenant:${tenant.data.id},chat_id:${chat_id}.messages`),
                    ),
                ),
            );

            await redis.evalsha(
                connectUserSha,
                2,
                `tenant:${socket.tenant.data.id},user:${user.id}.socket_ids`,
                `tenant:${socket.tenant.data.id}.online_users`,
                socket.id,
                user.id,
            );

            this.on(socket, "disconnect", this.handleDisconnect);
            this.on(socket, "message", this.handleMessage);
            this.on(socket, "delete_message", this.handleDeleteMessage);
        } catch (error: unknown) {
            if (error instanceof SocketError) {
                error.sendError(socket);
            } else if (error instanceof AppError) {
                SocketError.sendError(socket, error.message, true);
            } else {
                SocketError.sendUnknownError(socket);
            }
        }
    }

    handleDisconnect = async (socket: ChatSocket) => {
        if (!socket.tenant || !socket.jwtSession) {
            return;
        }

        const userSocketSetKey = `tenant:${socket.tenant.data.id},user:${socket.jwtSession.userId}.socket_ids`;
        const onlineUsersKey = `tenant:${socket.tenant.data.id}.online_users`;

        await redis.evalsha(
            disconnectUserSha,
            2,
            userSocketSetKey,
            onlineUsersKey,
            socket.id,
            socket.jwtSession.userId,
        );
    };

    handleMessage = async (socket: ChatSocket, data: unknown) => {
        const validation = sendMessageSchema.safeParse(data);
        if (!validation.success) {
            throw new SocketError(validation.error.issues[0]!.message);
        }

        const nMessage: SendMessageDataType = validation.data;
        nMessage.message_data.chat_id = nMessage.chat_id;
        nMessage.message_data.type = nMessage.message_type;

        const newMessage: SaveMessageToDbReturnType =
            await this.servies!.MessageService.saveMessageToDb(socket.session!.user_id, nMessage);

        this.sendResponseToClient(socket, newMessage);
        this.sendMessageToChat(socket, newMessage);
    };

    sendResponseToClient(socket: ChatSocket, data: SaveMessageToDbReturnType) {
        socket.emit("message_response", data);
    }

    sendMessageToChat(socket: ChatSocket, data: SaveMessageToDbReturnType) {
        socket
            .to(`tenant:${socket.tenant?.data.id},chat_id:${data.chat.id}.messages`)
            .emit("new_message", data);
    }

    sendDeleteMessageToChat(socket: ChatSocket, data: deleteMessageWsType) {
        socket
            .to(`tenant:${socket.tenant?.data.id},chat_id:${data.chat_id}.messages`)
            .emit("delete_message", data);
    }

    handleDeleteMessage = async (socket: ChatSocket, data: unknown) => {
        const validation = deleteMessageSchema.safeParse(data);
        if (!validation.success) {
            throw new SocketError(validation.error.issues[0]!.message, true);
        }

        const inputData: deleteMessageType = validation.data;

        await this.servies!.MessageService.deleteMessageFromDb(
            socket.session!.user_id,
            inputData.chat_id,
            inputData.message_id,
        );
    };
}

export default SocketService;
