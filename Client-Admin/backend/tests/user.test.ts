import bcrypt from "bcrypt";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/index.js";
import { setupTestDatabase } from "./setup.js";
import { Tenant } from "../src/middlewares/tenantMiddleware.js";
import managerService from "../src/modules/Manager/service.js";
import UserController from "../src/modules/User/controller.js";
import { AppError } from "../src/middlewares/errorMiddleware.js";

describe("User controller edge cases", () => {
    it("should reject update requests with an invalid id", async () => {
        const req = {
            params: { id: "-1" },
            body: { phone: "09123456789" },
            tenant: { services: { user: { update: vi.fn() } } },
        } as any;
        const res = { json: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() } as any;
        const next = vi.fn();

        await UserController.update(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        expect(next.mock.calls[0][0].status_code).toBe(400);
    });

    it("should forward update failures from the service to the next middleware", async () => {
        const req = {
            params: { id: "1" },
            body: { phone: "09123456789" },
            tenant: {
                services: {
                    user: {
                        update: vi.fn().mockRejectedValue(new AppError("User not found", 404)),
                    },
                },
            },
        } as any;
        const res = { json: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() } as any;
        const next = vi.fn();

        await UserController.update(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status_code: 404 }));
    });

    it("should reject delete requests when the id is missing", async () => {
        const req = {
            params: {},
            tenant: { services: { user: { delete: vi.fn() } } },
        } as any;
        const res = { json: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() } as any;
        const next = vi.fn();

        await UserController.delete(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        expect(next.mock.calls[0][0].status_code).toBe(400);
    });

    it("should reject delete requests with a non-numeric id", async () => {
        const req = {
            params: { id: "abc" },
            tenant: { services: { user: { delete: vi.fn() } } },
        } as any;
        const res = { json: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() } as any;
        const next = vi.fn();

        await UserController.delete(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        expect(next.mock.calls[0][0].status_code).toBe(400);
    });

    it("should reject delete requests with a non-positive id", async () => {
        const req = {
            params: { id: "0" },
            tenant: { services: { user: { delete: vi.fn() } } },
        } as any;
        const res = { json: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() } as any;
        const next = vi.fn();

        await UserController.delete(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        expect(next.mock.calls[0][0].status_code).toBe(400);
    });

    it("should forward delete failures from the service to the next middleware", async () => {
        const req = {
            params: { id: "1" },
            tenant: {
                services: {
                    user: {
                        delete: vi.fn().mockRejectedValue(new AppError("User not found", 404)),
                    },
                },
            },
        } as any;
        const res = { json: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() } as any;
        const next = vi.fn();

        await UserController.delete(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status_code: 404 }));
    });

    it("should reject password change requests with invalid payloads", async () => {
        const req = {
            body: { current_password: "", new_password: "short" },
            tenant: { services: { user: { changePassword: vi.fn() } } },
        } as any;
        const res = { json: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() } as any;
        const next = vi.fn();

        await UserController.changePassword(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        expect(next.mock.calls[0][0].status_code).toBe(400);
    });

    it("should reject password change requests without an authenticated user id", async () => {
        const req = {
            body: { current_password: "password123", new_password: "NewPassword123!" },
            userId: undefined,
            tenant: { services: { user: { changePassword: vi.fn() } } },
        } as any;
        const res = { json: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() } as any;
        const next = vi.fn();

        await UserController.changePassword(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        expect(next.mock.calls[0][0].status_code).toBe(401);
    });

    it("should forward password change failures from the service to the next middleware", async () => {
        const req = {
            body: { current_password: "password123", new_password: "NewPassword123!" },
            userId: 1,
            tenant: {
                services: {
                    user: {
                        changePassword: vi
                            .fn()
                            .mockRejectedValue(new AppError("Current password is wrong", 400)),
                    },
                },
            },
        } as any;
        const res = { json: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() } as any;
        const next = vi.fn();

        await UserController.changePassword(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status_code: 400 }));
    });
});

