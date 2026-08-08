import type { PrismaClient } from "../generated/prisma/client.js";
import type { Services } from "../middlewares/tenantMiddleware.js";
import { AppError } from "../middlewares/errorMiddleware.js";
import sharp from "sharp";

export type messageType = {
    type: "text";
    content: string;
    created_at: Date;
    sender_id: number;
    chat_id: number;
};

type chatType =
    | {
          id: number;
          type: "private";
          login_id: string;
          last_login_at: Date;
          lastMessage: MessageRow | null;
          pinned_message_id: number | null;
      }
    | {
          id: number;
          type: "group";
          name: string;
          lastMessage: MessageRow | null;
          pinned_message_id: number | null;
      }
    | {
          id: number;
          type: "channel";
          name: string;
          lastMessage: MessageRow | null;
          pinned_message_id: number | null;
      };

export type MessageRow = {
    id: number;
    chat_id: number;
    sender_id: number;
    message_type: string;
    message_data: messageType;
    created_at: Date;
};

class ChatService {
    public services?: Services;

    constructor(private prisma: PrismaClient) {}

    async index(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId,
                deleted_at: null,
            },
            select: {
                joinedChats: {
                    where: {
                        deleted_at: null,
                        chat: {
                            deleted_at: null,
                        },
                    },
                    select: {
                        chat: {
                            select: {
                                id: true,
                                type: true,
                                pinned_message_id: true,
                                chat_name: true,
                                description: true,
                                avatar_file_name: true,
                                members: {
                                    where: {
                                        user_id: {
                                            not: userId,
                                        },
                                        deleted_at: null,
                                        user: {
                                            deleted_at: null,
                                        },
                                    },
                                    take: 1,
                                    select: {
                                        user: {
                                            select: {
                                                id: true,
                                                login_id: true,
                                                last_login_at: true,
                                                userAvatar: {
                                                    select: {
                                                        avatar_file_name: true,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                                messages: {
                                    where: {
                                        deleted_at: null,
                                    },
                                    take: 1,
                                    orderBy: {
                                        created_at: "desc",
                                    },
                                    select: {
                                        id: true,
                                        chat_id: true,
                                        sender_id: true,
                                        message_type: true,
                                        message_data: true,
                                        created_at: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            throw new AppError("User not found", 500);
        }

        const chats: chatType[] = user.joinedChats.map((chatMember) => {
            const chat = chatMember.chat;
            const lastMessage = chat.messages[0]
                ? {
                    id: chat.messages[0].id,
                    message_type: chat.messages[0].message_type,
                    message_data: chat.messages[0].message_data as unknown as messageType,
                    created_at: chat.messages[0].created_at,
                    sender_id: chat.messages[0].sender_id,
                    chat_id: chat.messages[0].chat_id,
                }
                : null;

            if (chat.type === "private") {
                if (!chat.members[0]) {
                    throw new AppError("Private chat has no members", 500);
                }
                return {
                    id: userId,
                    type: "private",
                    login_id: chat.members[0].user.login_id,
                    avatar_file_name: chat.members[0].user.userAvatar[0]?.avatar_file_name,
                    last_login_at: chat.members[0].user.last_login_at,
                    lastMessage: lastMessage,
                    pinned_message_id: chat.pinned_message_id,
                };
            } else if (chat.type === "group") {
                return {
                    id: chat.id,
                    type: "group",
                    name: chat.chat_name!,
                    description: chat.description,
                    avatar_file_name: chat.avatar_file_name,
                    lastMessage: lastMessage,
                    pinned_message_id: chat.pinned_message_id,
                };
            } else if (chat.type === "channel") {
                return {
                    id: chat.id,
                    type: "channel",
                    name: chat.chat_name!,
                    description: chat.description,
                    avatar_file_name: chat.avatar_file_name,
                    lastMessage: lastMessage,
                    pinned_message_id: chat.pinned_message_id,
                };
            } else {
                throw new AppError("Invalid chat type", 500);
            }
        });

        return chats;
    }

    async show(userId: number, chatId: number) {
        const chatMember = await this.prisma.chatMember.findFirst({
            where: {
                user_id: userId,
                deleted_at: null,
                chat: {
                    id: chatId,
                    deleted_at: null,
                },
            },
            select: {
                chat: {
                    select: {
                        id: true,
                        type: true,
                        chat_name: true,
                        description: true,
                        avatar_file_name: true,
                        pinned_message_id: true,
                        members: {
                            where: {
                                deleted_at: null,
                                user_id: {
                                    not: userId,
                                },
                                user: {
                                    deleted_at: null,
                                },
                            },
                            take: 1,
                            select: {
                                user: {
                                    select: {
                                        id: true,
                                        login_id: true,
                                        last_login_at: true,
                                        userAvatar: {
                                            select: {
                                                avatar_file_name: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        messages: {
                            where: {
                                deleted_at: null,
                            },
                            take: 1,
                            orderBy: {
                                created_at: "desc",
                            },
                            select: {
                                id: true,
                                chat_id: true,
                                sender_id: true,
                                message_type: true,
                                message_data: true,
                                created_at: true,
                            },
                        },
                    },
                },
            },
        });

        if (!chatMember) {
            throw new AppError("مکالمه پیدا نشد", 404);
        }

        const chat = chatMember.chat;
        if (chat === undefined) {
            throw new AppError("Chat not found", 500);
        }

        const lastMessage = chat.messages[0]
            ? {
                  message_type: chat.messages[0].message_type,
                  message_data: chat.messages[0].message_data as unknown as messageType,
                  created_at: chat.messages[0].created_at,
                  sender_id: chat.messages[0].sender_id,
                  chat_id: chat.messages[0].chat_id,
              }
            : null;

        if (chat.type === "private") {
            if (!chat.members[0]) {
                throw new AppError("Private chat has no members", 500);
            }
            return {
                id: userId,
                type: "private",
                login_id: chat.members[0].user.login_id,
                avatar_file_name: chat.members[0].user.userAvatar[0]?.avatar_file_name,
                last_login_at: chat.members[0].user.last_login_at,
                lastMessage: lastMessage,
                pinned_message_id: chat.pinned_message_id,
            };
        } else if (chat.type === "group") {
            return {
                id: chat.id,
                type: "group",
                name: chat.chat_name,
                description: chat.description,
                avatar_file_name: chat.avatar_file_name,
                lastMessage: lastMessage,
                pinned_message_id: chat.pinned_message_id,
            };
        } else if (chat.type === "channel") {
            return {
                id: chat.id,
                type: "channel",
                name: chat.chat_name,
                description: chat.description,
                avatar_file_name: chat.avatar_file_name,
                lastMessage: lastMessage,
                pinned_message_id: chat.pinned_message_id,
            };
        } else {
            throw new AppError("Invalid chat type", 500);
        }
    }

    async create(userId: number, type: "group" | "channel", chat_name: string) {
        if (["group", "channel"].includes(type) === false) {
            throw new AppError("Invalid chat type", 400);
        }

        const chat = await this.prisma.chat.create({
            data: {
                type: type,
                chat_name: chat_name,
                members: {
                    create: {
                        user_id: userId,
                        deleted_at: null,
                    },
                },
            },
        });

        return {
            id: chat.id,
            type: chat.type,
            name: chat.chat_name,
            lastMessage: null,
            pinned_message_id: null,
        };
    }

    async update(
        userId: number,
        chatId: number,
        chat_name: string | null,
        description: string | null,
    ) {
        const data: {
            chat_name?: string;
            description?: string;
        } = {};
        if (chat_name !== null) {
            data.chat_name = chat_name;
        }
        if (description !== null) {
            data.description = description;
        }
        const result = await this.prisma.chat.updateMany({
            where: {
                id: chatId,
                type: {
                    in: ["group", "channel"],
                },
                members: {
                    some: {
                        user_id: userId,
                        deleted_at: null,
                    },
                },
                deleted_at: null,
            },
            data: data,
        });

        if (result.count === 0) {
            throw new AppError("مکالمه مربوطه پیدا نشد", 404);
        }
    }

    async isUserJoinedToChat(userId: number, chatId: number) {
        const chatMember = await this.prisma.chatMember.findFirst({
            where: {
                user_id: userId,
                chat_id: chatId,
                deleted_at: null,
            },
        });

        return Boolean(chatMember);
    }

    async getUserChatIdsByUserID(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId,
                deleted_at: null,
            },
            select: {
                joinedChats: {
                    where: {
                        deleted_at: null,
                    },
                    select: {
                        chat_id: true,
                    },
                },
            },
        });

        if (!user) {
            throw new AppError("User not found", 500);
        }

        const messageIds = user.joinedChats.map((chat: { chat_id: number }) => chat.chat_id);

        return messageIds;
    }

    async uploadAvatar(file: Express.Multer.File, chatId: number, userId: number) {
        const chat = await this.getChatByIdAndUserId(chatId, userId);
        if (!chat) {
            throw new AppError("مکالمه مربوطه پیدا نشد", 404);
        }

        if (!["group", "channel"].includes(chat.type)) {
            throw new AppError("مکالمه مربوطه پیدا نشد", 404);
        }

        const sharpedImage = await sharp(file.buffer)
            .autoOrient()
            .resize({ width: 512, height: 512, fit: "cover" })
            .webp({
                quality: 80,
            })
            .toBuffer();

        const fileName = await this.services!.MinIOService.uploadChatAvatar(sharpedImage, chatId);

        await this.updateChatAvatar(chatId, fileName);
    }

    async updateChatAvatar(chatid: number, fileName: string) {
        const result = await this.prisma.chat.updateMany({
            where: {
                id: chatid,
                deleted_at: null,
            },
            data: {
                avatar_file_name: fileName,
            },
        });

        if (result.count != 1) {
            throw new AppError("Chat not found", 500);
        }
    }

    async getChatByIdAndUserId(chatId: number, userId: number) {
        const result = await this.prisma.chat.findFirst({
            where: {
                id: chatId,
                deleted_at: null,
                owner_id: userId,
            },
        });

        return result;
    }
}

export default ChatService;
