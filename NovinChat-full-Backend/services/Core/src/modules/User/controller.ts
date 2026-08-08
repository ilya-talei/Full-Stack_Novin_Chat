import z from "zod";
import { AppError } from "../../middlewares/errorMiddleware.js";
import UserService from "./service.js";
import type { Request, Response, NextFunction } from "express";
import { getValidatedIdParam } from "../../utils/id.js";
import { validatePagination } from "../../utils/pagination.js";
import { indexValidationSchema } from "../../utils/validations.js";

const createValidationSchema = z.object({
    login_id: z.string().trim().max(64, "شناسه ورود نمیتواند بیشتر از ۶۴ کاراکتر باشد"),
    phone: z.string().trim().max(15, "شماره تلفن نمیتواند بیشتر از ۱۵ کاراکتر باشد"),
    employee_id: z.number().int().positive(),
    password: z.string().trim().max(255, "رمز عبور نمیتواند بیشتر از ۲۵۵ کاراکتر باشد"),
    active: z.boolean().optional(),
});
export type createValidationType = z.infer<typeof createValidationSchema>;

const updateValidationSchema = z.object({
    login_id: z.string().trim().max(64, "شناسه ورود نمیتواند بیشتر از ۶۴ کاراکتر باشد").optional(),
    phone: z.string().trim().max(15, "شماره تلفن نمیتواند بیشتر از ۱۵ کاراکتر باشد").optional(),
    employee_id: z.number().int().positive().optional(),
    password: z.string().trim().max(255, "رمز عبور نمیتواند بیشتر از ۲۵۵ کاراکتر باشد").optional(),
    active: z.boolean().optional(),
});
export type updateValidationType = z.infer<typeof updateValidationSchema>;

const changePasswordValidationSchema = z.object({
    current_password: z.string().trim().min(1, "رمز عبور فعلی الزامی است"),
    new_password: z
        .string()
        .trim()
        .min(8, "رمز عبور جدید حداقل باید شامل ۸ کاراکتر باشد")
        .max(64, "رمز عبور جدید حداکثر میتواند شامل ۶۴ کاراکتر باشد"),
});

class UserController {
    index = async (req: Request, res: Response, next: NextFunction) => {
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

            const result = await UserService.index(page, limit, query.search ?? "");

            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    show = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = getValidatedIdParam(req);

            const user = await UserService.show(id);
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
            const user = await UserService.create(userData);
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
            const user = await UserService.update(id, userData);
            res.json(user);
        } catch (error) {
            next(error);
        }
    };

    delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = getValidatedIdParam(req);

            await UserService.delete(id);
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
            await UserService.changePassword(userId, current_password, new_password);
            res.json({ message: "رمز عبور با موفقیت تغییر یافت" });
        } catch (error) {
            next(error);
        }
    };
}

export default new UserController();
