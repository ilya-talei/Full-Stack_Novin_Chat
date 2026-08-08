import bcrypt from "bcrypt";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/index.js";
import { setupTestDatabase } from "./setup.js";
import { Tenant } from "../src/middlewares/tenantMiddleware.js";
import managerService from "../src/modules/Manager/service.js";
import UserPermissionController from "../src/modules/UserPermission/contrller.js";

describe("UserPermissionController guard clauses", () => {
    it("should pass an error when index is called without an id", async () => {
        const req = {
            params: {},
            tenant: {
                services: {
                    userPermission: {
                        index: vi.fn(),
                    },
                },
            },
        } as any;
        const res = { json: vi.fn() } as any;
        const next = vi.fn();

        await UserPermissionController.index(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status_code: 400 }));
        expect(req.tenant.services.userPermission.index).not.toHaveBeenCalled();
    });

    it("should reject invalid assign payloads before calling the service", async () => {
        const req = {
            params: { id: "1" },
            body: { permission_name: "user_permission.index" },
            tenant: {
                services: {
                    userPermission: {
                        assign: vi.fn(),
                    },
                },
            },
        } as any;
        const res = { json: vi.fn() } as any;
        const next = vi.fn();

        await UserPermissionController.assign(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status_code: 400 }));
        expect(req.tenant.services.userPermission.assign).not.toHaveBeenCalled();
    });

    it("should forward service errors from assign to the error middleware", async () => {
        const req = {
            params: { id: "1" },
            body: { permission_name: "user_permission.index", allow: true },
            tenant: {
                services: {
                    userPermission: {
                        assign: vi.fn().mockRejectedValue(new Error("boom")),
                    },
                },
            },
        } as any;
        const res = { json: vi.fn() } as any;
        const next = vi.fn();

        await UserPermissionController.assign(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should pass an error when remove is called without an id", async () => {
        const req = {
            params: {},
            body: { permission_name: "user_permission.index" },
            tenant: {
                services: {
                    userPermission: {
                        remove: vi.fn(),
                    },
                },
            },
        } as any;
        const res = { json: vi.fn() } as any;
        const next = vi.fn();

        await UserPermissionController.remove(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status_code: 400 }));
        expect(req.tenant.services.userPermission.remove).not.toHaveBeenCalled();
    });

    it("should reject invalid remove payloads before calling the service", async () => {
        const req = {
            params: { id: "1" },
            body: {},
            tenant: {
                services: {
                    userPermission: {
                        remove: vi.fn(),
                    },
                },
            },
        } as any;
        const res = { json: vi.fn() } as any;
        const next = vi.fn();

        await UserPermissionController.remove(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status_code: 400 }));
        expect(req.tenant.services.userPermission.remove).not.toHaveBeenCalled();
    });

    it("should forward service errors from remove to the error middleware", async () => {
        const req = {
            params: { id: "1" },
            body: { permission_name: "user_permission.index" },
            tenant: {
                services: {
                    userPermission: {
                        remove: vi.fn().mockRejectedValue(new Error("boom")),
                    },
                },
            },
        } as any;
        const res = { json: vi.fn() } as any;
        const next = vi.fn();

        await UserPermissionController.remove(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

describe("User permission integration tests", () => {
    let tenant1: Tenant;

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
            login_id: "userpermtester",
            hashed_password: await bcrypt.hash("password123", 10),
            phone: "09038850002",
        });

        const sessionRecord = await tenant1.models.Session.create({
            user_id: user.id,
            expire_at: new Date(Date.now() + 1000 * 60 * 60),
            ip_address: "127.0.0.1",
            user_agent: "vitest",
            active: true,
        });

        const token = jwt.sign(
            {
                sessionId: sessionRecord.id,
                userId: user.id,
                tenant_id: 1,
                permissions: {
                    "user_permission.index": true,
                    "user_permission.assign": true,
                    "user_permission.remove": true,
                },
            },
            process.env.JWT_EC_PRIVATE_KEY!,
            { algorithm: "ES256", expiresIn: Number(process.env.SESSION_LIFETIME || 60 * 60 * 5) },
        );

        (tenant1 as any).testAuthCookie = `token=${token}`;
    });

    afterAll(() => {
        vi.restoreAllMocks();
    });

    const createUser = async () => {
        const loginId = `userperm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const user = await tenant1.models.User.create({
            login_id: loginId,
            hashed_password: await bcrypt.hash("password123", 10),
            phone: `09${Math.floor(100000000 + Math.random() * 900000000)}`,
        });

        return user;
    };

    it("should return an empty permission list for a user with no direct permissions", async () => {
        const targetUser = await createUser();

        const res = await request(app)
            .get(`/user-permission/${targetUser.id}`)
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("permissions");
        expect(res.body.permissions).toEqual([]);
    });

    it("should assign a permission to a user and list it", async () => {
        const targetUser = await createUser();

        const assignRes = await request(app)
            .put(`/user-permission/${targetUser.id}`)
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie)
            .send({ permission_name: "user_permission.index", allow: true });

        expect(assignRes.status).toBe(200);
        expect(assignRes.body).toHaveProperty("message", "دسترسی با موفقیت اختصاص داده شد");

        const listRes = await request(app)
            .get(`/user-permission/${targetUser.id}`)
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie);

        expect(listRes.status).toBe(200);
        expect(listRes.body.permissions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: "user_permission.index", allow: true }),
            ]),
        );
    });

    it("should remove a permission from a user", async () => {
        const targetUser = await createUser();

        await request(app)
            .put(`/user-permission/${targetUser.id}`)
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie)
            .send({ permission_name: "user_permission.index", allow: true });

        const removeRes = await request(app)
            .delete(`/user-permission/${targetUser.id}`)
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie)
            .send({ permission_name: "user_permission.index" });

        expect(removeRes.status).toBe(200);
        expect(removeRes.body).toHaveProperty("message", "دسترسی با موفقیت حذف شد");

        const listRes = await request(app)
            .get(`/user-permission/${targetUser.id}`)
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie);

        expect(listRes.status).toBe(200);
        expect(listRes.body.permissions).toEqual([]);
    });

    it("should return 404 for a missing user", async () => {
        const res = await request(app)
            .get("/user-permission/999999")
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message", "کاربر مورد نظر پیدا نشد");
    });
});
