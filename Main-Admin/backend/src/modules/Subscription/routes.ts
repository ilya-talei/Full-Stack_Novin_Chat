import { Router } from "express";
import SubscriptionController from "./controller.js";
import PermissionMiddleware from "../../middlewares/permissionMiddleware.js";
import { controllerErrorHandler } from "../../middlewares/errorMiddleware.js";

const router: Router = Router();

/**
 * @swagger
 * /subscriptions:
 *   post:
 *     summary: ایجاد اشتراک جدید
 *     description: این endpoint یک اشتراک جدید در سیستم ایجاد می‌کند
 *     tags:
 *       - Subscriptions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenant_id
 *               - product_id
 *               - start_date
 *               - end_date
 *               - status
 *             properties:
 *               tenant_id:
 *                 type: integer
 *                 example: 1
 *                 description: شناسه مستاجر
 *               product_id:
 *                 type: integer
 *                 example: 1
 *                 description: شناسه محصول
 *               start_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-01-01"
 *                 description: تاریخ شروع اشتراک
 *               end_date:
 *                 type: string
 *                 format: date
 *                 example: "2027-01-01"
 *                 description: تاریخ پایان اشتراک
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: "active"
 *                 description: وضعیت اشتراک
 *     responses:
 *       201:
 *         description: اشتراک با موفقیت ایجاد شد
 *       400:
 *         description: داده‌های ورودی نامعتبر
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 *       404:
 *         description: مستاجر یا محصول پیدا نشد
 */
router.post("/", PermissionMiddleware("subscription.create"), controllerErrorHandler(SubscriptionController.create));

/**
 * @swagger
 * /subscriptions/{id}:
 *   put:
 *     summary: به‌روزرسانی اشتراک
 *     description: این endpoint اطلاعات یک اشتراک موجود را به‌روزرسانی می‌کند
 *     tags:
 *       - Subscriptions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: شناسه اشتراک
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               end_date:
 *                 type: string
 *                 format: date
 *                 example: "2028-01-01"
 *                 description: تاریخ پایان اشتراک
 *               status:
 *                 type: string
 *                 enum: [active, inactive, expired, cancelled]
 *                 example: "active"
 *                 description: وضعیت اشتراک
 *     responses:
 *       200:
 *         description: موفقیت آمیز
 *       400:
 *         description: داده‌های ورودی نامعتبر
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 *       404:
 *         description: اشتراک پیدا نشد
 */
router.put("/:id", PermissionMiddleware("subscription.update"), controllerErrorHandler(SubscriptionController.update));

export default router;
