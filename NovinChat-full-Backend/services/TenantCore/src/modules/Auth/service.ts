import type { Sequelize } from "sequelize";
import { type Transaction } from "sequelize";
import { AppError } from "../../middlewares/errorMiddleware.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import logger from "../../config/pino.js";
import type { Models } from "../../database/models/index.js";
import type User from "../../database/models/user.js";
import type Session from "../../database/models/session.js";

export interface refreshToken {
    type: "refreshToken";
    sessionId: number;
    userId: number;
    tenant_id: number;
}

class AuthService {
    models?: Models;
    constructor(
        private sequelize: Sequelize,
        private tenantId: number,
    ) {}

    async login(
        login_id: string,
        password: string,
        userIpAddress: string,
        user_agent: string,
    ): Promise<string> {
        const user: User | null = await this.models!.User.findOne({
            where: {
                login_id: login_id,
                active: true,
            },
            paranoid: true,
        });

        if (!user || user.deleted_at) {
            throw new AppError("شناسه ورود و یا کلمه عبور اشتباه است", 401);
        }

        const hashCheck: boolean = await bcrypt.compare(password, user.hashed_password);
        if (!hashCheck) {
            throw new AppError("شناسه ورود و یا کلمه عبور اشتباه است", 401);
        }

        const t: Transaction = await this.sequelize.transaction();
        try {
            const session: Session = new this.models!.Session();
            session.user_id = user.id;
            session.expire_at = new Date(
                Number(process.env.SESSION_LIFETIME ?? 60 * 60 * 5) * 1000 + Date.now(),
            );
            session.ip_address = userIpAddress;
            session.user_agent = user_agent;
            await session.save({ transaction: t });

            await user.update(
                {
                    last_login_at: new Date(),
                },
                { transaction: t },
            );

            await t.commit();

            const jwtToken: string = jwt.sign(
                {
                    type: "refreshToken",
                    sessionId: session.id,
                    userId: user.id,
                    tenant_id: this.tenantId,
                },
                process.env.JWT_EC_PRIVATE_KEY!,
                {
                    expiresIn: Number(process.env.SESSION_LIFETIME ?? 60 * 60 * 5),
                    algorithm: "ES256",
                },
            );

            return jwtToken;
        } catch (error) {
            try {
                await t.rollback();
            } catch (error) {
                logger.error(error);
            }
            throw error;
        }
    }
}

export default AuthService;
