import type { Request, Response, NextFunction } from "express";
import z from "zod";
import SubscriptionService from "./service.js";
import { AppError } from "../../middlewares/errorMiddleware.js";
import { getValidatedIdParam } from "../../utils/id.js";

const createValidationSchema = z.object({
    tenant_id: z.number().int().positive(),
    product_id: z.number().int().positive(),
    start_date: z.coerce.date(),
    end_date: z.coerce.date(),
    status: z.enum(["active", "inactive"]),
});

const updateValidationSchema = z.object({
    end_date: z.date().optional(),
    status: z.enum(["active", "inactive", "expired", "cancelled"]).optional(),
});

class SubscriptionController {
    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const validation = createValidationSchema.safeParse(req.body);
            if (!validation.success) {
                throw new AppError(validation.error.issues[0]!.message, 400);
            }

            await SubscriptionService.create(
                validation.data.tenant_id,
                validation.data.product_id,
                validation.data.start_date,
                validation.data.end_date,
                validation.data.status,
            );

            res.status(204).send();
        } catch (error: unknown) {
            next(error);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = getValidatedIdParam(req);


            const validation = updateValidationSchema.safeParse(req.body);
            if (!validation.success) {
                throw new AppError(validation.error.issues[0]!.message, 400);
            }

            const data = {
                ...(validation.data.status !== undefined && { status: validation.data.status }),
                ...(validation.data.end_date !== undefined && {
                    endDate: validation.data.end_date,
                }),
            };

            await SubscriptionService.update(id, data);

            res.status(204).send();
        } catch (error: unknown) {
            next(error);
        }
    };
}

export default new SubscriptionController();
