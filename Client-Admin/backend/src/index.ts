import express from "express";
import "dotenv/config";
import "./database/models/index.js";
import ErrorMiddleware, { AppError } from "./middlewares/errorMiddleware.js";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRouter from "./modules/Auth/routes.js";
import userRouter from "./modules/User/routes.js";
import userPermissionRoute from "./modules/UserPermission/routes.js";
import rolePermissionRoute from "./modules/RolePermission/routes.js";
import profileRoutes from "./modules/Profile/routes.js";
import { pinoHttp } from "pino-http";
import logger from "./config/pino.js";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import AuthMiddleware from "./middlewares/authMiddleware.js";
import TenantMiddleware from "./middlewares/tenantMiddleware.js";
import routes from "./config/routes.js";
import roleRoutes from "./modules/Role/routes.js";

if (process.env.JWT_EC_PRIVATE_KEY === undefined || process.env.JWT_EC_PUBLIC_KEY === undefined) {
    throw new AppError("JWT keys are not configured", 500);
}

const app: express.Application = express();
app.use(
    pinoHttp({
        logger: logger,
        genReqId: () => {
            return crypto.randomUUID();
        },
    }),
);
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(TenantMiddleware);

app.use("/auth", authRouter);
app.use("/users", AuthMiddleware, userRouter);
app.use("/user-permission", AuthMiddleware, userPermissionRoute);
app.use("/role-permission", AuthMiddleware, rolePermissionRoute);
app.use("/profile", AuthMiddleware, profileRoutes);
app.use("/roles", AuthMiddleware, roleRoutes);
if (process.env.NODE_ENV === "development") {
    const options = {
        definition: {
            openapi: "3.0.0",
            info: {
                title: "User & Permission Management API",
                version: "1.0.0",
                description: "مستندات API مدیریت کاربران و دسترسی‌ها",
            },
            servers: [
                {
                    url: "http://localhost:3000",
                    description: "Development server",
                },
            ],
            components: {
                securitySchemes: {
                    cookieAuth: {
                        type: "apiKey",
                        in: "cookie",
                        name: "token",
                        description:
                            'پس از ورود موفق، توکن JWT به صورت کوکی httpOnly با نام "token" تنظیم می‌شود و به صورت خودکار ارسال می‌گردد',
                    },
                },
                schemas: {
                    // تعریف Schema برای User
                    User: {
                        type: "object",
                        properties: {
                            id: {
                                type: "integer",
                                example: 1,
                                description: "شناسه کاربر",
                            },
                            login_id: {
                                type: "string",
                                example: "amirh",
                                description: "نام کاربری",
                            },
                            phone: {
                                type: "string",
                                example: "09123456789",
                                description: "شماره تماس",
                            },
                            employee_id: {
                                type: "integer",
                                example: 1001,
                                description: "شناسه پرسنلی",
                            },
                            role_id: {
                                type: "integer",
                                nullable: true,
                                example: 1,
                                description: "شناسه نقش",
                            },
                            created_at: {
                                type: "string",
                                format: "date-time",
                                example: "2024-01-01T10:00:00Z",
                            },
                            updated_at: {
                                type: "string",
                                format: "date-time",
                                example: "2024-01-01T10:00:00Z",
                            },
                        },
                    },
                    // تعریف Schema برای Role
                    Role: {
                        type: "object",
                        properties: {
                            id: {
                                type: "integer",
                                example: 1,
                                description: "شناسه نقش",
                            },
                            name: {
                                type: "string",
                                example: "admin",
                                description: "نام نقش",
                            },
                            description: {
                                type: "string",
                                nullable: true,
                                example: "مدیر سیستم",
                                description: "توضیحات نقش",
                            },
                            created_at: {
                                type: "string",
                                format: "date-time",
                                example: "2024-01-01T10:00:00Z",
                            },
                            updated_at: {
                                type: "string",
                                format: "date-time",
                                example: "2024-01-01T10:00:00Z",
                            },
                        },
                    },
                    // تعریف Schema برای Permission
                    Permission: {
                        type: "object",
                        properties: {
                            id: {
                                type: "integer",
                                example: 1,
                            },
                            name: {
                                type: "string",
                                example: "user.create",
                            },
                            description: {
                                type: "string",
                                example: "Permission to create a user",
                            },
                        },
                    },
                    // تعریف Schema برای Error
                    Error: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                example: "An error occurred",
                            },
                        },
                    },
                },
            },
        },
        apis: ["./src/routes/*.ts"], // مسیر فایل‌های route
    };
    const swaggerSpec = swaggerJsdoc(options);
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.use("/api/v1", routes);
}

const APP_PORT: number = Number(process.env.APP_PORT ?? 3000);

app.use(ErrorMiddleware);
app.listen(Number(APP_PORT), () => {
    console.log("server initialized!");
});

export default app;
