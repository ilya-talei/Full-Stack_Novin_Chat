import type { Request, Response, NextFunction } from "express";
import z from "zod";
import { AppError } from "../middlewares/errorMiddleware.js";

const indexValidationSchema = z.object({
    chat_id: z.coerce.number(),
    before: z.coerce.number().optional(),
    after: z.coerce.number().optional(),
    limit: z.coerce.number().min(1).max(50).optional().default(20),
});

class MessageController {
    index = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const validation = indexValidationSchema.safeParse({
                ...req.query,
                ...req.body,
            });
            if (!validation.success) {
                throw new AppError(validation.error.issues[0]!.message, 400);
            }

            const userId = req.userId;
            const { chat_id, before, after, limit } = validation.data;

            const messages = await req.tenant!.services.MessageService.index(
                userId!,
                chat_id,
                limit,
                before ?? null,
                after ?? null,
            );

            res.status(200).json({
                messages,
                messasges: messages,
            });
        } catch (err) {
            next(err);
        }
    };
}

export default MessageController;
