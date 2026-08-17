import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { AppError } from "../middlewares/errorMiddleware.js";
import { fileTypeFromBuffer } from "file-type";
import z from "zod";
import redis from "../config/redis.js";

export const userAvatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024,
    },
});

const updateProfileSchema = z.object({
    name: z.string().min(2).max(64).optional(),
    display_name: z.string().min(2).max(64).optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().max(11).nullable().optional(),
    bio: z.string().max(256).optional(),
    username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/).optional(),
    login_id: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/).optional(),
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6).max(64),
});

class UserController {
    me = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const profile = await req.tenant!.services.UserService.getProfile(req.userId!);
            res.status(200).json({ user: profile, data: profile });
        } catch (error) {
            next(error);
        }
    };

    updateProfile = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = updateProfileSchema.safeParse(req.body);
            if (!parsed.success) {
                throw new AppError(parsed.error.issues[0]!.message, 400);
            }

            const profile = await req.tenant!.services.UserService.updateProfile(req.userId!, {
                display_name: parsed.data.display_name ?? parsed.data.name,
                email: parsed.data.email,
                phone: parsed.data.phone,
                bio: parsed.data.bio,
                login_id: parsed.data.username ?? parsed.data.login_id,
            });

            res.status(200).json({ user: profile, data: profile, success: true });
        } catch (error) {
            next(error);
        }
    };

    changePassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = changePasswordSchema.safeParse(req.body);
            if (!parsed.success) {
                throw new AppError(parsed.error.issues[0]!.message, 400);
            }

            const result = await req.tenant!.services.UserService.changePassword(
                req.userId!,
                parsed.data.currentPassword,
                parsed.data.newPassword,
            );
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    search = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const q = String(req.query.q ?? "");
            const onlineKey = `tenant:${req.tenant!.data.id}.online_users`;
            const online = await redis.smembers(onlineKey);
            const onlineSet = new Set(online.map(Number));
            const users = await req.tenant!.services.ContactService.search(
                req.userId!,
                q,
                onlineSet,
            );
            res.status(200).json({ data: users, contacts: users });
        } catch (error) {
            next(error);
        }
    };

    publicProfile = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const targetId = Number(req.params.id);
            if (!Number.isFinite(targetId) || targetId <= 0) {
                throw new AppError("شناسه کاربر نامعتبر است", 400);
            }
            const profile = await req.tenant!.services.UserService.getPublicProfile(
                req.userId!,
                targetId,
            );
            res.status(200).json({ user: profile, data: profile });
        } catch (error) {
            next(error);
        }
    };

    uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const file = req.file;
            if (!file) {
                throw new AppError("ارسال تصویر الزامی است", 400);
            }

            const fileType = await fileTypeFromBuffer(file.buffer);
            if (!fileType || !["image/png", "image/jpeg", "image/webp"].includes(fileType.mime)) {
                throw new AppError("فرمت های مجاز برای تصویر png و jpeg و webp هستند", 400);
            }

            const fileName = await req.tenant!.services.UserService.uploadAvatar(
                file,
                req.userId!,
                req.tenant!.data.id,
            );
            const profile = await req.tenant!.services.UserService.getProfile(req.userId!);
            res.status(200).json({
                avatar_file_name: fileName,
                avatar: profile.avatar,
            });
        } catch (error: unknown) {
            next(error);
        }
    };

    getAvatar = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const fileName = decodeURIComponent(String(req.params.fileName || ""));
            const { stream, contentType } = await req.tenant!.services.UserService.getAvatarStream(
                fileName,
                req.tenant!.data.id,
            );
            res.setHeader("Content-Type", contentType);
            res.setHeader("Cache-Control", "private, max-age=86400");
            stream.pipe(res);
        } catch (error) {
            next(error);
        }
    };

    deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await req.tenant!.services.UserService.deleteAccount(req.userId!);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}

export default new UserController();
