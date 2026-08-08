import z from "zod";
import { AppError } from "../../middlewares/errorMiddleware.js";
import { getValidatedIdParam } from "../../utils/id.js";
import { validatePagination } from "../../utils/pagination.js";
import type { Request, Response, NextFunction } from "express";

const indexValidationSchema = z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().max(64, "جستجو نمیتواند بیشتر از ۶۴ کاراکتر باشد").optional(),
});

const createValidationSchema = z.object({
    login_id: z.string().max(64, "شناسه ورود نمیتواند بیشتر از ۶۴ کاراکتر باشد"),
    phone: z.string().max(15, "شماره تلفن نمیتواند بیشتر از ۱۵ کاراکتر باشد"),
    employee_id: z.number().int().positive(),
    password: z.string().max(255, "رمز عبور نمیتواند بیشتر از ۲۵۵ کاراکتر باشد"),
    active: z.boolean(),
});
export type createValidationType = z.infer<typeof createValidationSchema>;

const updateValidationSchema = z.object({
    login_id: z.string().max(64, "شناسه ورود نمیتواند بیشتر از ۶۴ کاراکتر باشد").optional(),
    phone: z.string().max(15, "شماره تلفن نمیتواند بیشتر از ۱۵ کاراکتر باشد").optional(),
    employee_id: z.number().int().positive().optional(),
    password: z.string().max(255, "رمز عبور نمیتواند بیشتر از ۲۵۵ کاراکتر باشد").optional(),
    active: z.boolean().optional(),
});
export type updateValidationType = z.infer<typeof updateValidationSchema>;

const changePasswordValidationSchema = z.object({
    current_password: z.string().min(1, "رمز عبور فعلی الزامی است"),
    new_password: z
        .string()
        .min(8, "رمز عبور جدید حداقل باید شامل ۸ کاراکتر باشد")
        .max(64, "رمز عبور جدید حداکثر میتواند شامل ۶۴ کاراکتر باشد"),
});

class UserController {
    index = async (req: Request, res: Response, next: NextFunction) => {
        const body: { page?: string; limit?: string; search?: string } = req.query;
        try {
            const validationResult = indexValidationSchema.safeParse(body);
            if (!validationResult.success) {
                throw new AppError(validationResult.error.issues[0]!.message, 400);
            }

            const { page = "1", limit = "10", search = "" } = validationResult.data;

            const { page: pageNumber, limit: limitNumber } = validatePagination({ page, limit });

            const result = await req.tenant!.services.user.index(pageNumber, limitNumber, search);

            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    show = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = getValidatedIdParam(req);

            const user = await req.tenant!.services.user.show(id);
            if (!user) {
                throw new AppError("کاربر پیدا نشد", 404);
            }

            res.json(user);
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

            const userData = validationResult.data;
            const user = await req.tenant!.services.user.create(userData);
            res.status(201).json(user);
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

            const userData = validationResult.data;
            const user = await req.tenant!.services.user.update(id, userData);
            res.json(user);
        } catch (error) {
            next(error);
        }
    };

    delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = getValidatedIdParam(req);

            await req.tenant!.services.user.delete(id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    changePassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const validationResult = changePasswordValidationSchema.safeParse(req.body);
            if (!validationResult.success) {
                throw new AppError(validationResult.error.issues[0]!.message, 400);
            }

            const userId = req.userId;
            if (userId === undefined) {
                throw new AppError("Authentication Failed", 401);
            }

            const { current_password, new_password } = validationResult.data;
            await req.tenant!.services.user.changePassword(userId, current_password, new_password);
            res.json({ message: "رمز عبور با موفقیت تغییر یافت" });
        } catch (error) {
            next(error);
        }
    };
}

export default new UserController();
