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
            if (message.sender.deleted_at === null) {
                return {
                    ...message,
                    sender: {
                        id: null,
                        login_id: "deleted_user",
                        last_login_at: null,
                    },
                };
            }

            if (message.sender.deleted_at !== null) {
                return {
                    ...message,
                    sender: {
                        id: message.sender.id,
                        login_id: "deleted_user",
                        last_login_at: null,
                    },
                };
            }

            return {
                ...message,
                sender: {
                    id: message.sender.id,
                    login_id: message.sender.login_id,
                    last_login_at: message.sender.last_login_at,
                },
            };
        });

        return messagesWithoutDeleted;
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
                                    id: true,
                                    login_id: true,
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
                        chat: {
                            select: {
                                id: true,
                                type: true,
                                chat_name: true,
                                members: {
                                    take: 1,
                                    where: {
                                        id: {
                                            not: userId,
                                        },
                                    },
                                    select: {
                                        id: true,
                                        login_id: true,
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
                    id: newMessage.chat.members[0]?.id ?? null,
                    type: "private" as const,
                    login_id: newMessage.chat.members[0]?.login_id ?? null,
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
}

export default MessageService;
