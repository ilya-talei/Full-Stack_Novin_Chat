import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errorMiddleware.js";
import jwt from "jsonwebtoken";

export interface serviceToken {
    service_id: number;
    service_name: string;
}

const AuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader === undefined || !authHeader.startsWith("Bearer ")) {
            throw new AppError("Authentication Failed", 401);
        }

        const jwtToken: string | undefined = authHeader.split(" ")[1];

        if (jwtToken === undefined) {
            throw new AppError("Authentication Failed", 401);
        }
        let decoded: serviceToken;
        try {
            decoded = jwt.verify(jwtToken, process.env.JWT_EC_PUBLIC_KEY!, {
                algorithms: ["ES256"],
            }) as serviceToken;
        } catch (_error) {
            throw new AppError("Authentication Failed", 401);
        }

        req.serviceId = decoded.service_id;
        req.serviceName = decoded.service_name;
        next();
    } catch (error: unknown) {
        next(error);
    }
};

export default AuthMiddleware;
