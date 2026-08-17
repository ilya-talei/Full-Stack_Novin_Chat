import type { PrismaClient } from "../generated/prisma/client.js";
import type { Services } from "../middlewares/tenantMiddleware.js";
import { AppError } from "../middlewares/errorMiddleware.js";
import sharp from "sharp";
import {
    assertManagementAccess,
    assertSendPermission,
    DEFAULT_CHANNEL_PERMISSIONS,
    effectivePermissions,
    getChatAccess,
    uploadKindPermission,
} from "./chatPermissions.js";

export type messageType = {
    type: "text";
    content: string;
    created_at: Date;
    sender_id: number;
    chat_id: number;
    edited?: boolean;
    edited_at?: Date | string;
};

export type MessageRow = {
    id: number;
    chat_id: number;
    sender_id: number;
    message_type: string;
    message_data: messageType;
    created_at: Date;
};

function privateChatKey(userA: number, userB: number) {
    const [a, b] = userA < userB ? [userA, userB] : [userB, userA];
    return `${a}_${b}`;
}

class ChatService {
    public services?: Services;

    constructor(private prisma: PrismaClient) {}

    private async unreadCount(chatId: number, lastReadMessageId: number | null | undefined) {
        return this.prisma.message.count({
            where: {
                chat_id: chatId,
                deleted_at: null,
                ...(lastReadMessageId ? { id: { gt: lastReadMessageId } } : {}),
            },
        });
    }

    private async memberCount(chatId: number) {
        return this.prisma.chatMember.count({
            where: { chat_id: chatId, deleted_at: null },
        });
    }

    async index(userId: number) {
        const memberships = await this.prisma.chatMember.findMany({
            where: {
                user_id: userId,
                deleted_at: null,
                chat: { deleted_at: null },
            },
            select: {
                last_read_message_id: true,
                role: true,
                admin_permissions: true,
                member_permissions: true,
                chat: {
                    select: {
                        id: true,
                        type: true,
                        owner_id: true,
                        default_permissions: true,
                        pinned_message_id: true,
                        chat_name: true,
                        description: true,
                        avatar_file_name: true,
                        members: {
                            where: {
                                user_id: { not: userId },
                                deleted_at: null,
                                user: { deleted_at: null },
                            },
                            take: 1,
                            select: {
                                user: {
                                    select: {
                                        id: true,
                                        login_id: true,
                                        display_name: true,
                                        last_login_at: true,
                                        userAvatar: {
                                            where: { deleted_at: null },
                                            take: 1,
                                            orderBy: { id: "desc" },
                                            select: { avatar_file_name: true },
                                        },
                                    },
                                },
                            },
                        },
                        messages: {
                            where: { deleted_at: null },
                            take: 1,
                            orderBy: { created_at: "desc" },
                            select: {
                                id: true,
                                chat_id: true,
                                sender_id: true,
                                message_type: true,
                                message_data: true,
                                created_at: true,
                            },
                        },
                        _count: {
                            select: {
                                members: {
                                    where: { deleted_at: null },
                                },
                            },
                        },
                    },
                },
            },
        });

        const chats = await Promise.all(
            memberships.map(async (membership) => {
                const chat = membership.chat;
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

                const unread = await this.unreadCount(chat.id, membership.last_read_message_id);

                if (chat.type === "private") {
                    const other = chat.members[0]?.user;
                    if (!other) {
                        throw new AppError("Private chat has no members", 500);
                    }
                    return {
                        id: chat.id,
                        type: "private" as const,
                        login_id: other.login_id,
                        name: other.display_name || other.login_id,
                        peer_user_id: other.id,
                        last_login_at: other.last_login_at,
                        avatar_file_name: other.userAvatar[0]?.avatar_file_name ?? null,
                        lastMessage,
                        pinned_message_id: chat.pinned_message_id,
                        unread,
                        memberCount: 2,
                        role: "member" as const,
                        permissions: {},
                        canManage: false,
                    };
                }

                if (chat.type === "group" || chat.type === "channel") {
                    const access = await getChatAccess(this.prisma, chat.id, userId);
                    const role = access.role;
                    return {
                        id: chat.id,
                        type: chat.type as "group" | "channel",
                        name: chat.chat_name!,
                        description: chat.description,
                        avatar_file_name: chat.avatar_file_name,
                        lastMessage,
                        pinned_message_id: chat.pinned_message_id,
                        unread,
                        memberCount: chat._count.members,
                        subscriberCount: chat.type === "channel" ? chat._count.members : undefined,
                        role,
                        permissions: effectivePermissions(access),
                        canManage: role === "owner" || role === "admin",
                    };
                }

                throw new AppError("Invalid chat type", 500);
            }),
        );

        return chats;
    }

