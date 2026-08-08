import { Socket } from "socket.io";
import { parseCookie } from "cookie";
import type { jwtSession } from "../middlewares/authMiddleware.js";
import jwt from "jsonwebtoken";
import { Tenant, type Services } from "../middlewares/tenantMiddleware.js";
import { AppError } from "../middlewares/errorMiddleware.js";
import type { Session, User } from "../generated/prisma/client.js";
import redis, { redisReady } from "../config/redis.js";
import type { SaveMessageToDbReturnType, SendMessageDataType } from "./messageService.js";
import z from "zod";
import { broadcastMessagesRead } from "../utils/broadcastMessagesRead.js";

class SocketError extends Error {
    constructor(
        message: string,
        private disconnect: boolean = true,
    ) {
        super(message);
    }

    sendError(socket: Socket) {
        socket.emit("error", this.message);
        if (this.disconnect) {
            socket.disconnect(true);
        }
    }

    static sendError(socket: Socket, message: string, disconnect: boolean = true) {
        socket.emit("error", message);
        if (disconnect) {
            socket.disconnect(true);
        }
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
    created_at: z.coerce.date(),
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

const editMessageSchema = z.object({
    chat_id: z.number(),
    message_id: z.number(),
    content: z.string().min(1).max(4096),
});

const markReadSchema = z.object({
    chat_id: z.coerce.number().int().positive(),
    message_id: z.coerce.number().int().positive().optional(),
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

const disconnectUserScript = `
redis.call('srem', KEYS[1], ARGV[1])
if redis.call('scard', KEYS[1]) == 0 then
  redis.call('srem', KEYS[2], ARGV[2])
end
`;

await redisReady;
const connectUserSha = (await redis.script("LOAD", connectUserScript)) as string;
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
                    SocketError.sendError(socket, error.message, false);
                } else {
                    SocketError.sendUnknownError(socket);
                }
            }
        });
    }

    async handleConnection(socket: ChatSocket) {
        try {
            const hostHeader = socket.handshake.headers.host;
            if (hostHeader === undefined) {
                throw new SocketError("Unknown Error", true);
            }

            const hostname = hostHeader.split(":")[0] || hostHeader;

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

            socket.broadcast.emit("user_online", {
                userId: user.id,
                login_id: user.login_id,
            });

            this.on(socket, "disconnect", this.handleDisconnect);
            this.on(socket, "message", this.handleMessage);
            this.on(socket, "delete_message", this.handleDeleteMessage);
            this.on(socket, "edit_message", this.handleEditMessage);
            this.on(socket, "mark_read", this.handleMarkRead);
            this.on(socket, "join_chat", this.handleJoinChat);
            this.on(socket, "typing", this.handleTyping);
            this.on(socket, "stop_typing", this.handleStopTyping);
            this.on(socket, "call_offer", (s, d) => this.forwardCallEvent(s, d, "call_offer"));
            this.on(socket, "call_answer", (s, d) => this.forwardCallEvent(s, d, "call_answer"));
            this.on(socket, "call_ice", (s, d) => this.forwardCallEvent(s, d, "call_ice"));
            this.on(socket, "call_end", (s, d) => this.forwardCallEvent(s, d, "call_end"));
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

        const remaining = await redis.scard(userSocketSetKey);
        if (remaining === 0) {
            const lastSeenAt = new Date();
            try {
                await socket.tenant.prisma.user.update({
                    where: { id: socket.jwtSession.userId },
                    data: { last_login_at: lastSeenAt },
                });
            } catch {
                // presence emit should still happen even if DB stamp fails
            }
            socket.broadcast.emit("user_offline", {
                userId: socket.jwtSession.userId,
                last_seen_at: lastSeenAt.toISOString(),
            });
        }
    };

    handleJoinChat = async (socket: ChatSocket, data: unknown) => {
        const parsed = z
            .object({ chat_id: z.coerce.number().int().positive() })
            .safeParse(data);
        if (!parsed.success) {
            throw new SocketError(parsed.error.issues[0]!.message, false);
        }

        const joined = await this.servies!.ChatService.isUserJoinedToChat(
            socket.session!.user_id,
            parsed.data.chat_id,
        );
        if (!joined) {
            throw new SocketError("عدم دسترسی", false);
        }

        await socket.join(
            `tenant:${socket.tenant!.data.id},chat_id:${parsed.data.chat_id}.messages`,
        );
        socket.emit("joined_chat", { chat_id: parsed.data.chat_id });
    };

    handleTyping = async (socket: ChatSocket, data: unknown) => {
        const parsed = z
            .object({ chat_id: z.coerce.number().int().positive() })
            .safeParse(data);
        if (!parsed.success) return;

        socket
            .to(`tenant:${socket.tenant?.data.id},chat_id:${parsed.data.chat_id}.messages`)
            .emit("typing", {
                chat_id: parsed.data.chat_id,
                userId: socket.jwtSession!.userId,
            });
    };

    handleStopTyping = async (socket: ChatSocket, data: unknown) => {
        const parsed = z
            .object({ chat_id: z.coerce.number().int().positive() })
            .safeParse(data);
        if (!parsed.success) return;

        socket
            .to(`tenant:${socket.tenant?.data.id},chat_id:${parsed.data.chat_id}.messages`)
            .emit("stop_typing", {
                chat_id: parsed.data.chat_id,
                userId: socket.jwtSession!.userId,
            });
    };

    forwardCallEvent = async (
        socket: ChatSocket,
        data: unknown,
        eventName: "call_offer" | "call_answer" | "call_ice" | "call_end",
    ) => {
        const parsed = z
            .object({
                toUserId: z.coerce.number().int().positive().optional(),
                payload: z.unknown().optional(),
                chat_id: z.coerce.number().int().positive().optional(),
                broadcast: z.boolean().optional(),
            })
            .safeParse(data);
        if (!parsed.success) {
            throw new SocketError(parsed.error.issues[0]!.message, false);
        }

        const { toUserId, chat_id, payload, broadcast } = parsed.data;
        const fromUserId = socket.jwtSession!.userId;
        const tenantId = socket.tenant!.data.id;

        let targetUserIds: number[] = [];

        if (broadcast && chat_id) {
            const membership = await this.servies!.ChatService.assertMember(chat_id, fromUserId);
            const chat = await socket.tenant!.prisma.chat.findFirst({
                where: { id: chat_id, deleted_at: null },
                select: { type: true },
            });
            if (!chat) {
                throw new SocketError("چت پیدا نشد", false);
            }
            if (chat.type === "channel") {
                throw new SocketError("تماس در کانال مجاز نیست", false);
            }
            void membership;
            const members = await socket.tenant!.prisma.chatMember.findMany({
                where: { chat_id, deleted_at: null, user: { deleted_at: null, active: true } },
                select: { user_id: true },
            });
            targetUserIds = members.map((m) => m.user_id).filter((id) => id !== fromUserId);
        } else if (toUserId) {
            if (chat_id) {
                try {
                    await this.servies!.ChatService.assertMember(chat_id, fromUserId);
                } catch {
                    /* allow private call without strict chat check if peer known */
                }
            }
            targetUserIds = [toUserId];
        } else {
            throw new SocketError("مقصد تماس مشخص نیست", false);
        }

        const packet = {
            fromUserId,
            chat_id,
            payload,
        };

        for (const uid of targetUserIds) {
            const targetSockets = await redis.smembers(
                `tenant:${tenantId},user:${uid}.socket_ids`,
            );
            for (const targetId of targetSockets) {
                socket.to(targetId).emit(eventName, packet);
                socket.to(targetId).emit("call_signal", { ...packet, event: eventName });
            }
        }
    };

    handleMessage = async (socket: ChatSocket, data: unknown) => {
        const validation = sendMessageSchema.safeParse(data);
        if (!validation.success) {
            throw new SocketError(validation.error.issues[0]!.message, false);
        }

        const nMessage: SendMessageDataType = validation.data;
        nMessage.message_data.chat_id = nMessage.chat_id;
        nMessage.message_data.type = nMessage.message_type;

        const newMessage: SaveMessageToDbReturnType =
            await this.servies!.MessageService.saveMessageToDb(socket.session!.user_id, nMessage);

        this.sendResponseToClient(socket, newMessage);
        this.sendMessageToChat(socket, newMessage);

        try {
            const memberIds = await this.servies!.ChatService.getUserChatIdsByUserID(
                socket.session!.user_id,
            );
            void memberIds;
            const members = await socket.tenant!.prisma.chatMember.findMany({
                where: {
                    chat_id: nMessage.chat_id,
                    deleted_at: null,
                    user_id: { not: socket.session!.user_id },
                },
                select: { user_id: true },
            });

            const sender = await socket.tenant!.prisma.user.findUnique({
                where: { id: socket.session!.user_id },
                select: { display_name: true, login_id: true },
            });
            const senderName =
                sender?.display_name?.trim() || sender?.login_id || "کاربر";

            await Promise.all(
                members.map((member) =>
                    this.servies!.NotificationService.upsertMessageNotification(member.user_id, {
                        chatId: nMessage.chat_id,
                        senderId: socket.session!.user_id,
                        senderName,
                        messageId: newMessage.id,
                    }),
                ),
            );
        } catch {
            /* notification failures shouldn't break messaging */
        }
    };

    sendResponseToClient(socket: ChatSocket, data: SaveMessageToDbReturnType) {
        socket.emit("message_response", data);
    }

    sendMessageToChat(socket: ChatSocket, data: SaveMessageToDbReturnType) {
        const chatId = data.chat.id;
        if (chatId == null) return;
        socket
            .to(`tenant:${socket.tenant?.data.id},chat_id:${chatId}.messages`)
            .emit("new_message", data);
    }

    sendDeleteMessageToChat(socket: ChatSocket, data: deleteMessageWsType) {
        socket
            .to(`tenant:${socket.tenant?.data.id},chat_id:${data.chat_id}.messages`)
            .emit("delete_message", data);
        socket.emit("delete_message", data);
    }

    handleDeleteMessage = async (socket: ChatSocket, data: unknown) => {
        const validation = deleteMessageSchema.safeParse(data);
        if (!validation.success) {
            throw new SocketError(validation.error.issues[0]!.message, false);
        }

        const inputData: deleteMessageType = validation.data;

        await this.servies!.MessageService.deleteMessageFromDb(
            socket.session!.user_id,
            inputData.chat_id,
            inputData.message_id,
        );

        this.sendDeleteMessageToChat(socket, inputData);
    };

    sendEditMessageToChat(socket: ChatSocket, data: SaveMessageToDbReturnType) {
        const chatId = data.chat.id;
        if (chatId == null) return;
        socket
            .to(`tenant:${socket.tenant?.data.id},chat_id:${chatId}.messages`)
            .emit("edit_message", data);
        socket.emit("edit_message", data);
        socket.emit("edit_message_response", data);
    }

    handleMarkRead = async (socket: ChatSocket, data: unknown) => {
        const validation = markReadSchema.safeParse(data);
        if (!validation.success) {
            throw new SocketError(validation.error.issues[0]!.message, false);
        }

        const input = validation.data;
        const result = await this.servies!.ChatService.markAsRead(
            socket.session!.user_id,
            input.chat_id,
            input.message_id,
        );

        if (result.notify && result.last_read_message_id) {
            broadcastMessagesRead(
                socket.tenant!.data.id,
                {
                    chat_id: result.chat_id,
                    reader_id: result.reader_id,
                    last_read_message_id: result.last_read_message_id,
                    chat_type: result.chat_type,
                },
                socket.id,
            );
        }

        socket.emit("mark_read_response", {
            chat_id: result.chat_id,
            last_read_message_id: result.last_read_message_id,
            advanced: result.advanced,
        });
    };

    handleEditMessage = async (socket: ChatSocket, data: unknown) => {
        const validation = editMessageSchema.safeParse(data);
        if (!validation.success) {
            throw new SocketError(validation.error.issues[0]!.message, false);
        }

        const input = validation.data;
        const updated = await this.servies!.MessageService.editMessageFromDb(
            socket.session!.user_id,
            input.chat_id,
            input.message_id,
            input.content,
        );

        this.sendEditMessageToChat(socket, updated);
    };
}

export default SocketService;
