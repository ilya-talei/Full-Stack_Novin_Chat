import { Router } from "express";
import ServiceController from "./controller.js";
import TenantController from "../Tenant/controller.js";
import ServiceAuthMiddleware from "../../middlewares/serviceAuthMiddleware.js";
import { controllerErrorHandler } from "../../middlewares/errorMiddleware.js";

const router: Router = Router();

/**
 * @swagger
 * /service/token:
 *   post:
 *     summary: دریافت توکن سرویس
 *     description: این endpoint یک secret سرویس را با یک توکن JWT سرویس‌به‌سرویس (ES256) مبادله می‌کند
 *     tags:
 *       - Service (Internal)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - secret
 *             properties:
 *               secret:
 *                 type: string
 *                 example: "s3cr3t-value"
 *                 description: کلید مخفی سرویس
 *     responses:
 *       200:
 *         description: توکن با موفقیت صادر شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: احراز هویت ناموفق (secret نامعتبر یا ارسال نشده)
 */
router.post("/token", controllerErrorHandler(ServiceController.generateToken));

/**
 * @swagger
 * /service/tenants:
 *   get:
 *     summary: دریافت اطلاعات مستاجر بر اساس دامنه
 *     description: این endpoint اطلاعات یک مستاجر را بر اساس دامنه نمایش می‌دهد. مخصوص سرویس‌های داخلی است و نیاز به توکن سرویس دارد
 *     tags:
 *       - Service (Internal)
 *     security:
 *       - serviceAuth: []
 *     parameters:
 *       - in: query
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *           example: "sample.com"
 *         description: دامنه مستاجر
 *     responses:
 *       200:
 *         description: موفقیت آمیز
 *       400:
 *         description: دامنه ارسال نشده یا نامعتبر است
 *       401:
 *         description: احراز هویت نشده
 *       404:
 *         description: مستاجر پیدا نشد
 */
router.get("/tenants", ServiceAuthMiddleware, controllerErrorHandler(TenantController.showByDomain));

export default router;
