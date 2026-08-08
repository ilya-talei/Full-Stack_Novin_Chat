import z from "zod";
import { AppError } from "../../middlewares/errorMiddleware.js";
import TenantService from "./service.js";
import type { Request, Response, NextFunction } from "express";
import { getValidatedIdParam } from "../../utils/id.js";
import { validatePagination } from "../../utils/pagination.js";
import { indexValidationSchema } from "../../utils/validations.js";

const createValidationSchema = z.object({
    name: z.string().trim().max(255, "نام مستاجر نمیتواند بیشتر از ۲۵۵ کاراکتر باشد"),
    domain: z.string().trim().max(64, "دامنه نمیتواند بیشتر از ۶۴ کاراکتر باشد"),
    db_name: z.string().trim().max(64, "نام پایگاه داده نمیتواند بیشتر از ۶۴ کاراکتر باشد"),
    minio: z.object({
        endpoint: z.string().min(1).max(512),
        port: z.number(),
        accessKey: z.string().min(1).max(512),
        secretKey: z.string().min(1).max(512),
        pathStyle: z.boolean(),
    }),
    creator_id: z.number().int().positive().optional(),
    active: z.boolean().optional(),
});
export type createValidationType = z.infer<typeof createValidationSchema>;

const showByDomainValidationSchema = z.object({
    domain: z
        .string()
        .min(1, "دامنه الزامی است")
        .max(64, "دامنه نمیتواند بیشتر از ۶۴ کاراکتر باشد"),
});

const updateValidationSchema = z.object({
    name: z.string().trim().max(255, "نام مستاجر نمیتواند بیشتر از ۲۵۵ کاراکتر باشد").optional(),
    domain: z.string().trim().max(64, "دامنه نمیتواند بیشتر از ۶۴ کاراکتر باشد").optional(),
    db_name: z
        .string()
        .trim()
        .max(64, "نام پایگاه داده نمیتواند بیشتر از ۶۴ کاراکتر باشد")
        .optional(),
    minio: z
        .object({
            endpoint: z.string().min(1).max(512),
            port: z.number(),
            accessKey: z.string().min(1).max(512),
            secretKey: z.string().min(1).max(512),
            pathStyle: z.boolean(),
        })
        .optional(),
    creator_id: z.number().int().positive().optional(),
    active: z.boolean().optional(),
});
export type updateValidationType = z.infer<typeof updateValidationSchema>;

class TenantController {
    index = async (req: Request, res: Response, next: NextFunction) => {
        const query: { page?: string; limit?: string; search?: string } = req.query;
        try {
            const validationResult = indexValidationSchema.safeParse(query);
            if (!validationResult.success) {
                throw new AppError(validationResult.error.issues[0]!.message, 400);
            }

            const { page, limit } = validatePagination(query);

            if (isNaN(page) || page < 1) {
                throw new AppError("صفحه باید یک عدد صحیح مثبت باشد", 400);
            }

            if (isNaN(limit) || limit < 1) {
                throw new AppError("محدودیت باید یک عدد صحیح مثبت باشد", 400);
            }

            if (limit > 50) {
                throw new AppError(
                    "محدودیت باید یک عدد صحیح مثبت باشد و نباید بیش از ۵۰ باشد",
                    400,
                );
            }

            const result = await TenantService.index(page, limit, query.search ?? "");


            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    myTenants = async (req: Request, res: Response, next: NextFunction) => {
        const query: { page?: string; limit?: string; search?: string } = req.query;
        try {
            const validationResult = indexValidationSchema.safeParse(query);
            if (!validationResult.success) {
                throw new AppError(validationResult.error.issues[0]!.message, 400);
            }

            const { page, limit } = validatePagination(query)

            if (isNaN(page) || page < 1) {
                throw new AppError("صفحه باید یک عدد صحیح مثبت باشد", 400);
            }

            if (isNaN(limit) || limit < 1) {
                throw new AppError("محدودیت باید یک عدد صحیح مثبت باشد", 400);
            }

            if (limit > 50) {
                throw new AppError(
                    "محدودیت باید یک عدد صحیح مثبت باشد و نباید بیش از ۵۰ باشد",
                    400,
                );
            }

            if (req.userId === undefined) {
                throw new AppError("Authentication Failed", 401);
            }

            const result = await TenantService.myTenants(
                req.userId,
                page,
                limit,
                query.search ?? "",
            );

            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    show = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = getValidatedIdParam(req);

            const tenant = await TenantService.show(id);
            if (!tenant) {
                throw new AppError("مستاجر پیدا نشد", 404);
            }

            res.json(tenant);
        } catch (error) {
            next(error);
        }
    };

    showMyTenant = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = getValidatedIdParam(req);

            const result = await TenantService.showMyTenant(req.userId!, id);

            res.json(result);
        } catch (error: unknown) {
            next(error);
        }
    };

    showByDomain = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const validationResult = showByDomainValidationSchema.safeParse(req.query);
            if (!validationResult.success) {
                throw new AppError(validationResult.error.issues[0]!.message, 400);
            }

            const { domain } = validationResult.data;
            const tenant = await TenantService.showByDomain(domain);

            res.json(tenant);
        } catch (error) {
            next(error);
        }
    };

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const validationResult = createValidationSchema.safeParse(req.body);
            if (!validationResult.success) {
                throw new AppError(validationResult.error.issues[0]!.message, 400);
            }

            const tenantData = validationResult.data;
            const tenant = await TenantService.create(tenantData);
            res.status(201).json(tenant);
        } catch (error) {
            next(error);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const validationResult = updateValidationSchema.safeParse(req.body);
            if (!validationResult.success) {
                throw new AppError(validationResult.error.issues[0]!.message, 400);
            }

            const id = getValidatedIdParam(req);

            const tenantData = validationResult.data;
            const tenant = await TenantService.update(id, tenantData);
            res.json(tenant);
        } catch (error) {
            next(error);
        }
    };

    delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = getValidatedIdParam(req);

            await TenantService.delete(id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}

export default new TenantController();
