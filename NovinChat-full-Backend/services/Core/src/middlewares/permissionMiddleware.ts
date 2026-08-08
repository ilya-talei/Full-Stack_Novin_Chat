import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errorMiddleware.js";
import User from "../database/models/user.js";
import PermissionService from "../modules/Permission/service.js";

function PermissionMiddleware(permission: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (req.userId === undefined) {
                throw new AppError("Authentication Failed", 401);
            }

            const user: User | null = await User.findByPk(req.userId);
            if (!user) {
                throw new AppError("Authentication Failed", 401);
            }

            const hasPermission: boolean = await PermissionService.hasPermission(user, permission);
            if (!hasPermission) {
                throw new AppError("غیرمجاز", 403);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

export default PermissionMiddleware;
