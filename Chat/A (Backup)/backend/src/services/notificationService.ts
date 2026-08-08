import type { PrismaClient, Prisma } from "../generated/prisma/client.js";
import { AppError } from "../middlewares/errorMiddleware.js";

class NotificationService {
    constructor(private prisma: PrismaClient) {}

    async list(userId: number) {
        const rows = await this.prisma.notification.findMany({
            where: { user_id: userId, deleted_at: null },
            orderBy: { created_at: "desc" },
            take: 100,
        });

        return rows.map((row) => ({
            id: String(row.id),
            type: row.type,
            title: row.title,
            body: row.body,
            read: row.read,
            createdAt: row.created_at,
            meta: row.meta,
        }));
    }

    async create(
        userId: number,
        data: {
            type: string;
            title: string;
            body: string;
            meta?: Prisma.InputJsonValue;
        },
    ) {
        const row = await this.prisma.notification.create({
            data: {
                user_id: userId,
                type: data.type,
                title: data.title,
                body: data.body,
                meta: data.meta,
            },
        });

        return {
            id: String(row.id),
            type: row.type,
            title: row.title,
            body: row.body,
            read: row.read,
            createdAt: row.created_at,
            meta: row.meta,
        };
    }

    /** One unread message notification per chat — increments count, never stores message text. */
    async upsertMessageNotification(
        userId: number,
        data: {
            chatId: number;
            senderId: number;
            senderName: string;
            messageId?: number;
        },
    ) {
        const existing = await this.prisma.notification.findFirst({
            where: {
                user_id: userId,
                type: "message",
                read: false,
                deleted_at: null,
                AND: [
                    { meta: { path: ["chat_id"], equals: data.chatId } },
                    { meta: { path: ["sender_id"], equals: data.senderId } },
                ],
            },
            orderBy: { created_at: "desc" },
        });

        const prevMeta =
            existing?.meta && typeof existing.meta === "object" && !Array.isArray(existing.meta)
                ? (existing.meta as Record<string, unknown>)
                : {};
        const count = (typeof prevMeta.count === "number" ? prevMeta.count : 0) + 1;
        const title = data.senderName;
        const body = `آقای ${data.senderName}، ${count} پیام ارسال کرده`;
        const meta: Prisma.InputJsonValue = {
            chat_id: data.chatId,
            sender_id: data.senderId,
            sender_name: data.senderName,
            message_id: data.messageId ?? null,
            count,
        };

        if (existing) {
            const row = await this.prisma.notification.update({
                where: { id: existing.id },
                data: { title, body, meta, updated_at: new Date() },
            });
            return {
                id: String(row.id),
                type: row.type,
                title: row.title,
                body: row.body,
                read: row.read,
                createdAt: row.created_at,
                meta: row.meta,
            };
        }

        return this.create(userId, { type: "message", title, body, meta });
    }

    async markAsRead(userId: number, id: number) {
        const result = await this.prisma.notification.updateMany({
            where: { id, user_id: userId, deleted_at: null },
            data: { read: true },
        });
        if (result.count === 0) {
            throw new AppError("اعلان یافت نشد", 404);
        }
    }

    async markAllAsRead(userId: number) {
        await this.prisma.notification.updateMany({
            where: { user_id: userId, deleted_at: null, read: false },
            data: { read: true },
        });
    }

    async delete(userId: number, id: number) {
        const result = await this.prisma.notification.updateMany({
            where: { id, user_id: userId, deleted_at: null },
            data: { deleted_at: new Date() },
        });
        if (result.count === 0) {
            throw new AppError("اعلان یافت نشد", 404);
        }
    }

    async deleteAll(userId: number) {
        await this.prisma.notification.updateMany({
            where: { user_id: userId, deleted_at: null },
            data: { deleted_at: new Date() },
        });
    }
}

export default NotificationService;
