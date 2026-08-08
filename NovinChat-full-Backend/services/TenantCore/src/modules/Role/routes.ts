import { Router } from "express";
import RoleController from "./controller.js";
import PermissionMiddleware from "../../middlewares/permissionMiddleware.js";

const router: Router = Router();

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: دریافت لیست نقش‌ها
 *     description: این endpoint لیست نقش‌های سیستم را با قابلیت pagination نمایش می‌دهد
 *     tags:
 *       - Roles
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           example: 1
 *         description: شماره صفحه
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           example: 10
 *         description: تعداد آیتم در هر صفحه (حداکثر ۵۰)
 *     responses:
 *       200:
 *         description: موفقیت آمیز
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 roles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Role'
 *                 total:
 *                   type: integer
 *                   example: 25
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 totalPages:
 *                   type: integer
 *                   example: 3
 *       400:
 *         description: صفحه یا محدودیت نامعتبر است
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 */
router.get("/", PermissionMiddleware("role.view"), RoleController.index);

/**
 * @swagger
 * /roles/{id}:
 *   get:
 *     summary: دریافت یک نقش
 *     description: این endpoint اطلاعات یک نقش را بر اساس شناسه نمایش می‌دهد
 *     tags:
 *       - Roles
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: شناسه نقش
 *     responses:
 *       200:
 *         description: موفقیت آمیز
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Role'
 *       400:
 *         description: شناسه نامعتبر است
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 *       404:
 *         description: نقش پیدا نشد
 */
router.get("/:id", PermissionMiddleware("role.view"), RoleController.show);

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: ایجاد نقش جدید
 *     description: این endpoint یک نقش جدید در سیستم ایجاد می‌کند
 *     tags:
 *       - Roles
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 32
 *                 example: "admin"
 *                 description: نام نقش
 *               description:
 *                 type: string
 *                 maxLength: 255
 *                 nullable: true
 *                 example: "مدیر سیستم"
 *                 description: توضیحات نقش (اختیاری)
 *     responses:
 *       201:
 *         description: نقش ایجاد شد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Role'
 *       400:
 *         description: داده‌های ورودی نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 *       409:
 *         description: نقش تکراری
 */

router.post("/", PermissionMiddleware("role.create"), RoleController.create);

/**
 * @swagger
 * /roles/{id}:
 *   put:
 *     summary: آپدیت نقش
 *     description: این endpoint اطلاعات یک نقش موجود را به‌روزرسانی می‌کند
 *     tags:
 *       - Roles
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: شناسه نقش
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 32
 *                 example: "manager"
 *                 description: نام نقش
 *               description:
 *                 type: string
 *                 maxLength: 255
 *                 nullable: true
 *                 example: "مدیر بخش"
 *                 description: توضیحات نقش
 *     responses:
 *       200:
 *         description: موفقیت آمیز
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Role'
 *       400:
 *         description: داده‌های ورودی نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 *       404:
 *         description: نقش پیدا نشد
 */
router.put("/:id", PermissionMiddleware("role.update"), RoleController.update);

/**
 * @swagger
 * /roles/{id}:
 *   delete:
 *     summary: حذف نقش
 *     description: این endpoint یک نقش را از سیستم حذف می‌کند
 *     tags:
 *       - Roles
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: شناسه نقش
 *     responses:
 *       204:
 *         description: نقش با موفقیت حذف شد (بدون محتوا)
 *       400:
 *         description: شناسه نامعتبر است
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 *       404:
 *         description: نقش پیدا نشد
 */
router.delete("/:id", PermissionMiddleware("role.delete"), RoleController.delete);

export default router;
