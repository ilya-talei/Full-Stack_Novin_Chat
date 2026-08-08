import bcrypt from "bcrypt";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/index.js";
import { setupTestDatabase } from "./setup.js";
import { Tenant } from "../src/middlewares/tenantMiddleware.js";
import managerService from "../src/modules/Manager/service.js";
import RolePermissionController from "../src/modules/RolePermission/controller.js";

describe("RolePermissionController guard clauses", () => {
    it("should pass an error when index is called without an id", async () => {
        const req = {
            params: {},
            tenant: {
                services: {
                    rolePermission: {
                        index: vi.fn(),
                    },
                },
            },
        } as any;
        const res = { json: vi.fn() } as any;
        const next = vi.fn();

        await RolePermissionController.index(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status_code: 400 }));
        expect(req.tenant.services.rolePermission.index).not.toHaveBeenCalled();
    });

    it("should pass an error when assign is called without an id", async () => {
        const req = {
            params: {},
            body: { permission_name: "role_permission.index", allow: true },
            tenant: {
                services: {
                    rolePermission: {
                        assign: vi.fn(),
                    },
                },
            },
        } as any;
        const res = { json: vi.fn() } as any;
        const next = vi.fn();

        await RolePermissionController.assign(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status_code: 400 }));
        expect(req.tenant.services.rolePermission.assign).not.toHaveBeenCalled();
    });

    it("should pass an error when remove is called without an id", async () => {
        const req = {
            params: {},
            body: { permission_name: "role_permission.index" },
            tenant: {
                services: {
                    rolePermission: {
                        remove: vi.fn(),
                    },
                },
            },
        } as any;
        const res = { json: vi.fn() } as any;
        const next = vi.fn();

        await RolePermissionController.remove(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status_code: 400 }));
        expect(req.tenant.services.rolePermission.remove).not.toHaveBeenCalled();
    });

    it("should reject invalid assign payloads before calling the service", async () => {
        const req = {
            params: { id: "1" },
            body: { permission_name: "role_permission.index" },
            tenant: {
                services: {
                    rolePermission: {
                        assign: vi.fn(),
                    },
                },
            },
        } as any;
        const res = { json: vi.fn() } as any;
        const next = vi.fn();

        await RolePermissionController.assign(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status_code: 400 }));
        expect(req.tenant.services.rolePermission.assign).not.toHaveBeenCalled();
    });

    it("should reject invalid remove payloads before calling the service", async () => {
        const req = {
            params: { id: "1" },
            body: {},
            tenant: {
                services: {
                    rolePermission: {
                        remove: vi.fn(),
                    },
                },
            },
        } as any;
        const res = { json: vi.fn() } as any;
        const next = vi.fn();

        await RolePermissionController.remove(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status_code: 400 }));
        expect(req.tenant.services.rolePermission.remove).not.toHaveBeenCalled();
    });

    it("should forward service errors from remove to the error middleware", async () => {
        const req = {
            params: { id: "1" },
            body: { permission_name: "role_permission.index" },
            tenant: {
                services: {
                    rolePermission: {
                        remove: vi.fn().mockRejectedValue(new Error("boom")),
                    },
                },
            },
        } as any;
        const res = { json: vi.fn() } as any;
        const next = vi.fn();

        await RolePermissionController.remove(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

describe("Role permission integration tests", () => {
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
            login_id: "rolepermtester",
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

        const token = jwt.sign(
            {
                sessionId: sessionRecord.id,
                userId: user.id,
                tenant_id: 1,
                permissions: {
                    "role.create": true,
                    "role.view": true,
                    "role.update": true,
                    "role.delete": true,
                    "role_permission.index": true,
                    "role_permission.assign": true,
                    "role_permission.remove": true,
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

    const createRole = async (name: string) => {
        const res = await request(app)
            .post("/roles")
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie)
            .send({ name, description: `${name} description` });

        expect(res.status).toBe(201);
        return res.body.id;
    };

    it("should return permissions for a role", async () => {
        const roleId = await createRole("RoleList");

        const res = await request(app)
            .get(`/role-permission/${roleId}`)
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("permissions");
        expect(Array.isArray(res.body.permissions)).toBe(true);
    });

    it("should assign a permission to a role and list it", async () => {
        const roleId = await createRole("RoleAssign");

        const assignRes = await request(app)
            .put(`/role-permission/${roleId}`)
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie)
            .send({ permission_name: "role_permission.index", allow: true });

        expect(assignRes.status).toBe(200);
        expect(assignRes.body).toHaveProperty("message", "دسترسی با موفقیت اختصاص داده شد");

        const listRes = await request(app)
            .get(`/role-permission/${roleId}`)
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie);

        expect(listRes.status).toBe(200);
        expect(listRes.body.permissions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: "role_permission.index", allow: true }),
            ]),
        );
    });

    it("should remove a permission from a role", async () => {
        const roleId = await createRole("RoleRemove");

        await request(app)
            .put(`/role-permission/${roleId}`)
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie)
            .send({ permission_name: "role_permission.index", allow: true });

        const removeRes = await request(app)
            .delete(`/role-permission/${roleId}`)
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie)
            .send({ permission_name: "role_permission.index" });

        expect(removeRes.status).toBe(200);
        expect(removeRes.body).toHaveProperty("message", "دسترسی با موفقیت حذف شد");

        const listRes = await request(app)
            .get(`/role-permission/${roleId}`)
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie);

        expect(listRes.status).toBe(200);
        expect(listRes.body.permissions).toEqual([]);
    });

    it("should return 404 for a missing role", async () => {
        const res = await request(app)
            .get("/role-permission/999999")
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie);

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty("message");
    });

    it("should return 400 when permission assignment payload is invalid", async () => {
        const roleId = await createRole("RoleInvalid");

        const res = await request(app)
            .put(`/role-permission/${roleId}`)
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie)
            .send({ permission_name: "role_permission.index" });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message");
    });

    it("should return 401 without authentication", async () => {
        const roleId = await createRole("RoleUnauth");

        const res = await request(app).get(`/role-permission/${roleId}`).set("host", "localhost");

        expect(res.status).toBe(401);
    });
});