describe("User routes integration tests", () => {
    let tenant1: Tenant;
    let authCookie: string;
    let targetUserId: number;
    let validSessionId: number;

    beforeAll(async () => {
        vi.spyOn(managerService, "getTenantByDomain").mockImplementation(async (domain: string) => {
            if (domain === "localhost") {
                return {
                    id: 1,
                    name: "Tenant 1",
                    domain: "localhost",
                    db_name: "tenant1_db",
                    active: true,
                    created_at: new Date(),
                };
            }

            throw new Error("Tenant not found");
        });

        tenant1 = await Tenant.get("localhost");
        await setupTestDatabase(tenant1.sequelize);

        const user = await tenant1.models.User.create({
            login_id: "usertester",
            hashed_password: await bcrypt.hash("password123", 10),
            phone: "09038850001",
        });

        const sessionRecord = await tenant1.models.Session.create({
            user_id: user.id,
            expire_at: new Date(Date.now() + 1000 * 60 * 60),
            ip_address: "127.0.0.1",
            user_agent: "vitest",
            active: true,
        });

        validSessionId = sessionRecord.id;

        const token = jwt.sign(
            {
                sessionId: sessionRecord.id,
                userId: user.id,
                tenant_id: 1,
                permissions: {
                    "user.view": true,
                    "user.create": true,
                    "user.update": true,
                    "user.delete": true,
                    "user.change_password": true,
                },
            },
            process.env.JWT_EC_PRIVATE_KEY!,
            { algorithm: "ES256", expiresIn: Number(process.env.SESSION_LIFETIME || 60 * 60 * 5) },
        );

        authCookie = `token=${token}`;

        const targetUser = await tenant1.models.User.create({
            login_id: "targetuser",
            hashed_password: await bcrypt.hash("password123", 10),
            phone: "09038850002",
        });

        targetUserId = targetUser.id;
    });

    afterAll(() => {
        vi.restoreAllMocks();
    });

    it("should list users with pagination and search", async () => {
        const response = await request(app)
            .get("/users?page=1&limit=10&search=target")
            .set("host", "localhost")
            .set("Cookie", authCookie);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("count");
        expect(response.body.count).toBeGreaterThanOrEqual(1);
        expect(Array.isArray(response.body.rows)).toBe(true);
    });

    it("should return 403 when the user lacks view permission", async () => {
        const token = jwt.sign(
            {
                sessionId: validSessionId,
                userId: 1,
                tenant_id: 1,
                permissions: {},
            },
            process.env.JWT_EC_PRIVATE_KEY!,
            { algorithm: "ES256", expiresIn: Number(process.env.SESSION_LIFETIME || 60 * 60 * 5) },
        );

        const response = await request(app)
            .get("/users")
            .set("host", "localhost")
            .set("Cookie", `token=${token}`);

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty("message", "Forbidden");
    });

    it("should create a user", async () => {
        const response = await request(app)
            .post("/users")
            .set("host", "localhost")
            .set("Cookie", authCookie)
            .send({
                login_id: "newuser",
                password: "Password123!",
                phone: "09123456789",
                employee_id: 1001,
                active: true,
            });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty("id");
        expect(response.body).toHaveProperty("login_id", "newuser");
        expect(response.body).toHaveProperty("phone", "09123456789");
    });

    it("should return a user by id", async () => {
        const response = await request(app)
            .get(`/users/${targetUserId}`)
            .set("host", "localhost")
            .set("Cookie", authCookie);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("id", targetUserId);
        expect(response.body).toHaveProperty("login_id", "targetuser");
    });

    it("should update a user", async () => {
        const response = await request(app)
            .put(`/users/${targetUserId}`)
            .set("host", "localhost")
            .set("Cookie", authCookie)
            .send({
                phone: "09111111111",
                active: false,
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("id", targetUserId);
        expect(response.body).toHaveProperty("phone", "09111111111");
        expect(response.body).toHaveProperty("active", false);
    });

    it("should change the authenticated user's password", async () => {
        const response = await request(app)
            .put("/users/change-password")
            .set("host", "localhost")
            .set("Cookie", authCookie)
            .send({
                current_password: "password123",
                new_password: "NewPassword123!",
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("message", "رمز عبور با موفقیت تغییر یافت");
    });

    it("should delete a user", async () => {
        const createResponse = await request(app)
            .post("/users")
            .set("host", "localhost")
            .set("Cookie", authCookie)
            .send({
                login_id: "deleteuser",
                password: "Password123!",
                phone: "09123456790",
                employee_id: 1002,
                active: true,
            });

        expect(createResponse.status).toBe(201);
        const userId = createResponse.body.id;

        const deleteResponse = await request(app)
            .delete(`/users/${userId}`)
            .set("host", "localhost")
            .set("Cookie", authCookie);

        expect(deleteResponse.status).toBe(204);

        const fetchResponse = await request(app)
            .get(`/users/${userId}`)
            .set("host", "localhost")
            .set("Cookie", authCookie);

        expect(fetchResponse.status).toBe(404);
    });
});
