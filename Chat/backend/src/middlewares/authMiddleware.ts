import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errorMiddleware.js";
import jwt from "jsonwebtoken";

export interface jwtSession {
    sessionId: number;
    userId: number;
    permissions: Record<string, boolean>;
    tenant_id: number;
}

const AuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        const bearer =
            typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")
                ? authHeader.slice(7).trim()
                : undefined;
        const jwtToken = (bearer || (req.cookies?.token as string | undefined)) || undefined;

        if (jwtToken === undefined) {
            throw new AppError("Authentication Failed", 401);
        }

        let decoded: jwtSession;
        try {
            decoded = jwt.verify(jwtToken, process.env.JWT_EC_PUBLIC_KEY!, {
                algorithms: ["ES256"],
            }) as unknown as jwtSession;
        } catch (_error) {
            throw new AppError("Authentication Failed", 401);
        }

        if (!req.tenant || Number(decoded.tenant_id) !== Number(req.tenant.data.id)) {
            req.log.info("Authentication Failed: tenant mismatch");
            throw new AppError("Authentication Failed", 401);
        }

        req.userId = decoded.userId;
        req.sessionId = decoded.sessionId;
        req.permissions = decoded.permissions;

        next();
    } catch (error: unknown) {
        next(error);
    }
};

export default AuthMiddleware;
