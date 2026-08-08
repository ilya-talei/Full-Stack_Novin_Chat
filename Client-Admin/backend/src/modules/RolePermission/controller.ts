import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../middlewares/errorMiddleware.js";
import { getValidatedIdParam } from "../../utils/id.js";
import z from "zod";

const assignValidationSchema = z.object({
    permission_name: z.string(),
    allow: z.boolean(),
});

class RolePermissionController {
    index = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;

            if (id === undefined || id === "") {
                throw new AppError("ارسال شناسه نقش ضروری است", 400);
            }

            const roleId = Number(id);

            if (Number.isNaN(roleId)) {
                throw new AppError("شناسه نقش نامعتبر است", 400);
            }

            const permissions = await req.tenant!.services.rolePermission.index(roleId);

            return res.json({
                permissions,
            });
        } catch (error: unknown) {
            next(error);
        }
    };

    assign = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const roleId: number = getValidatedIdParam(req);
            const validationResult = assignValidationSchema.safeParse(req.body);

            if (!validationResult.success) {
                throw new AppError(validationResult.error.issues[0]!.message, 400);
            }
            const { permission_name, allow } = validationResult.data;

            await req.tenant!.services.rolePermission.assign(roleId, permission_name, allow);

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

            // Validate request body
            const removeValidationSchema = z.object({
                permission_name: z.string(),
            });

            const validationResult = removeValidationSchema.safeParse(req.body);

            if (!validationResult.success) {
                throw new AppError(validationResult.error.issues[0]!.message, 400);
            }

            const { permission_name } = validationResult.data;

            await req.tenant!.services.rolePermission.remove(roleId, permission_name);

            return res.json({
                message: "دسترسی با موفقیت حذف شد",
            });
        } catch (error: unknown) {
            next(error);
        }
    };
}

export default new RolePermissionController();
