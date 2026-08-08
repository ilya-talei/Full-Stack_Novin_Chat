import { Prisma, type PrismaClient } from "../generated/prisma/client.js";
import { AppError } from "../middlewares/errorMiddleware.js";
import type { Services } from "../middlewares/tenantMiddleware.js";
import type { messageType } from "./chatService.js";

export type SendMessageDataType = {
    // id: number,
    chat_id: number;
    message_type: "text";
    message_uuid: string;
    message_data: messageType;
};

type SavedMessagePrivateChat = {
    id: number | null;
    type: "private";
    login_id: string | null;
};

type SavedMessageNonPrivateChat = {
    id: number;
    type: "group" | "channel";
    chat_name: string | null;
};

type SavedMessageChat = SavedMessagePrivateChat | SavedMessageNonPrivateChat;

export type SaveMessageToDbReturnType = {
    id: number;
    message_uuid?: string;
    chat: SavedMessageChat;
    sender: {
        id: number;
        login_id: string;
    };
    message_type: string;
    message_data: messageType | Prisma.JsonValue;
    created_at: Date;
};

class MessageService {
    public services?: Services;
    constructor(private prisma: PrismaClient) {}

    async index(
        userId: number,
        chatId: number,
        limit: number,
        before: number | null,
        after: number | null,
    ) {
        const joinedChat = await this.prisma.chatMember.findFirst({
            where: {
                user_id: userId,
                chat_id: chatId,
                deleted_at: null,
            },
            select: {
                id: true,
            },
        });

        if (!joinedChat) {
            throw new AppError("عدم دسترسی", 403);
        }

        const where: Prisma.MessageWhereInput = {
            chat_id: chatId,
            deleted_at: null,
        };

        if (before !== null) {
            where.id = {
                lt: before,
            };
        } else if (after !== null) {
            where.id = {
                gt: after,
            };
        }

        const messages = await this.prisma.message.findMany({
            where: where,
            orderBy: {
                id: after !== null ? "asc" : "desc",
            },
            select: {
                id: true,
                chat_id: true,
                sender: {
                    select: {
                        id: true,
                        login_id: true,
                        last_login_at: true,
                        deleted_at: true,
                        userAvatar: {
                            select: {
                                avatar_file_name: true,
                            }
                        }
                    },
                },
                message_type: true,
                message_data: true,
                created_at: true,
            },
            take: limit,
        });

        const messagesWithoutDeleted = messages.map((message) => {
            if (message.sender.deleted_at !== null) {
                return {
                    ...message,
                    sender: {
                        id: message.sender.id,
                        login_id: "deleted_user",
                        last_login_at: null,
                        userAvatar: null,
                    },
                };
            }

            return {
                ...message,
                sender: {
                    id: message.sender.id,
                    login_id: message.sender.login_id,
                    last_login_at: message.sender.last_login_at,
                    userAvatar: message.sender.userAvatar,
                },
            };
        });

        // Attach read receipts for own messages (respect privacy.readReceipts)
        const peer = await this.prisma.chatMember.findFirst({
            where: {
                chat_id: chatId,
                user_id: { not: userId },
                deleted_at: null,
            },
            select: { user_id: true, last_read_message_id: true },
        });

        let showReceipts = true;
        if (peer && this.services?.SettingsService) {
            const [selfPrivacy, peerPrivacy] = await Promise.all([
                this.services.SettingsService.getPrivacy(userId),
                this.services.SettingsService.getPrivacy(peer.user_id),
            ]);
            showReceipts = selfPrivacy.readReceipts && peerPrivacy.readReceipts;
        }

        const peerLastRead = peer?.last_read_message_id ?? null;

        return messagesWithoutDeleted.map((message) => {
            const isMine = message.sender.id === userId;
            const read =
                isMine && showReceipts && peerLastRead != null
                    ? message.id <= peerLastRead
                    : false;
            return { ...message, read };
        });
    }

