import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../middlewares/errorMiddleware.js";
import ServiceService from "./service.js";
import z from "zod";

const generateTokenValidation = z.object({
    secret: z.string(),
});

class ServiceController {
    generateToken = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const validation = generateTokenValidation.safeParse(req.body);
            if (!validation.success) {
                throw new AppError("Authentication Failed", 401);
            }

            const jwtToken: string = await ServiceService.generateToken(validation.data.secret);

            res.json({
                token: jwtToken,
            });
        } catch (error: unknown) {
            next(error);
        }
    };
}

export default new ServiceController();
