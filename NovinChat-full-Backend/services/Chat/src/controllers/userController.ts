import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { AppError } from "../middlewares/errorMiddleware.js";
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

export const userAvatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024,
    },
});

class UserController{
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

export default new UserController();