import type { Request, Response, NextFunction } from "express";
import z from "zod";
import { AppError } from "../middlewares/errorMiddleware.js";
import LocalAuthService from "../services/localAuthService.js";

const loginSchema = z
    .object({
        login_id: z.string().min(3).max(32).optional(),
        username: z.string().min(3).max(32).optional(),
        password: z.string().min(6).max(64),
    })
    .refine((data) => Boolean(data.login_id || data.username), {
        message: "ارسال شناسه ورود الزامی است",
    });

function cookieOptions(maxAgeMs: number) {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        maxAge: maxAgeMs,
        path: "/",
    };
}

function toPublicUser(user: {
    id: number;
    login_id: string;
    phone: string | null;
    display_name?: string | null;
    email?: string | null;
    bio?: string | null;
}) {
    return {
        id: String(user.id),
        username: user.login_id,
        name: user.display_name || user.login_id,
        email: user.email ?? `${user.login_id}@local.dev`,
        phone: user.phone,
        bio: user.bio ?? "",
        avatar: null,
        status: "online" as const,
    };
}

class LocalAuthController {
    private getService(req: Request) {
        return new LocalAuthService(req.tenant!.prisma, Number(req.tenant!.data.id));
    }

    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = loginSchema.safeParse(req.body);
            if (!parsed.success) {
                throw new AppError(parsed.error.issues[0]!.message, 400);
            }

            const loginId = (parsed.data.login_id ?? parsed.data.username!).trim();
            const password = parsed.data.password.trim();
            const ip = req.ip ?? "127.0.0.1";
            const userAgent =
                typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : "unknown";

            const auth = this.getService(req);
            const { user, refreshToken } = await auth.login(
                loginId,
                password,
                ip,
                userAgent,
            );
            const { accessToken, expiresIn } = await auth.createAccessToken(refreshToken);

            res.cookie(
                "secret",
                refreshToken,
                cookieOptions(Number(process.env.SESSION_LIFETIME ?? 60 * 60 * 5) * 1000),
            );
            res.cookie("token", accessToken, cookieOptions(expiresIn * 1000));

            res.status(200).json({
                user: toPublicUser(user),
            });
        } catch (error) {
            next(error);
        }
    };

    token = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const secret = req.cookies?.secret as string | undefined;
            if (!secret) {
                throw new AppError("Token Is Missing", 401);
            }

            const { accessToken, expiresIn } = await this.getService(req).createAccessToken(secret);
            res.cookie("token", accessToken, cookieOptions(expiresIn * 1000));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    me = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = await req.tenant!.services.UserService.getUserById(req.userId!);
            if (!user) {
                throw new AppError("کاربر یافت نشد", 401);
            }

            res.status(200).json({
                user: toPublicUser(user),
            });
        } catch (error) {
            next(error);
        }
    };

    logout = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (req.sessionId) {
                await this.getService(req).logout(req.sessionId);
            }

            res.clearCookie("token", { path: "/" });
            res.clearCookie("secret", { path: "/" });
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}

export default LocalAuthController;
