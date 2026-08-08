import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errorMiddleware.js";

function PermissionMiddleware(permission: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            // permissions are resolved at token-exchange time and carried in the access token
            if (req.permissions?.[permission] !== true) {
                throw new AppError("Forbidden", 403);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

export default PermissionMiddleware;
