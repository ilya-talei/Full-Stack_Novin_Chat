import { Router } from "express";
import PermissionMiddleware from "../../middlewares/permissionMiddleware.js";
import UserPermissionController from "./controller.js";
import { controllerErrorHandler } from "../../middlewares/errorMiddleware.js";

const router: Router = Router();

/**
 * @swagger
 * /user-permission/{id}:
 *   get:
 *     summary: دریافت لیست دسترسی‌های یک کاربر
 *     description: این endpoint لیست تمام دسترسی‌های مستقیم اختصاص داده شده به کاربر را نمایش می‌دهد
 *     tags:
 *       - User Permissions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: شناسه کاربر
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: موفقیت آمیز
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "user.create"
 *                       allow:
 *                         type: boolean
 *                         example: true
 *       401:
 *         description: احراز هویت نشده
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Authentication Failed"
 *       403:
 *         description: دسترسی غیرمجاز
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Forbidden"
 *       404:
 *         description: کاربر پیدا نشد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "کاربر مورد نظر پیدا نشد"
 */
router.get("/:id", PermissionMiddleware("user_permission.index"), controllerErrorHandler(UserPermissionController.index));

/**
 * @swagger
 * /user-permission/{id}:
 *   put:
 *     summary: اختصاص یا به‌روزرسانی یک دسترسی به کاربر
 *     description: این endpoint یک دسترسی خاص را به کاربر اختصاص می‌دهد یا مقدار allow آن را به‌روزرسانی می‌کند
 *     tags:
 *       - User Permissions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: شناسه کاربر
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permission_name
 *               - allow
 *             properties:
 *               permission_name:
 *                 type: string
 *                 example: "user.create"
 *                 description: نام دسترسی
 *               allow:
 *                 type: boolean
 *                 example: true
 *                 description: وضعیت دسترسی (مجاز/غیرمجاز)
 *     responses:
 *       200:
 *         description: موفقیت آمیز
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "دسترسی با موفقیت اختصاص داده شد"
 *       400:
 *         description: درخواست نامعتبر (کمبود فیلدهای required یا نوع داده اشتباه)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ارسال شناسه کاربر ضروری است"
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 *       404:
 *         description: کاربر پیدا نشد
 */
router.put("/:id", PermissionMiddleware("user_permission.assign"), controllerErrorHandler(UserPermissionController.assign));

/**
 * @swagger
 * /user-permission/{id}:
 *   delete:
 *     summary: حذف یک دسترسی از کاربر
 *     description: این endpoint یک دسترسی خاص را از کاربر حذف می‌کند
 *     tags:
 *       - User Permissions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: شناسه کاربر
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permission_name
 *             properties:
 *               permission_name:
 *                 type: string
 *                 example: "user.create"
 *                 description: نام دسترسی
 *     responses:
 *       200:
 *         description: موفقیت آمیز
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "دسترسی با موفقیت حذف شد"
 *       400:
 *         description: درخواست نامعتبر
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 *       404:
 *         description: کاربر پیدا نشد
 */
router.delete(
    "/:id",
    PermissionMiddleware("user_permission.remove"),
    controllerErrorHandler(UserPermissionController.remove),
);

export default router;
