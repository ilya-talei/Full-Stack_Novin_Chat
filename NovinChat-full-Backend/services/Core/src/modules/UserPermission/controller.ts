import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../middlewares/errorMiddleware.js";
import UserPermissionService from "./service.js";
import z from "zod";

const assignValidationSchema = z.object({
    permission_name: z.string().trim(),
    allow: z.boolean(),
});

class UserPermissionController {
    index = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (req.params.id === undefined) {
                throw new AppError("ارسال شناسه کاربر ضروری است", 400);
            }

            const userId: number = Number(req.params.id);
            if(isNaN(userId)){
                throw new AppError('شناسه کاربر نامعتر است', 400);
            }
            const permissions = await UserPermissionService.index(userId);

            return res.json({
                permissions: permissions,
            });
        } catch (error: unknown) {
            next(error);
        }
    };

    assign = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (req.params.id === undefined) {
                throw new AppError("ارسال شناسه کاربر ضروری است", 400);
            }

            const userId: number = Number(req.params.id);
            if(isNaN(userId)){
                throw new AppError('شناسه کاربر نامعتر است', 400);
            }
            const validationResult = assignValidationSchema.safeParse(req.body);

            if (!validationResult.success) {
                throw new AppError(validationResult.error.issues[0]!.message, 400);
            }
            const { permission_name, allow } = validationResult.data;

            await UserPermissionService.assign(userId, permission_name, allow);

            return res.json({
                message: "دسترسی با موفقیت اختصاص داده شد",
            });
        } catch (error: unknown) {
            next(error);
        }
    };

    remove = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (req.params.id === undefined) {
                throw new AppError("ارسال شناسه کاربر ضروری است", 400);
            }

            const userId: number = Number(req.params.id);
            if(isNaN(userId)){
                throw new AppError('شناسه کاربر نامعتر است', 400);
            }
            // Validate request body
            const removeValidationSchema = z.object({
                permission_name: z.string(),
            });

            const validationResult = removeValidationSchema.safeParse(req.body);

            if (!validationResult.success) {
                throw new AppError(validationResult.error.issues[0]!.message, 400);
            }

            const { permission_name } = validationResult.data;

            await UserPermissionService.remove(userId, permission_name);

            return res.json({
                message: "دسترسی با موفقیت حذف شد",
            });
        } catch (error: unknown) {
            next(error);
        }
    };
}

export default new UserPermissionController();
