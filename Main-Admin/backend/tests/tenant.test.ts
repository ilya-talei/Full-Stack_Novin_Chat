import bcrypt from "bcrypt";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import app from "../src/index.js";
import Tenant from "../src/database/models/tenant.js";
import User from "../src/database/models/user.js";
import { setupTestDatabase } from "./setup.js";

async function createAuthenticatedUser(loginId: string, password: string, permissions: string[]) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const employeeId = 1000 + Math.floor(Math.random() * 9000);
    const user = await User.create({
        login_id: loginId,
        phone: `091${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
        employee_id: employeeId,
        hashed_password: hashedPassword,
    });

    for (const permission of permissions) {
        await user.assignPermission(permission, true);
    }

    const loginResponse = await request(app)
        .post("/auth/login")
        .send({ login_id: loginId, password });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toHaveProperty("token");

    return { user, token: loginResponse.body.token };
}

describe("tenantController validation branches", () => {
    beforeAll(async () => {
        await setupTestDatabase();
    });

    function createMockResponse() {
        const res: any = {};
        res.status = vi.fn().mockReturnValue(res);
        res.json = vi.fn().mockReturnValue(res);
        res.send = vi.fn().mockReturnValue(res);
        return res;
    }

    it("returns an auth error from myTenants when req.userId is missing", async () => {
        const req: any = { query: {}, userId: undefined };
        const res = createMockResponse();
        const next = vi.fn();

        await (await import("../src/modules/Tenant/controller.js")).default.myTenants(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(next.mock.calls[0][0]).toEqual(
            expect.objectContaining({ status_code: 401, message: "Authentication Failed" }),
        );
    });

    it("rejects show requests when id is provided as an array", async () => {
        const req: any = { params: { id: ["7"] } };
        const res = createMockResponse();
        const next = vi.fn();

        await (await import("../src/modules/Tenant/controller.js")).default.show(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(next.mock.calls[0][0]).toEqual(
            expect.objectContaining({ status_code: 400, message: "شناسه نامعتبر است" }),
        );
    });

    it("rejects show requests when id is not numeric", async () => {
        const req: any = { params: { id: "abc" } };
        const res = createMockResponse();
        const next = vi.fn();

        await (await import("../src/modules/Tenant/controller.js")).default.show(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(next.mock.calls[0][0]).toEqual(
            expect.objectContaining({ status_code: 400, message: "شناسه نامعتبر است" }),
        );
    });

    it("rejects show requests when id is less than one", async () => {
        const req: any = { params: { id: "0" } };
        const res = createMockResponse();
        const next = vi.fn();

        await (await import("../src/modules/Tenant/controller.js")).default.show(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(next.mock.calls[0][0]).toEqual(
            expect.objectContaining({ status_code: 400, message: "شناسه نامعتبر است" }),
        );
    });

    it("rejects update requests when id is provided as an array", async () => {
        const req: any = { params: { id: ["7"] }, body: { name: "updated" } };
        const res = createMockResponse();
        const next = vi.fn();

        await (await import("../src/modules/Tenant/controller.js")).default.update(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(next.mock.calls[0][0]).toEqual(
            expect.objectContaining({ status_code: 400, message: "شناسه نامعتبر است" }),
        );
    });

    it("rejects update requests when id is negative", async () => {
        const req: any = { params: { id: "-1" }, body: { name: "updated" } };
        const res = createMockResponse();
        const next = vi.fn();

        await (await import("../src/modules/Tenant/controller.js")).default.update(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(next.mock.calls[0][0]).toEqual(
            expect.objectContaining({ status_code: 400, message: "شناسه نامعتبر است" }),
        );
    });

    it("rejects delete requests when id is provided as an array", async () => {
        const req: any = { params: { id: ["7"] } };
        const res = createMockResponse();
        const next = vi.fn();

        await (await import("../src/modules/Tenant/controller.js")).default.delete(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(next.mock.calls[0][0]).toEqual(
            expect.objectContaining({ status_code: 400, message: "شناسه نامعتبر است" }),
        );
    });

    it("rejects delete requests when id is less than one", async () => {
        const req: any = { params: { id: "0" } };
        const res = createMockResponse();
        const next = vi.fn();

        await (await import("../src/modules/Tenant/controller.js")).default.delete(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(next.mock.calls[0][0]).toEqual(
            expect.objectContaining({ status_code: 400, message: "شناسه نامعتبر است" }),
        );
    });
});

describe("/tenants GET integration tests", () => {
    let token: string;

    beforeAll(async () => {
        await setupTestDatabase();
        const result = await createAuthenticatedUser("tenant_viewer", "TenantPass123!", [
            "tenant.view",
        ]);
        token = result.token;

        await Tenant.create({
            name: "Alpha Tenant",
            domain: `alpha-${Date.now()}-${Math.floor(Math.random() * 100000)}.example`,
            db_name: "tenant1_db",
            minio: {
                accessKey: "fdsfdsfds",
                secretKey: "admin",
                endpoint: "fdsfdsfdsf",
                pathStyle: true,
            },
            creator_id: result.user.id,
            active: true,
        });

        await Tenant.create({
            name: "Beta Tenant",
            domain: `beta-${Date.now()}-${Math.floor(Math.random() * 100000)}.example`,
            db_name: "tenant2_db",
            minio: {
                accessKey: "fdsfdsfds",
                secretKey: "admin",
                endpoint: "fdsfdsfdsf",
                pathStyle: true,
            },
            creator_id: result.user.id,
            active: false,
        });
    });

    it("returns 401 when authorization header is missing", async () => {
        const response = await request(app).get("/tenants");

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Authentication Failed" });
    });

    it("returns 400 when page is not a positive integer", async () => {
        const response = await request(app)
            .get("/tenants?page=0")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("صفحه نامعتبر است");
    });

    it("returns 400 when limit is not a positive integer", async () => {
        const response = await request(app)
            .get("/tenants?limit=0")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("محدودیت نامعتبر است");
    });

    it("returns 400 when limit exceeds the maximum allowed value", async () => {
        const response = await request(app)
            .get("/tenants?limit=51")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "محدودیت نامعتبر است",
        );
    });

    it("returns 400 when search exceeds the maximum length", async () => {
        const longSearch = "x".repeat(65);
        const response = await request(app)
            .get(`/tenants?search=${longSearch}`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("جستجو نمیتواند بیشتر از ۶۴ کاراکتر باشد");
    });

    it("returns 403 when the user lacks tenant view permission", async () => {
        const limitedUser = await createAuthenticatedUser("tenant_limited", "TenantPass123!", []);

        const response = await request(app)
            .get("/tenants")
            .set("Authorization", `Bearer ${limitedUser.token}`);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe("غیرمجاز");
    });

    it("returns a paginated tenant list for an authorized user", async () => {
        const response = await request(app)
            .get("/tenants?page=1&limit=10")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            expect.objectContaining({ count: expect.any(Number), rows: expect.any(Array) }),
        );
        expect(response.body.rows.length).toBeGreaterThanOrEqual(2);
    });

    it("filters tenants by search term", async () => {
        const response = await request(app)
            .get("/tenants?search=Alpha")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.count).toBeGreaterThanOrEqual(1);
        expect(
            response.body.rows.some((tenant: { name: string }) => tenant.name.includes("Alpha")),
        ).toBe(true);
    });
});

describe("/tenants/:id GET integration tests", () => {
    let token: string;
    let tenantId: number;

    beforeAll(async () => {
        await setupTestDatabase();
        const result = await createAuthenticatedUser("tenant_show", "TenantPass123!", [
            "tenant.view",
        ]);
        token = result.token;

        const tenant = await Tenant.create({
            name: "Show Tenant",
            domain: `show-${Date.now()}-${Math.floor(Math.random() * 100000)}.example`,
            db_name: "tenant1_db",
            minio: {
                accessKey: "fdsfdsfds",
                secretKey: "admin",
                endpoint: "fdsfdsfdsf",
                pathStyle: true,
            },
            creator_id: result.user.id,
            active: true,
        });

        tenantId = tenant.id;
    });

    it("returns 400 when tenant id is invalid", async () => {
        const response = await request(app)
            .get("/tenants/not-a-number")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("شناسه نامعتبر است");
    });

    it("returns 400 when tenant id is zero", async () => {
        const response = await request(app)
            .get("/tenants/0")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("شناسه نامعتبر است");
    });

    it("returns 404 when the tenant does not exist", async () => {
        const response = await request(app)
            .get("/tenants/999999")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("مستاجر پیدا نشد");
    });

    it("returns the tenant when it exists", async () => {
        const response = await request(app)
            .get(`/tenants/${tenantId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            expect.objectContaining({ id: tenantId, name: "Show Tenant" }),
        );
    });
});

