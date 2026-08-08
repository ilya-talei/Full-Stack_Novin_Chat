import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../middlewares/errorMiddleware.js";
import z from "zod";
import RolePermissionService from "../RolePermission/service.js";

const assignValidationSchema = z.object({
    permission_name: z.string().min(3, "نام دسترسی باید حداقل 3 کاراکتر باشد").trim(),
    allow: z.boolean(),
});

class RolePermissionController {
    index = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (req.params.id === undefined) {
                throw new AppError("ارسال شناسه نقش ضروری است", 400);
            }

            const roleId: number = Number(req.params.id);
            if(isNaN(roleId)){
                throw new AppError('ارسال شناسه نقش ضروری است', 400);
            }
            const permissions = await RolePermissionService.index(roleId);

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
                throw new AppError("ارسال شناسه نقش ضروری است", 400);
            }

            const roleId: number = Number(req.params.id);
            if(isNaN(roleId)){
                throw new AppError('ارسال شناسه نقش ضروری است', 400);
            }
            const validationResult = assignValidationSchema.safeParse(req.body);

            if (!validationResult.success) {
                throw new AppError(validationResult.error.issues[0]!.message, 400);
            }
            const { permission_name, allow } = validationResult.data;

            await RolePermissionService.assign(roleId, permission_name, allow);

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
                throw new AppError("ارسال شناسه نقش ضروری است", 400);
            }

            const roleId: number = Number(req.params.id);
            if(isNaN(roleId)){
                throw new AppError('ارسال شناسه نقش ضروری است', 400);
            }

            // Validate request body
            const removeValidationSchema = z.object({
                permission_name: z.string().min(3, "نام دسترسی باید حداقل 3 کاراکتر باشد").trim(),
            });

            const validationResult = removeValidationSchema.safeParse(req.body);

            if (!validationResult.success) {
                throw new AppError(validationResult.error.issues[0]!.message, 400);
            }

            const { permission_name } = validationResult.data;

            await RolePermissionService.remove(roleId, permission_name);

            return res.json({
                message: "دسترسی با موفقیت حذف شد",
            });
        } catch (error: unknown) {
            next(error);
        }
    };
}

export default new RolePermissionController();
