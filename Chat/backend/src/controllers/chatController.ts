import type { Request, Response, NextFunction } from "express";
import { AppError } from "../middlewares/errorMiddleware.js";
import z from "zod";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import redis from "../config/redis.js";
import { broadcastMessagesRead } from "../utils/broadcastMessagesRead.js";

const chatIdValidation = (chatId: string | string[] | undefined) => {
    if (chatId === undefined || Array.isArray(chatId)) {
        throw new AppError("Chat ID is invalid", 400);
    }

    const chatIdNumber = Number(chatId);
    if (isNaN(chatIdNumber) || chatIdNumber <= 0) {
        throw new AppError("Chat ID must be a positive number", 400);
    }

    return chatIdNumber;
};

const createValidationSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("group"),
        chat_name: z.string().min(2).max(32),
        description: z.string().max(256).optional().default(""),
        member_ids: z.array(z.coerce.number().int().positive()).optional().default([]),
        memberIds: z.array(z.coerce.number().int().positive()).optional(),
    }),
    z.object({
        type: z.literal("channel"),
        chat_name: z.string().min(2).max(32),
        description: z.string().max(256).optional().default(""),
        member_ids: z.array(z.coerce.number().int().positive()).optional().default([]),
        memberIds: z.array(z.coerce.number().int().positive()).optional(),
    }),
    z.object({
        type: z.literal("private"),
        contact_id: z.coerce.number().int().positive().optional(),
        contactId: z.coerce.number().int().positive().optional(),
        user_id: z.coerce.number().int().positive().optional(),
    }),
]);

const updateValidationSchema = z.object({
    chat_name: z.string().min(2).max(32).optional(),
    description: z.string().max(256).optional(),
});

const startPrivateSchema = z.object({
    contactId: z.coerce.number().int().positive().optional(),
    contact_id: z.coerce.number().int().positive().optional(),
    user_id: z.coerce.number().int().positive().optional(),
});

export const chatAvatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024,
    },
});

export const chatMediaUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
});

const MEDIA_KINDS = new Set(["photo", "video", "file", "voice", "videonote", "sticker", "gif"]);

class ChatController {
    private async onlineSet(req: Request) {
        const onlineKey = `tenant:${req.tenant!.data.id}.online_users`;
        const online = await redis.smembers(onlineKey);
        return new Set(online.map(Number));
    }

    private withPresence<T extends { type?: string; peer_user_id?: number | null }>(
        chat: T,
        onlineUserIds: Set<number>,
    ): T & { online?: boolean } {
        if (chat.type !== "private" || chat.peer_user_id == null) {
            return { ...chat, online: false };
        }
        return {
            ...chat,
            online: onlineUserIds.has(Number(chat.peer_user_id)),
        };
    }