    async saveMessageToDb(
        userId: number,
        message: SendMessageDataType,
    ): Promise<SaveMessageToDbReturnType> {
        const isJoinedToChat: boolean = await this.services!.ChatService.isUserJoinedToChat(
            userId,
            message.chat_id,
        );
        if (!isJoinedToChat) {
            throw new AppError("دسترسی ممنوع", 403);
        }

        message.message_data.sender_id = userId;
        message.message_data.chat_id = message.chat_id;

        let newMessage;

        try {
            newMessage = await this.prisma.message.create({
                data: {
                    sender_id: userId,
                    chat_id: message.chat_id,
                    message_type: message.message_type,
                    message_uuid: message.message_uuid,
                    message_data: message.message_data,
                },
                select: {
                    id: true,
                    message_uuid: true,
                    chat: {
                        select: {
                            id: true,
                            type: true,
                            chat_name: true,
                            members: {
                                take: 1,
                                where: {
                                    user_id: {
                                        not: userId,
                                    },
                                    deleted_at: null,
                                },
                                select: {
                                    user: {
                                        select: {
                                            id: true,
                                            login_id: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    sender: {
                        select: {
                            id: true,
                            login_id: true,
                            userAvatar: {
                                select: {
                                    avatar_file_name: true,
                                },
                            },
                        },
                    },
                    message_type: true,
                    message_data: true,
                    created_at: true,
                },
            });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code == "P2002" &&
                "message_uuid" in (error.meta?.target as string[])
            ) {
                newMessage = await this.prisma.message.findFirst({
                    where: {
                        message_uuid: message.message_uuid,
                        sender_id: userId,
                        deleted_at: null,
                    },
                    select: {
                        id: true,
                        message_uuid: true,
                        chat: {
                            select: {
                                id: true,
                                type: true,
                                chat_name: true,
                                members: {
                                    take: 1,
                                    where: {
                                        user_id: {
                                            not: userId,
                                        },
                                        deleted_at: null,
                                    },
                                    select: {
                                        user: {
                                            select: {
                                                id: true,
                                                login_id: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        sender: {
                            select: {
                                id: true,
                                login_id: true,
                                userAvatar: {
                                    select: {
                                        avatar_file_name: true,
                                    },
                                },
                            },
                        },
                        message_type: true,
                        message_data: true,
                        created_at: true,
                    },
                });
                if (!newMessage) {
                    throw new AppError("دسترسی ممنوع", 403);
                }
            } else {
                throw error;
            }
        }

        if (newMessage.chat.type == "private") {
            return {
                ...newMessage,
                chat: {
                    id: newMessage.chat.id,
                    type: "private" as const,
                    login_id: newMessage.chat.members[0]?.user.login_id ?? null,
                },
            };
        } else {
            return {
                ...newMessage,
                chat: {
                    id: newMessage.chat.id,
                    type: newMessage.chat.type as "group" | "channel",
                    chat_name: newMessage.chat.chat_name,
                },
            };
        }
    }

    async deleteMessageFromDb(userId: number, chatId: number, messageId: number) {
        const message = await this.prisma.message.findFirst({
            where: {
                id: messageId,
                chat_id: chatId,
                deleted_at: null,
            },
            select: {
                id: true,
                sender_id: true,
                chat: {
                    select: {
                        owner_id: true,
                    },
                },
            },
        });

        if (!message) {
            throw new AppError("پیام یافت نشد", 404);
        }

        if (message.sender_id !== userId && message.chat.owner_id !== userId) {
            throw new AppError("دسترسی ممنوع", 403);
        }

        await this.prisma.message.update({
            where: {
                id: messageId,
            },
            data: {
                deleted_at: new Date(),
            },
        });

        return true;
    }

    async editMessageFromDb(
        userId: number,
        chatId: number,
        messageId: number,
        content: string,
    ): Promise<SaveMessageToDbReturnType> {
        const trimmed = String(content || "").trim();
        if (!trimmed) {
            throw new AppError("پیام خالی است", 400);
        }
        if (trimmed.length > 4096) {
            throw new AppError("پیام بیش از حد طولانی است", 400);
        }

        const message = await this.prisma.message.findFirst({
            where: {
                id: messageId,
                chat_id: chatId,
                deleted_at: null,
            },
            select: {
                id: true,
                sender_id: true,
                message_type: true,
                message_uuid: true,
                message_data: true,
                created_at: true,
                chat: {
                    select: {
                        id: true,
                        type: true,
                        chat_name: true,
                        members: {
                            where: {
                                deleted_at: null,
                                user_id: { not: userId },
                                user: { deleted_at: null },
                            },
                            take: 1,
                            select: {
                                user: {
                                    select: {
                                        login_id: true,
                                    },
                                },
                            },
                        },
                    },
                },
                sender: {
                    select: {
                        id: true,
                        login_id: true,
                    },
                },
            },
        });

        if (!message) {
            throw new AppError("پیام یافت نشد", 404);
        }

        if (message.sender_id !== userId) {
            throw new AppError("فقط فرستنده می‌تواند پیام را ویرایش کند", 403);
        }

        const prevData =
            message.message_data && typeof message.message_data === "object"
                ? (message.message_data as Record<string, unknown>)
                : {};

        const nextData = {
            ...prevData,
            type: "text",
            content: trimmed,
            edited: true,
            edited_at: new Date().toISOString(),
            chat_id: chatId,
            sender_id: userId,
        };

        const updated = await this.prisma.message.update({
            where: { id: messageId },
            data: {
                message_data: nextData as Prisma.InputJsonValue,
            },
            select: {
                id: true,
                message_uuid: true,
                message_type: true,
                message_data: true,
                created_at: true,
                updated_at: true,
            },
        });

        const chat = message.chat;
        if (chat.type === "private") {
            return {
                id: updated.id,
                message_uuid: updated.message_uuid,
                message_type: updated.message_type,
                message_data: updated.message_data as messageType,
                created_at: updated.created_at,
                sender: {
                    id: message.sender.id,
                    login_id: message.sender.login_id,
                },
                chat: {
                    id: chat.id,
                    type: "private" as const,
                    login_id: chat.members[0]?.user.login_id ?? null,
                },
            };
        }

        return {
            id: updated.id,
            message_uuid: updated.message_uuid,
            message_type: updated.message_type,
            message_data: updated.message_data as messageType,
            created_at: updated.created_at,
            sender: {
                id: message.sender.id,
                login_id: message.sender.login_id,
            },
            chat: {
                id: chat.id,
                type: chat.type as "group" | "channel",
                chat_name: chat.chat_name,
            },
        };
    }
}

export default MessageService;
