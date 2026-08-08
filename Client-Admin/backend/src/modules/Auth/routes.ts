import { Router } from "express";
import AuthController from "./controller.js";

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
 *       204:
 *         description: ورود موفقیت آمیز - توکن JWT به صورت کوکی httpOnly با نام "token" تنظیم می‌شود
 *         headers:
 *           Set-Cookie:
 *             description: کوکی httpOnly حاوی توکن JWT
 *             schema:
 *               type: string
 *               example: "token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict; Path=/"
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
authRouter.post("/login", AuthController.login);
/**
 * @swagger
 * /auth/token:
 *   post:
 *     summary: Exchange secret session token for an access token
 *     description: Verify the secret token returned by /auth/login and return an access token containing session id, user id and permissions.
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Access token returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *       401:
 *         description: Invalid or expired secret token
 */
authRouter.post("/token", AuthController.token);

export default authRouter;
