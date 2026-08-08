import { Router } from "express";
import UserController from "./controller.js";
import PermissionMiddleware from "../../middlewares/permissionMiddleware.js";
import { controllerErrorHandler } from "../../middlewares/errorMiddleware.js";

const router: Router = Router();

/**
 * @swagger
 * /users:
 *   get:
 *     summary: دریافت لیست تمام کاربران
 *     description: این endpoint لیست تمام کاربران سیستم را با قابلیت pagination و فیلتر نمایش می‌دهد
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: شماره صفحه
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         description: تعداد آیتم در هر صفحه
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: "john"
 *         description: جستجو در نام کاربری یا شماره تماس
 *     responses:
 *       200:
 *         description: موفقیت آمیز
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 */
router.get("/", PermissionMiddleware("user.view"), controllerErrorHandler(UserController.index));

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: دریافت اطلاعات یک کاربر خاص
 *     description: این endpoint اطلاعات کامل یک کاربر را بر اساس شناسه نمایش می‌دهد
 *     tags:
 *       - Users
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
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 *       404:
 *         description: کاربر پیدا نشد
 */
router.get("/:id", PermissionMiddleware("user.view"), controllerErrorHandler(UserController.show));

/**
 * @swagger
 * /users:
 *   post:
 *     summary: ایجاد کاربر جدید
 *     description: این endpoint یک کاربر جدید در سیستم ایجاد می‌کند
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - login_id
 *               - password
 *               - phone
 *               - employee_id
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
 *               phone:
 *                 type: string
 *                 example: "09123456789"
 *                 description: شماره تماس
 *               employee_id:
 *                 type: integer
 *                 example: 1001
 *                 description: شناسه پرسنلی
 *               role_id:
 *                 type: integer
 *                 example: 1
 *                 description: شناسه نقش (اختیاری)
 *     responses:
 *       201:
 *         description: ایجاد شده
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "کاربر با موفقیت ایجاد شد"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: داده‌های ورودی نامعتبر
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 *       409:
 *         description: کاربر تکراری
 */
router.post("/", PermissionMiddleware("user.create"), controllerErrorHandler(UserController.create));

/**
 * @swagger
 * /users/change-password:
 *   put:
 *     summary: تغییر رمز عبور کاربر جاری
 *     description: این endpoint رمز عبور کاربر احراز هویت شده را تغییر می‌دهد
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - old_password
 *               - new_password
 *             properties:
 *               old_password:
 *                 type: string
 *                 format: password
 *                 example: "OldPass123!"
 *                 description: رمز عبور فعلی
 *               new_password:
 *                 type: string
 *                 format: password
 *                 example: "NewPass123!"
 *                 description: رمز عبور جدید
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
 *                   example: "رمز عبور با موفقیت تغییر کرد"
 *       400:
 *         description: رمز عبور فعلی اشتباه است یا داده‌ها نامعتبر
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 */
router.put("/change-password", controllerErrorHandler(UserController.changePassword));

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: به‌روزرسانی اطلاعات کاربر
 *     description: این endpoint اطلاعات یک کاربر موجود را به‌روزرسانی می‌کند
 *     tags:
 *       - Users
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
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "09123456789"
 *               role_id:
 *                 type: integer
 *                 example: 1
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
 *                   example: "کاربر با موفقیت به‌روزرسانی شد"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: داده‌های ورودی نامعتبر
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 *       404:
 *         description: کاربر پیدا نشد
 */
router.put("/:id", PermissionMiddleware("user.update"), controllerErrorHandler(UserController.update));

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: حذف کاربر
 *     description: این endpoint یک کاربر را از سیستم حذف می‌کند
 *     tags:
 *       - Users
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
 *                 message:
 *                   type: string
 *                   example: "کاربر با موفقیت حذف شد"
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 *       404:
 *         description: کاربر پیدا نشد
 */
router.delete("/:id", PermissionMiddleware("user.delete"), controllerErrorHandler(UserController.delete));

export default router;