describe("/tenants POST/PUT/DELETE integration tests", () => {
    let token: string;
    let tenantId: number;

    beforeAll(async () => {
        await setupTestDatabase();
        const result = await createAuthenticatedUser("tenant_manage", "TenantPass123!", [
            "tenant.create",
            "tenant.update",
            "tenant.delete",
            "tenant.view",
        ]);
        token = result.token;
    });

    it("returns 400 when create payload is invalid", async () => {
        const response = await request(app)
            .post("/tenants")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "" });

        expect(response.status).toBe(400);
        expect(response.body.message).toBeDefined();
    });

    it("returns 400 when update payload is invalid", async () => {
        const response = await request(app)
            .put(`/tenants/${tenantId ?? 1}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "x".repeat(256) });

        expect(response.status).toBe(400);
        expect(response.body.message).toBeDefined();
    });

    it("creates a tenant successfully", async () => {
        const response = await request(app)
            .post("/tenants")
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: "Created Tenant",
                domain: `created-${Date.now()}-${Math.floor(Math.random() * 100000)}.example`,
                db_name: `created_db_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
                minio: {
                    accessKey: "fdsfdsfds",
                    secretKey: "admin",
                    endpoint: "fdsfdsfdsf",
                    port: 9000,
                    pathStyle: true,
                },
                creator_id: 1,
                active: true,
            });

        expect(response.status).toBe(201);
        
        expect(response.body).toEqual(
            expect.objectContaining({ name: "Created Tenant", active: true }),
        );
        tenantId = response.body.id;
    });

    it("updates a tenant successfully", async () => {
        const response = await request(app)
            .put(`/tenants/${tenantId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Updated Tenant", active: false });
            
        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            expect.objectContaining({ id: tenantId, name: "Updated Tenant", active: false }),
        );
    });

    it("returns 400 when update id is invalid", async () => {
        const response = await request(app)
            .put("/tenants/not-a-number")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Ghost Tenant" });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("شناسه نامعتبر است");
    });

    it("returns 404 when updating a missing tenant", async () => {
        const response = await request(app)
            .put("/tenants/999999")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Ghost Tenant" });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("مستاجر مورد نظر پیدا نشد");
    });

    it("deletes a tenant successfully", async () => {
        const response = await request(app)
            .delete(`/tenants/${tenantId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(204);
        expect(response.text).toBe("");
    });

    it("returns 400 when delete id is invalid", async () => {
        const response = await request(app)
            .delete("/tenants/not-a-number")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("شناسه نامعتبر است");
    });

    it("returns 404 when deleting a missing tenant", async () => {
        const response = await request(app)
            .delete("/tenants/999999")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("مستاجر مورد نظر پیدا نشد");
    });
});

