import type { Request, Response, NextFunction } from "express";
import z from "zod";
import { AppError } from "../../middlewares/errorMiddleware.js";
import AuthService from "./service.js";

const loginValidationSchema = z.object({
    login_id: z
        .string("ارسال login_id الزامی است")
        .trim()
        .min(4, "شناسه ورود نمیتواند کمتر از ۴ کاراکتر باشه")
        .max(32, "شناسه ورود نمیتواند بیشتر از ۳۲ کاراکتر باشد"),
    password: z
        .string("ارسال کلمه عبور الزامی است")
        .trim()
        .min(8, "کلمه عبور حداقل باید شامل ۸ کاراکتر باشد")
        .max(64, "کلمه عبور حداکثر میتواند شامل ۶۴ کاراکتر باشد"),
});

class AuthController {
    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const validated = loginValidationSchema.safeParse(req.body);
            const userIpAddress = req.ip;
            const userAgentHeader = req.headers["user-agent"];
            const user_agent = typeof userAgentHeader === "string" ? userAgentHeader : "unknown";

            if (!validated.success) {
                throw new AppError(validated.error.issues[0]!.message, 400);
            }

            if (userIpAddress === undefined) {
                throw new AppError("خطای سرور", 500);
            }

            const body = validated.data;
            const jwtToken: string = await AuthService.login(
                body.login_id,
                body.password,
                userIpAddress,
                user_agent,
            );

            res.json({
                token: jwtToken,
            });
        } catch (error: unknown) {
            next(error);
        }
    };
}

export default new AuthController();