    async show(userId: number, chatId: number) {
        const membership = await this.prisma.chatMember.findFirst({
            where: {
                user_id: userId,
                deleted_at: null,
                chat: { id: chatId, deleted_at: null },
            },
            select: {
                last_read_message_id: true,
                role: true,
                admin_permissions: true,
                member_permissions: true,
                chat: {
                    select: {
                        id: true,
                        type: true,
                        owner_id: true,
                        default_permissions: true,
                        chat_name: true,
                        description: true,
                        avatar_file_name: true,
                        pinned_message_id: true,
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
                                        id: true,
                                        login_id: true,
                                        display_name: true,
                                        last_login_at: true,
                                        userAvatar: {
                                            where: { deleted_at: null },
                                            take: 1,
                                            orderBy: { id: "desc" },
                                            select: { avatar_file_name: true },
                                        },
                                    },
                                },
                            },
                        },
                        messages: {
                            where: { deleted_at: null },
                            take: 1,
                            orderBy: { created_at: "desc" },
                            select: {
                                id: true,
                                chat_id: true,
                                sender_id: true,
                                message_type: true,
                                message_data: true,
                                created_at: true,
                            },
                        },
                        _count: {
                            select: { members: { where: { deleted_at: null } } },
                        },
                    },
                },
            },
        });

        if (!membership) {
            throw new AppError("مکالمه پیدا نشد", 404);
        }

        const chat = membership.chat;
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
        const unread = await this.unreadCount(chat.id, membership.last_read_message_id);

        if (chat.type === "private") {
            const other = chat.members[0]?.user;
            if (!other) throw new AppError("Private chat has no members", 500);
            return {
                id: chat.id,
                type: "private" as const,
                login_id: other.login_id,
                name: other.display_name || other.login_id,
                peer_user_id: other.id,
                last_login_at: other.last_login_at,
                avatar_file_name: other.userAvatar[0]?.avatar_file_name ?? null,
                lastMessage,
                pinned_message_id: chat.pinned_message_id,
                unread,
                memberCount: 2,
                role: "member" as const,
                permissions: {},
                canManage: false,
            };
        }

        const access = await getChatAccess(this.prisma, chatId, userId);
        return {
            id: chat.id,
            type: chat.type as "group" | "channel",
            name: chat.chat_name,
            description: chat.description,
            avatar_file_name: chat.avatar_file_name,
            lastMessage,
            pinned_message_id: chat.pinned_message_id,
            unread,
            memberCount: chat._count.members,
            subscriberCount: chat.type === "channel" ? chat._count.members : undefined,
            role: access.role,
            permissions: effectivePermissions(access),
            canManage: access.role === "owner" || access.role === "admin",
        };
    }

    async create(
        userId: number,
        type: "group" | "channel",
        chat_name: string,
        description = "",
        memberIds: number[] = [],
    ) {
        const uniqueMemberIds = [...new Set(memberIds.filter((id) => id !== userId))];

        if (uniqueMemberIds.length > 0) {
            const found = await this.prisma.user.count({
                where: {
                    id: { in: uniqueMemberIds },
                    active: true,
                    deleted_at: null,
                },
            });
            if (found !== uniqueMemberIds.length) {
                throw new AppError("یک یا چند عضو نامعتبر است", 400);
            }
        }

        const chat = await this.prisma.chat.create({
            data: {
                type,
                chat_name,
                description: description ?? "",
                owner_id: userId,
                ...(type === "channel" ? { default_permissions: DEFAULT_CHANNEL_PERMISSIONS } : {}),
                members: {
                    create: [
                        { user_id: userId, role: "owner" },
                        ...uniqueMemberIds.map((id) => ({ user_id: id })),
                    ],
                },
            },
        });

        return {
            id: chat.id,
            type: chat.type,
            name: chat.chat_name,
            description: chat.description,
            lastMessage: null,
            pinned_message_id: null,
            unread: 0,
            memberCount: uniqueMemberIds.length + 1,
        };
    }

    async createPrivate(userId: number, otherUserId: number) {
        if (userId === otherUserId) {
            throw new AppError("نمی‌توانید با خودتان چت بسازید", 400);
        }

        const other = await this.prisma.user.findFirst({
            where: { id: otherUserId, active: true, deleted_at: null },
        });
        if (!other) {
            throw new AppError("کاربر یافت نشد", 404);
        }

        const key = privateChatKey(userId, otherUserId);
        const existing = await this.prisma.chat.findFirst({
            where: {
                private_chat_key: key,
                deleted_at: null,
            },
        });

        if (existing) {
            return this.show(userId, existing.id);
        }

        const chat = await this.prisma.chat.create({
            data: {
                type: "private",
                private_chat_key: key,
                members: {
                    create: [{ user_id: userId }, { user_id: otherUserId }],
                },
            },
        });

        return this.show(userId, chat.id);
    }

    async update(
        userId: number,
        chatId: number,
        chat_name: string | null,
        description: string | null,
    ) {
        await assertManagementAccess(this.prisma, chatId, userId, "change_info");
        const data: { chat_name?: string; description?: string } = {};
        if (chat_name !== null) data.chat_name = chat_name;
        if (description !== null) data.description = description;

        const result = await this.prisma.chat.updateMany({
            where: {
                id: chatId,
                type: { in: ["group", "channel"] },
                deleted_at: null,
            },
            data,
        });

        if (result.count === 0) {
            throw new AppError("مکالمه مربوطه پیدا نشد", 404);
        }
    }

    async markAsRead(userId: number, chatId: number, messageId?: number) {
        const membership = await this.prisma.chatMember.findFirst({
            where: {
                user_id: userId,
                chat_id: chatId,
                deleted_at: null,
            },
            include: {
                chat: {
                    select: {
                        id: true,
                        type: true,
                    },
                },
            },
        });
        if (!membership) {
            throw new AppError("عدم دسترسی", 403);
        }

        let lastRead = messageId;
        if (!lastRead) {
            const latest = await this.prisma.message.findFirst({
                where: { chat_id: chatId, deleted_at: null },
                orderBy: { id: "desc" },
                select: { id: true },
            });
            lastRead = latest?.id;
        }

        if (!lastRead) {
            return {
                success: true,
                unread: 0,
                advanced: false,
                chat_id: chatId,
                reader_id: userId,
                last_read_message_id: membership.last_read_message_id,
                chat_type: membership.chat.type,
                notify: false,
            };
        }

        const prev = membership.last_read_message_id ?? 0;
        const advanced = lastRead > prev;

        if (advanced) {
            await this.prisma.chatMember.update({
                where: { id: membership.id },
                data: { last_read_message_id: lastRead },
            });
        }

        let notify = false;
        if (advanced && membership.chat.type === "private" && this.services?.SettingsService) {
            const peer = await this.prisma.chatMember.findFirst({
                where: {
                    chat_id: chatId,
                    user_id: { not: userId },
                    deleted_at: null,
                },
                select: { user_id: true },
            });
            if (peer) {
                const [selfPrivacy, peerPrivacy] = await Promise.all([
                    this.services.SettingsService.getPrivacy(userId),
                    this.services.SettingsService.getPrivacy(peer.user_id),
                ]);
                notify = selfPrivacy.readReceipts !== false && peerPrivacy.readReceipts !== false;
            }
        }

        return {
            success: true,
            unread: 0,
            advanced,
            chat_id: chatId,
            reader_id: userId,
            last_read_message_id: advanced ? lastRead : membership.last_read_message_id,
            chat_type: membership.chat.type,
            notify,
        };
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
        const rows = await this.prisma.chatMember.findMany({
            where: { user_id: userId, deleted_at: null },
            select: { chat_id: true },
        });
        return rows.map((row) => row.chat_id);
    }

    async uploadAvatar(file: Express.Multer.File, chatId: number, userId: number) {
        await assertManagementAccess(this.prisma, chatId, userId, "change_info");
        const membership = await this.prisma.chatMember.findFirst({
            where: {
                chat_id: chatId,
                user_id: userId,
                deleted_at: null,
                chat: {
                    deleted_at: null,
                    type: { in: ["group", "channel"] },
                },
            },
            include: { chat: true },
        });
        if (!membership) {
            throw new AppError("مکالمه مربوطه پیدا نشد", 404);
        }

        const sharpedImage = await sharp(file.buffer)
            .autoOrient()
            .resize({ width: 512, height: 512, fit: "cover" })
            .webp({ quality: 80 })
            .toBuffer();

        const fileName = await this.services!.MinIOService.uploadChatAvatar(sharpedImage, chatId);
        await this.updateChatAvatar(chatId, fileName);
        return fileName;
    }

    async assertMember(chatId: number, userId: number) {
        const membership = await this.prisma.chatMember.findFirst({
            where: {
                chat_id: chatId,
                user_id: userId,
                deleted_at: null,
                chat: { deleted_at: null },
            },
        });
        if (!membership) {
            throw new AppError("مکالمه مربوطه پیدا نشد", 404);
        }
        return membership;
    }

    /**
     * Store chat attachment. Prefer MinIO; fall back to local disk.
     */
    async uploadChatMedia(
        file: Express.Multer.File,
        chatId: number,
        userId: number,
        kind: string,
        tenantId: number,
    ) {
        await assertSendPermission(this.prisma, chatId, userId, uploadKindPermission(kind));

        const mime = file.mimetype || "application/octet-stream";
        const originalName = file.originalname || "file";
        let fileName = "";
        let storage: "minio" | "local" = "local";

        try {
            const uploaded = await this.services!.MinIOService.uploadChatMedia(file.buffer, {
                chatId,
                userId,
                originalName,
                mimeType: mime,
            });
            fileName = uploaded.fileName;
            storage = "minio";
        } catch {
            const { saveLocalChatMedia } = await import("./localChatMedia.js");
            const saved = await saveLocalChatMedia({
                tenantId,
                chatId,
                originalName,
                mimeType: mime,
                buffer: file.buffer,
            });
            fileName = saved.fileName;
            storage = "local";
        }

        return {
            fileName,
            storage,
            kind,
            mimeType: mime,
            size: file.size,
            originalName,
            path: `/chats/${chatId}/media/${encodeURIComponent(fileName)}?storage=${storage}`,
        };
    }

    async getChatMediaStream(
        chatId: number,
        userId: number,
        fileName: string,
        storage: string,
        tenantId: number,
    ) {
        await this.assertMember(chatId, userId);
        const safe = String(fileName || "").replace(/[/\\]/g, "");
        if (!safe) throw new AppError("فایل نامعتبر است", 400);

        if (storage === "minio") {
            try {
                const stream = await this.services!.MinIOService.getChatMediaObject(safe);
                let contentType = "application/octet-stream";
                try {
                    const stat = await this.services!.MinIOService.statChatMedia(safe);
                    contentType = String(stat.metaData?.["content-type"] || contentType);
                } catch {
                    /* ignore */
                }
                return { stream, contentType };
            } catch {
                throw new AppError("فایل پیدا نشد", 404);
            }
        }

        const { openLocalChatMedia, guessMimeFromName } = await import("./localChatMedia.js");
        const stream = openLocalChatMedia(tenantId, chatId, safe);
        if (!stream) throw new AppError("فایل پیدا نشد", 404);
        return { stream, contentType: guessMimeFromName(safe) };
    }

    async updateChatAvatar(chatid: number, fileName: string) {
        const result = await this.prisma.chat.updateMany({
            where: { id: chatid, deleted_at: null },
            data: { avatar_file_name: fileName },
        });
        if (result.count != 1) {
            throw new AppError("Chat not found", 500);
        }
    }

    async getChatByIdAndUserId(chatId: number, userId: number) {
        return this.prisma.chat.findFirst({
            where: {
                id: chatId,
                deleted_at: null,
                members: { some: { user_id: userId, deleted_at: null } },
            },
        });
    }
}

export default ChatService;
