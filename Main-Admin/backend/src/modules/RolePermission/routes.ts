import { Router } from "express";
import RolePermissionController from "./controller.js";
import PermissionMiddleware from "../../middlewares/permissionMiddleware.js";
import { controllerErrorHandler } from "../../middlewares/errorMiddleware.js";

const router: Router = Router();

/**
 * @swagger
 * /role-permission/{id}:
 *   get:
 *     summary: دریافت لیست دسترسی‌های یک نقش
 *     description: این endpoint لیست تمام دسترسی‌های اختصاص داده شده به یک نقش را نمایش می‌دهد
 *     tags:
 *       - Role Permissions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: شناسه نقش
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
 *       403:
 *         description: دسترسی غیرمجاز
 *       404:
 *         description: نقش پیدا نشد
 */
router.get("/:id", PermissionMiddleware("role_permission.index"), controllerErrorHandler(RolePermissionController.index));

/**
 * @swagger
 * /role-permission/{id}:
 *   put:
 *     summary: اختصاص یا به‌روزرسانی یک دسترسی به نقش
 *     description: این endpoint یک دسترسی خاص را به نقش اختصاص می‌دهد یا مقدار allow آن را به‌روزرسانی می‌کند
 *     tags:
 *       - Role Permissions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: شناسه نقش
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
 *         description: درخواست نامعتبر
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 *       404:
 *         description: نقش پیدا نشد
 */
router.put("/:id", PermissionMiddleware("role_permission.assign"), controllerErrorHandler(RolePermissionController.assign));

/**
 * @swagger
 * /role-permission/{id}:
 *   delete:
 *     summary: حذف یک دسترسی از نقش
 *     description: این endpoint یک دسترسی خاص را از نقش حذف می‌کند
 *     tags:
 *       - Role Permissions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: شناسه نقش
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
 *         description: نقش پیدا نشد
 */
router.delete(
    "/:id",
    PermissionMiddleware("role_permission.remove"),
    controllerErrorHandler(RolePermissionController.remove),
);

export default router;