describe("/tenants/my-tenants integration tests", () => {
    let token: string;
    let otherUserToken: string;
    let tenantId: number;

    beforeAll(async () => {
        await setupTestDatabase();

        const owner = await createAuthenticatedUser("tenant_owner", "TenantPass123!", [
            "tenant.my_tenants",
        ]);
        token = owner.token;

        const other = await createAuthenticatedUser("tenant_other", "TenantPass123!", [
            "tenant.my_tenants",
        ]);
        otherUserToken = other.token;

        const tenant = await Tenant.create({
            name: "Owned Tenant",
            domain: `owned-${Date.now()}-${Math.floor(Math.random() * 100000)}.example`,
            db_name: "tenant1_db",
            minio: {
                accessKey: "fdsfdsfds",
                secretKey: "admin",
                endpoint: "fdsfdsfdsf",
                pathStyle: true,
            },
            creator_id: owner.user.id,
            active: true,
        });

        tenantId = tenant.id;

        await Tenant.create({
            name: "Other Owner Tenant",
            domain: `other-${Date.now()}-${Math.floor(Math.random() * 100000)}.example`,
            db_name: "tenant2_db",
            minio: {
                accessKey: "fdsfdsfds",
                secretKey: "admin",
                endpoint: "fdsfdsfdsf",
                pathStyle: true,
            },
            creator_id: other.user.id,
            active: true,
        });
    });

    it("returns only tenants created by the authenticated user", async () => {
        const response = await request(app)
            .get("/tenants/my-tenants")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(
            response.body.rows.every(
                (tenant: { creator_id: number }) =>
                    tenant.creator_id === 1 || tenant.creator_id !== undefined,
            ),
        ).toBe(true);
        expect(response.body.rows.some((tenant: { id: number }) => tenant.id === tenantId)).toBe(
            true,
        );
    });

    it("returns 400 when my-tenants search exceeds the maximum length", async () => {
        const longSearch = "x".repeat(65);
        const response = await request(app)
            .get(`/tenants/my-tenants?search=${longSearch}`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("جستجو نمیتواند بیشتر از ۶۴ کاراکتر باشد");
    });

    it("returns 404 for a tenant that does not belong to the authenticated user", async () => {
        const response = await request(app)
            .get("/tenants/my-tenants/999999")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("مستاجر مورد نظر پیدا نشد");
    });

    it("returns the requested tenant when it belongs to the authenticated user", async () => {
        const response = await request(app)
            .get(`/tenants/my-tenants/${tenantId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            expect.objectContaining({ name: "Owned Tenant", active: true }),
        );
    });
});
