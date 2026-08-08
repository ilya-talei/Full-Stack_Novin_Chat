import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../middlewares/errorMiddleware.js";
import { getValidatedIdParam } from "../../utils/id.js";
import { validatePagination } from "../../utils/pagination.js";
import z from "zod";

const createSchema = z.object({
    name: z.string().min(1).max(32),
    description: z.string().max(255).nullable().optional(),
});

const updateSchema = z.object({
    name: z.string().min(1).max(32).optional(),
    description: z.string().max(255).nullable().optional(),
});

class RoleController {
    index = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { page, limit } = validatePagination(req.query);

            if (!req.tenant) {
                throw new AppError("Tenant یافت نشد", 500);
            }

            const result = await req.tenant.services.role.index(page, limit);

            res.json(result);
        } catch (error) {
            next(error);
        }
    };
    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = createSchema.safeParse(req.body);
            if (!result.success) {
                throw new AppError(result.error.issues[0]?.message ?? "خطا", 400);
            }
            const role = await req.tenant!.services.role.create({
                name: result.data.name,
                description: result.data.description ?? null,
            });
            res.status(201).json(role);
        } catch (error) {
            next(error);
        }
    };
    show = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = getValidatedIdParam(req);
            const role = await req.tenant!.services.role.show(id);
            res.json(role);
        } catch (error) {
            next(error);
        }
    };
    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = getValidatedIdParam(req);
            const result = updateSchema.safeParse(req.body);
            if (!result.success) {
                throw new AppError(result.error.issues[0]?.message ?? "خطا", 400);
            }
            const role = await req.tenant!.services.role.update(id, result.data);
            res.json(role);
        } catch (error) {
            next(error);
        }
    };

    delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = getValidatedIdParam(req);
            await req.tenant!.services.role.delete(id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}

export default new RoleController();
