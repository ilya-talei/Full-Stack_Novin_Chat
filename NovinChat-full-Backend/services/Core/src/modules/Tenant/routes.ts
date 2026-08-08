import { Router } from "express";
import TenantController from "./controller.js";
import PermissionMiddleware from "../../middlewares/permissionMiddleware.js";
import { controllerErrorHandler } from "../../middlewares/errorMiddleware.js";

const router: Router = Router();

/**
 * @swagger
 * /tenants/my-tenants:
 *   get:
 *     summary: دریافت لیست مستاجرین خود کاربر
 *     description: این endpoint لیست مستاجرین ایجاد شده توسط کاربر جاری را با قابلیت pagination و فیلتر نمایش می‌دهد
 *     tags:
 *       - Tenants
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
 *           example: "example"
 *         description: جستجو در نام یا دامنه مستاجر
 *     responses:
 *       200:
 *         description: موفقیت آمیز
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 */
router.get("/my-tenants", PermissionMiddleware("tenant.my_tenants"), controllerErrorHandler(TenantController.myTenants));

/**
 * @swagger
 * /tenants/my-tenants/{id}:
 *   get:
 *     summary: دریافت اطلاعات یک مستاجر خاص از مستاجرین خود کاربر
 *     description: این endpoint اطلاعات یک مستاجر خاص را از بین مستاجرین ایجاد شده توسط کاربر جاری نمایش می‌دهد
 *     tags:
 *       - Tenants
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: شناسه مستاجر
 *     responses:
 *       200:
 *         description: موفقیت آمیز
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 *       404:
 *         description: مستاجر پیدا نشد
 */
router.get(
    "/my-tenants/:id",
    PermissionMiddleware("tenant.my_tenants"),
    controllerErrorHandler(TenantController.showMyTenant),
);

/**
 * @swagger
 * /tenants:
 *   get:
 *     summary: دریافت لیست تمام مستاجرین
 *     description: این endpoint لیست تمام مستاجرین سیستم را با قابلیت pagination و فیلتر نمایش می‌دهد
 *     tags:
 *       - Tenants
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
 *           example: "example"
 *         description: جستجو در نام یا دامنه مستاجر
 *     responses:
 *       200:
 *         description: موفقیت آمیز
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 */
router.get("/", PermissionMiddleware("tenant.view"), controllerErrorHandler(TenantController.index));

/**
 * @swagger
 * /tenants/{id}:
 *   get:
 *     summary: دریافت اطلاعات یک مستاجر خاص
 *     description: این endpoint اطلاعات کامل یک مستاجر را بر اساس شناسه نمایش می‌دهد
 *     tags:
 *       - Tenants
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: شناسه مستاجر
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: موفقیت آمیز
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 *       404:
 *         description: مستاجر پیدا نشد
 */
router.get("/:id", PermissionMiddleware("tenant.view"), controllerErrorHandler(TenantController.show));

/**
 * @swagger
 * /tenants:
 *   post:
 *     summary: ایجاد مستاجر جدید
 *     description: این endpoint یک مستاجر جدید در سیستم ایجاد می‌کند
 *     tags:
 *       - Tenants
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - domain
 *             properties:
 *               name:
 *                 type: string
 *                 example: "شرکت نمونه"
 *                 description: نام مستاجر
 *               domain:
 *                 type: string
 *                 example: "sample.com"
 *                 description: دامنه مستاجر
 *               creator_id:
 *                 type: integer
 *                 example: 1
 *                 description: شناسه ایجاد کننده
 *               active:
 *                 type: boolean
 *                 example: true
 *                 description: وضعیت فعال بودن
 *     responses:
 *       201:
 *         description: ایجاد شده
 *       400:
 *         description: داده‌های ورودی نامعتبر
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 */
router.post("/", PermissionMiddleware("tenant.create"), controllerErrorHandler(TenantController.create));

/**
 * @swagger
 * /tenants/{id}:
 *   put:
 *     summary: به‌روزرسانی اطلاعات مستاجر
 *     description: این endpoint اطلاعات یک مستاجر موجود را به‌روزرسانی می‌کند
 *     tags:
 *       - Tenants
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: شناسه مستاجر
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "شرکت نمونه ویرایش شده"
 *               domain:
 *                 type: string
 *                 example: "sample-updated.com"
 *               creator_id:
 *                 type: integer
 *                 example: 1
 *               active:
 *                 type: boolean
 *                 example: true
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
 *         description: مستاجر پیدا نشد
 */
router.put("/:id", PermissionMiddleware("tenant.update"), controllerErrorHandler(TenantController.update));

/**
 * @swagger
 * /tenants/{id}:
 *   delete:
 *     summary: حذف مستاجر
 *     description: این endpoint یک مستاجر را از سیستم حذف می‌کند
 *     tags:
 *       - Tenants
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: شناسه مستاجر
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: حذف شده
 *       401:
 *         description: احراز هویت نشده
 *       403:
 *         description: دسترسی غیرمجاز
 *       404:
 *         description: مستاجر پیدا نشد
 */
router.delete("/:id", PermissionMiddleware("tenant.delete"), controllerErrorHandler(TenantController.delete));

export default router;
