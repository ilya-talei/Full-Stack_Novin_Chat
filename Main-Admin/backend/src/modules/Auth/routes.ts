import { Router } from "express";
import AuthController from "./controller.js";
import { controllerErrorHandler } from "../../middlewares/errorMiddleware.js";

const authRouter: Router = Router();
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: ورود به سیستم
 *     description: این endpoint برای احراز هویت کاربران و دریافت توکن JWT استفاده می‌شود
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - login_id
 *               - password
 *             properties:
 *               login_id:
 *                 type: string
 *                 example: "john_doe"
 *                 description: نام کاربری
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "Password123!"
 *                 description: رمز عبور
 *     responses:
 *       200:
 *         description: ورود موفقیت آمیز
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: نام کاربری یا رمز عبور اشتباه است
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid login credentials"
 *       400:
 *         description: داده‌های ورودی نامعتبر
 */
authRouter.post("/login", controllerErrorHandler(AuthController.login));

export default authRouter;