    index = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const chats = await req.tenant!.services.ChatService.index(req.userId!);
            const onlineUserIds = await this.onlineSet(req);
            res.status(200).json({
                data: chats.map((chat) => this.withPresence(chat, onlineUserIds)),
            });
        } catch (err) {
            next(err);
        }
    };

    show = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const chatId = chatIdValidation(req.params.chatId);
            const chat = await req.tenant!.services.ChatService.show(req.userId!, chatId);
            const onlineUserIds = await this.onlineSet(req);
            res.status(200).json({ data: this.withPresence(chat, onlineUserIds) });
        } catch (err) {
            next(err);
        }
    };

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const validation = createValidationSchema.safeParse(req.body);
            if (!validation.success) {
                throw new AppError(validation.error.issues[0]!.message, 400);
            }

            const userId = req.userId!;
            const payload = validation.data;

            if (payload.type === "private") {
                const otherId = payload.contact_id ?? payload.contactId ?? payload.user_id;
                if (!otherId) {
                    throw new AppError("شناسه مخاطب الزامی است", 400);
                }
                const chat = await req.tenant!.services.ChatService.createPrivate(userId, otherId);
                const onlineUserIds = await this.onlineSet(req);
                res.status(201).json({ data: this.withPresence(chat, onlineUserIds) });
                return;
            }

            const memberIds = payload.memberIds ?? payload.member_ids ?? [];
            const chat = await req.tenant!.services.ChatService.create(
                userId,
                payload.type,
                payload.chat_name,
                payload.description ?? "",
                memberIds,
            );
            res.status(201).json({ data: chat });
        } catch (err) {
            next(err);
        }
    };

    startPrivate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const validation = startPrivateSchema.safeParse(req.body);
            if (!validation.success) {
                throw new AppError(validation.error.issues[0]!.message, 400);
            }
            const otherId =
                validation.data.contactId ?? validation.data.contact_id ?? validation.data.user_id;
            if (!otherId) {
                throw new AppError("شناسه مخاطب الزامی است", 400);
            }
            const chat = await req.tenant!.services.ChatService.createPrivate(req.userId!, otherId);
            const onlineUserIds = await this.onlineSet(req);
            res.status(201).json({ data: this.withPresence(chat, onlineUserIds) });
        } catch (err) {
            next(err);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const validation = updateValidationSchema.safeParse(req.body);
            if (!validation.success) {
                throw new AppError(validation.error.issues[0]!.message, 400);
            }

            const chatId = chatIdValidation(req.params.chatId);
            await req.tenant!.services.ChatService.update(
                req.userId!,
                chatId,
                validation.data.chat_name ?? null,
                validation.data.description ?? null,
            );

            res.status(200).json({ message: "Chat updated successfully" });
        } catch (err) {
            next(err);
        }
    };

    markRead = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const chatId = chatIdValidation(req.params.chatId);
            const messageId =
                typeof req.body?.message_id === "number"
                    ? req.body.message_id
                    : typeof req.body?.messageId === "number"
                      ? req.body.messageId
                      : undefined;
            const result = await req.tenant!.services.ChatService.markAsRead(
                req.userId!,
                chatId,
                messageId,
            );

            if (result.notify && result.last_read_message_id) {
                broadcastMessagesRead(req.tenant!.data.id, {
                    chat_id: result.chat_id,
                    reader_id: result.reader_id,
                    last_read_message_id: result.last_read_message_id,
                    chat_type: result.chat_type,
                });
            }

            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    };

    uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const chatId = chatIdValidation(req.params.chatId);
            const file = req.file;
            if (!file) {
                throw new AppError("ارسال تصویر الزامی است", 400);
            }

            const fileType = await fileTypeFromBuffer(file.buffer);
            if (!fileType || !["image/png", "image/jpeg", "image/webp"].includes(fileType.mime)) {
                throw new AppError("فرمت های مجاز برای تصویر png و jpeg و webp هستند", 400);
            }

            const fileName = await req.tenant!.services.ChatService.uploadAvatar(
                file,
                chatId,
                req.userId!,
            );

            res.status(200).json({ avatar_file_name: fileName });
        } catch (error: unknown) {
            next(error);
        }
    };

    uploadMedia = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const chatId = chatIdValidation(req.params.chatId);
            const file = req.file;
            if (!file) {
                throw new AppError("ارسال فایل الزامی است", 400);
            }

            const kind = String(req.body?.kind || req.query?.kind || "file").toLowerCase();
            if (!MEDIA_KINDS.has(kind)) {
                throw new AppError("نوع رسانه نامعتبر است", 400);
            }

            const mime = file.mimetype || "";
            if (["photo", "sticker", "gif"].includes(kind) && !mime.startsWith("image/")) {
                throw new AppError("فقط تصویر مجاز است", 400);
            }
            if ((kind === "video" || kind === "videonote") && !mime.startsWith("video/")) {
                throw new AppError("فقط ویدیو مجاز است", 400);
            }
            if (
                kind === "voice" &&
                !mime.startsWith("audio/") &&
                mime !== "video/webm" &&
                mime !== "audio/webm"
            ) {
                throw new AppError("فقط صوت مجاز است", 400);
            }

            const result = await req.tenant!.services.ChatService.uploadChatMedia(
                file,
                chatId,
                req.userId!,
                kind,
                req.tenant!.data.id,
            );

            res.status(201).json(result);
        } catch (error: unknown) {
            next(error);
        }
    };

    getMedia = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const chatId = chatIdValidation(req.params.chatId);
            const fileName = String(req.params.fileName || "");
            const storage = String(req.query.storage || "local");

            const { stream, contentType } =
                await req.tenant!.services.ChatService.getChatMediaStream(
                    chatId,
                    req.userId!,
                    decodeURIComponent(fileName),
                    storage,
                    req.tenant!.data.id,
                );

            res.setHeader("Content-Type", contentType);
            res.setHeader("Cache-Control", "private, max-age=86400");
            stream.pipe(res);
        } catch (error: unknown) {
            next(error);
        }
    };
}

export default ChatController;
