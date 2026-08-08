import type { Request, Response, NextFunction } from "express";
import z from "zod";
import jwt from "jsonwebtoken";
import { AppError } from "../../middlewares/errorMiddleware.js";
import type { refreshToken } from "./service.js";

interface CookieOptions {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "strict" | "lax" | "none";
    maxAge: number;
    path: string;
}

const loginValidationSchema = z.object({
    login_id: z
        .string("ارسال login_id الزامی است")
        .min(4, "شناسه ورود نمیتواند کمتر از ۴ کاراکتر باشه")
        .max(32, "شناسه ورود نمیتواند بیشتر از ۳۲ کاراکتر باشد"),
    password: z
        .string("ارسال کلمه عبور الزامی است")
        .min(8, "کلمه عبور حداقل باید شامل ۸ کاراکتر باشد")
        .max(64, "کلمه عبور حداکثر میتواند شامل ۶۴ کاراکتر باشد"),
});

class AuthController {
    private buildAccessToken = async (
        req: Request,
        secretToken: string,
    ): Promise<{ accessToken: string; expiresIn: number }> => {
        let decoded: refreshToken;
        try {
            decoded = jwt.verify(secretToken, process.env.JWT_EC_PUBLIC_KEY!, {
                algorithms: ["ES256"],
            }) as refreshToken;
        } catch (_error) {
            throw new AppError("توکن معتبر نیست", 401);
        }

        const sessionId = decoded?.sessionId;
        if (decoded.type !== "refreshToken" || !sessionId) {
            throw new AppError("توکن معتبر نیست", 401);
        }

        const tokenTenantId = decoded?.tenant_id;
        if (
            typeof tokenTenantId === "undefined" ||
            Number(tokenTenantId) !== Number(req.tenant!.data.id)
        ) {
            throw new AppError("توکن معتبر نیست", 401);
        }

        const session = await req.tenant!.models.Session.findByPk(sessionId);
        if (!session || !session.active || new Date(session.expire_at) < new Date()) {
            throw new AppError("نشست نامعتبر یا منقضی شده است", 401);
        }

        const user = await req.tenant!.models.User.findByPk(session.user_id, { paranoid: true });
        if (!user || user.deleted_at) {
            throw new AppError("کاربر یافت نشد", 401);
        }

        if (!user.active) {
            throw new AppError("حساب کاربر غیرفعال است", 401);
        }

        const permissions = await req.tenant!.services.permission.resolveUserPermissions(user);

        const accessPayload = {
            sessionId: session.id,
            userId: user.id,
            permissions,
            tenant_id: decoded?.tenant_id,
        };

        const expiresIn = Number(process.env.ACCESS_TOKEN_LIFETIME ?? 5 * 60); // default 5 minutes

        const accessToken = jwt.sign(accessPayload, process.env.JWT_EC_PRIVATE_KEY!, {
            algorithm: "ES256",
            expiresIn,
        });

        return { accessToken, expiresIn };
    };

    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const validated = loginValidationSchema.safeParse(req.body);
            const userIpAddress = req.ip;
            const userAgentHeader = req.headers["user-agent"];
            const user_agent = typeof userAgentHeader === "string" ? userAgentHeader : "unknown";

            if (!validated.success) {
                throw new AppError(validated.error.issues[0]!.message, 400);
            }

            if (userIpAddress == undefined) {
                throw new AppError("خطای سرور", 500);
            }

            const jwtToken: string = await req.tenant!.services.auth.login(
                validated.data.login_id,
                validated.data.password,
                userIpAddress,
                user_agent,
            );

            const cookieOptions: CookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: Number(process.env.SESSION_LIFETIME ?? 60 * 60 * 5) * 1000,
                path: "/",
            };

            res.cookie("secret", jwtToken, cookieOptions);

            const { accessToken, expiresIn } = await this.buildAccessToken(req, jwtToken);

            res.cookie("token", accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: expiresIn * 1000,
                path: "/",
            });

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    token = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const secretToken = (req.cookies as { secret?: string }).secret ?? null;
            if (secretToken === null) {
                throw new AppError("Token Is Missing", 401);
            }

            const { accessToken, expiresIn } = await this.buildAccessToken(req, secretToken);

            const cookieOptions: CookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: expiresIn * 1000,
                path: "/",
            };

            res.cookie("token", accessToken, cookieOptions);

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}

export default new AuthController();
