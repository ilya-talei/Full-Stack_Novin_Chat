import { type Transaction } from "sequelize";
import sequelize from "../../config/db.js";
import User from "../../database/models/user.js";
import { AppError } from "../../middlewares/errorMiddleware.js";
import bcrypt from "bcrypt";
import Session from "../../database/models/session.js";
import jwt from "jsonwebtoken";
import logger from "../../config/pino.js";

class AuthService {
    static async login(
        login_id: string,
        password: string,
        userIpAddress: string,
        user_agent: string,
    ): Promise<string> {
        const user: User | null = await User.findOne({
            where: {
                login_id: login_id,
                active: true,
            },
        });

        if (!user) {
            throw new AppError("شناسه ورود و یا کلمه عبور اشتباه است", 401);
        }

        const hashCheck: boolean = await bcrypt.compare(password, user.hashed_password);
        if (!hashCheck) {
            throw new AppError("شناسه ورود و یا کلمه عبور اشتباه است", 401);
        }

        const t: Transaction = await sequelize.transaction();
        try {
            const session: Session = new Session();
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
                    sessionId: session.id,
                },
                process.env.JWT_EC_PRIVATE_KEY!,
                {
                    expiresIn: Number(process.env.SESSION_LIFETIME ?? 60 * 60 * 5),
                    algorithm: "ES256",
                },
            );

            return jwtToken;
        } catch (error: unknown) {
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
