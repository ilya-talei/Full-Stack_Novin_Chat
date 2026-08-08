import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { PrismaClient } from "../generated/prisma/client.js";
import { AppError } from "../middlewares/errorMiddleware.js";

export interface RefreshTokenPayload {
    type: "refreshToken";
    sessionId: number;
    userId: number;
    tenant_id: number;
}

class LocalAuthService {
    constructor(
        private prisma: PrismaClient,
        private tenantId: number,
    ) {}

    async login(loginId: string, password: string, ipAddress: string, userAgent: string) {
        const user = await this.prisma.user.findFirst({
            where: {
                login_id: loginId,
                active: true,
                deleted_at: null,
            },
        });

        if (!user) {
            throw new AppError("شناسه ورود و یا کلمه عبور اشتباه است", 401);
        }

        const valid = await bcrypt.compare(password, user.hashed_password);
        if (!valid) {
            throw new AppError("شناسه ورود و یا کلمه عبور اشتباه است", 401);
        }

        const session = await this.prisma.session.create({
            data: {
                user_id: user.id,
                ip_address: ipAddress,
                user_agent: userAgent,
                active: true,
                expire_at: new Date(
                    Date.now() + Number(process.env.SESSION_LIFETIME ?? 60 * 60 * 5) * 1000,
                ),
            },
        });

        await this.prisma.user.update({
            where: { id: user.id },
            data: { last_login_at: new Date() },
        });

        const refreshToken = jwt.sign(
            {
                type: "refreshToken",
                sessionId: session.id,
                userId: user.id,
                tenant_id: this.tenantId,
            } satisfies RefreshTokenPayload,
            process.env.JWT_EC_PRIVATE_KEY!,
            {
                algorithm: "ES256",
                expiresIn: Number(process.env.SESSION_LIFETIME ?? 60 * 60 * 5),
            },
        );

        return { user, session, refreshToken };
    }

    async createAccessToken(refreshToken: string) {
        let decoded: RefreshTokenPayload;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_EC_PUBLIC_KEY!, {
                algorithms: ["ES256"],
            }) as RefreshTokenPayload;
        } catch {
            throw new AppError("توکن معتبر نیست", 401);
        }

        if (decoded.type !== "refreshToken" || Number(decoded.tenant_id) !== Number(this.tenantId)) {
            throw new AppError("توکن معتبر نیست", 401);
        }

        const session = await this.prisma.session.findUnique({
            where: { id: decoded.sessionId },
        });

        if (!session || !session.active || session.expire_at < new Date()) {
            throw new AppError("نشست نامعتبر یا منقضی شده است", 401);
        }

        const user = await this.prisma.user.findFirst({
            where: {
                id: session.user_id,
                active: true,
                deleted_at: null,
            },
        });

        if (!user) {
            throw new AppError("کاربر یافت نشد", 401);
        }

        const expiresIn = Number(process.env.ACCESS_TOKEN_LIFETIME ?? 5 * 60);

        const accessToken = jwt.sign(
            {
                sessionId: session.id,
                userId: user.id,
                permissions: {},
                tenant_id: this.tenantId,
            },
            process.env.JWT_EC_PRIVATE_KEY!,
            {
                algorithm: "ES256",
                expiresIn,
            },
        );

        return { accessToken, expiresIn, user };
    }

    async logout(sessionId: number) {
        await this.prisma.session.updateMany({
            where: { id: sessionId, active: true },
            data: { active: false },
        });
    }
}

export default LocalAuthService;
