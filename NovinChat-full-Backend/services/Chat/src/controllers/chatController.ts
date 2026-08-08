import type { Request, Response, NextFunction } from "express";
import { AppError } from "../middlewares/errorMiddleware.js";
import z from "zod";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";

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

const createValidationSchema = z.object({
    type: z.enum(["group", "channel"], "type must be either 'group' or 'channel'"),
    chat_name: z
        .string()
        .min(2, "نام باید حداقل ۲ کاراکتر داشته باشد")
        .max(32, "نام باید حداکثر ۳۲ کاراکتر داشته باشد"),
});

const updateValidationSchema = z.object({
    chat_name: z
        .string()
        .min(2, "نام باید حداقل ۲ کاراکتر داشته باشد")
        .max(32, "نام باید حداکثر ۳۲ کاراکتر داشته باشد"),
    description: z.string().max(256, "توضیحات باید حداکثر ۲۵۶ کاراکتر داشته باشد").optional(),
});

export const chatAvatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024,
    },
});

class ChatController {
    index = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId: number = req.userId!;
            const chats = await req.tenant!.services.ChatService.index(userId);
            res.status(200).json({
                data: chats,
            });
        } catch (err) {
            next(err);
        }
    };

    show = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId: number = req.userId!;
            const chatId: number = chatIdValidation(req.params.chatId);

            const chat = await req.tenant!.services.ChatService.show(userId, chatId);

            res.status(200).json({
                data: chat,
            });
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

            const userId: number = req.userId!;
            const { type, chat_name } = validation.data;
            const chat = await req.tenant!.services.ChatService.create(userId, type, chat_name);
            res.status(201).json({
                data: chat,
            });
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

            const userId: number = req.userId!;
            const chatId: number = chatIdValidation(req.params.chatId);
            const { chat_name, description } = validation.data;

            await req.tenant!.services.ChatService.update(
                userId,
                chatId,
                chat_name,
                description ?? null,
            );

            res.status(200).json({
                message: "Chat updated successfully",
            });
        } catch (err) {
            next(err);
        }
    };

    uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId: number = req.userId!;
            const chatId: number = chatIdValidation(req.params.chatId);

            const file = req.file;
            if (!file) {
                throw new AppError("ارسال تصویر الزامی است", 400);
            }

            const fileType = await fileTypeFromBuffer(file.buffer);
            if (!fileType || !["image/png", "image/jpeg"].includes(fileType.mime)) {
                throw new AppError("فرمت های مجاز برای تصویر png و jpeg هستند", 400);
            }

            await req.tenant!.services.ChatService.uploadAvatar(file, chatId, userId);

            res.status(204).send();
        } catch (error: unknown) {
            next(error);
        }
    };
}

export default ChatController;
