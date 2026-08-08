import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errorMiddleware.js";
import Session from "../database/models/session.js";
import jwt from "jsonwebtoken";
import User from "../database/models/user.js";

export interface jwtSession {
    sessionId: number;
}

const AuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader === undefined || !authHeader.startsWith("Bearer ")) {
            throw new AppError("Authentication Failed", 401);
        }

        const jwtToken: string | undefined = authHeader.split(" ")[1];

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
        const sessionUser: Session | null = await Session.findByPk(decoded.sessionId);

        if (!sessionUser || !sessionUser.active || new Date() > sessionUser.expire_at) {
            req.log.info("Authentication Failed");
            throw new AppError("Authentication Failed", 401);
        }

        const user: User | null = await User.findByPk(sessionUser.user_id);

        if (!user || !user.active) {
            throw new AppError("Authentication Failed", 401);
        }

        req.log = req.log.child({
            userId: sessionUser.user_id,
            sessionId: sessionUser.id,
            ip: req.ip,
        });

        req.userId = sessionUser.user_id;
        req.session = sessionUser;
        next();
    } catch (error: unknown) {
        next(error);
    }
};

export default AuthMiddleware;
