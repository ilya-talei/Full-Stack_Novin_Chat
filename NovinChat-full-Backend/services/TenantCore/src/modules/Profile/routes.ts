import { Router } from "express";
import ProfileController from "./controller.js";

const router: Router = Router();

/**
 * @swagger
 * /profile/logout:
 *   post:
 *     summary: خروج از سیستم
 *     description: این endpoint نشست (session) کاربر جاری را غیرفعال می‌کند و توکن را باطل می‌سازد
 *     tags:
 *       - Profile
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: خروج موفقیت آمیز - کوکی httpOnly با نام "token" حذف می‌شود
 *         headers:
 *           Set-Cookie:
 *             description: کوکی توکن با تاریخ انقضای گذشته حذف می‌شود
 *             schema:
 *               type: string
 *               example: "token=; HttpOnly; Secure; SameSite=Strict; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example: {}
 *       401:
 *         description: احراز هویت نشده
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/logout", ProfileController.logout);

export default router;
