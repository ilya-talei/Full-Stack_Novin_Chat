import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errorMiddleware.js";
import type Session from "../database/models/session.js";
import jwt from "jsonwebtoken";
import type User from "../database/models/user.js";

export interface jwtSession {
    sessionId: number;
    userId?: number;
    permissions?: Record<string, boolean>;
    tenant_id: number;
}

const AuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const jwtToken = req.cookies?.token as string | undefined;

        if (jwtToken === undefined) {
            throw new AppError("Authentication Failed", 401);
        }

        let decoded: jwtSession;
        try {
            decoded = jwt.verify(jwtToken, process.env.JWT_EC_PUBLIC_KEY!, {
                algorithms: ["ES256"],
            }) as jwtSession;
        } catch (_error) {
            throw new AppError("Authentication Failed", 401);
        }

        if (!req.tenant || Number(decoded.tenant_id) !== Number(req.tenant.data.id)) {
            req.log.info("Authentication Failed: tenant mismatch");
            throw new AppError("Authentication Failed", 401);
        }

        const sessionUser: Session | null = await req.tenant.models.Session.findByPk(
            decoded.sessionId,
        );

        if (!sessionUser || !sessionUser.active || new Date() > sessionUser.expire_at) {
            req.log.info("Authentication Failed");
            throw new AppError("Authentication Failed", 401);
        }

        const user: User | null = await req.tenant.models.User.findByPk(sessionUser.user_id);

        if (!user || !user.active) {
            throw new AppError("Authentication Failed", 401);
        }

        req.log = req.log.child({
            userId: sessionUser.user_id,
            sessionId: sessionUser.id,
            ip: req.ip,
        });

        // prefer userId from token if present, otherwise use session's user_id
        req.userId = decoded.userId ?? sessionUser.user_id;
        req.session = sessionUser;
        req.permissions = decoded.permissions ?? {};
        next();
    } catch (error: unknown) {
        next(error);
    }
};

export default AuthMiddleware;
