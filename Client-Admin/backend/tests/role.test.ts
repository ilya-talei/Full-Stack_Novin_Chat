import bcrypt from "bcrypt";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import session from "supertest-session";
import jwt from "jsonwebtoken";
import app from "../src/index.js";
import { setupTestDatabase } from "./setup.js";
import { Tenant } from "../src/middlewares/tenantMiddleware.js";
import managerService from "../src/modules/Manager/service.js";

describe("Roles integration tests", () => {
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

        // create a user to attach the session to
        const user = await tenant1.models.User.create({
            login_id: "roletester",
            hashed_password: await bcrypt.hash("password123", 10),
            phone: "09038850000",
        });

        // create an active session for that user
        const sessionRecord = await tenant1.models.Session.create({
            user_id: user.id,
            expire_at: new Date(Date.now() + 1000 * 60 * 60),
            ip_address: "127.0.0.1",
            user_agent: "vitest",
            active: true,
        });

        // sign a token that includes permissions required by the role endpoints
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
                },
            },
            process.env.JWT_EC_PRIVATE_KEY!,
            { algorithm: "ES256", expiresIn: Number(process.env.SESSION_LIFETIME || 60 * 60 * 5) },
        );

        // attach token to a helper session so tests can reuse cookie header
        const sess = session(app);
        // set cookie by hitting a protected endpoint with the cookie header set manually when needed
        // store the cookie string on tenant for reuse in tests
        (tenant1 as any).testAuthCookie = `token=${token}`;
    });

    afterAll(() => {
        vi.restoreAllMocks();
    });

    it("should create a role", async () => {
        const res = await request(app)
            .post("/roles")
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie)
            .send({ name: "Admin", description: "System administrator" });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("id");
        expect(res.body).toHaveProperty("name", "admin");
        expect(res.body).toHaveProperty("description", "System administrator");
    });

    it("should not allow creating duplicate roles", async () => {
        const res = await request(app)
            .post("/roles")
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie)
            .send({ name: "Admin" });

        expect(res.status).toBe(409);
        expect(res.body).toHaveProperty("message");
    });

    it("should list roles (pagination)", async () => {
        const res = await request(app)
            .get("/roles?page=1&limit=10")
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("data");
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it("should return 400 for invalid page query", async () => {
        const res = await request(app)
            .get("/roles?page=0&limit=10")
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "صفحه نامعتبر است");
    });

    it("should return 400 for invalid limit query", async () => {
        const res = await request(app)
            .get("/roles?page=1&limit=0")
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "محدودیت نامعتبر است");
    });

    it("should return a role by id", async () => {
        // get list to obtain an id
        const listRes = await request(app)
            .get("/roles?page=1&limit=10")
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie);

        const roleId = listRes.body.data[0].id;

        const res = await request(app)
            .get(`/roles/${roleId}`)
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("id", roleId);
    });

    it("should update a role", async () => {
        const listRes = await request(app)
            .get("/roles?page=1&limit=10")
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie);

        const roleId = listRes.body.data[0].id;

        const res = await request(app)
            .put(`/roles/${roleId}`)
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie)
            .send({ name: "Manager", description: "Updated" });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("name", "manager");
        expect(res.body).toHaveProperty("description", "Updated");
    });

    it("should delete a role", async () => {
        // create a role to delete
        const createRes = await request(app)
            .post("/roles")
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie)
            .send({ name: "tempRole" });

        expect(createRes.status).toBe(201);
        const roleId = createRes.body.id;

        const delRes = await request(app)
            .delete(`/roles/${roleId}`)
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie);

        expect(delRes.status).toBe(204);

        // ensure it's gone
        const getRes = await request(app)
            .get(`/roles/${roleId}`)
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie);

        expect(getRes.status).toBe(404);
    });

    it("should validate role creation input", async () => {
        const res = await request(app)
            .post("/roles")
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie)
            .send({ name: "" });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message");
    });

    it("should return 400 for invalid show id", async () => {
        const res = await request(app)
            .get(`/roles/0`)
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "شناسه نامعتبر است");
    });

    it("should return 400 for invalid update id", async () => {
        const res = await request(app)
            .put(`/roles/0`)
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie)
            .send({ name: "x" });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "شناسه نامعتبر است");
    });

    it("should return 400 for invalid delete id", async () => {
        const res = await request(app)
            .delete(`/roles/0`)
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message", "شناسه نامعتبر است");
    });

    it("should validate role update input", async () => {
        const listRes = await request(app)
            .get("/roles?page=1&limit=10")
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie);

        const roleId = listRes.body.data[0].id;

        const res = await request(app)
            .put(`/roles/${roleId}`)
            .set("host", "localhost")
            .set("Cookie", (tenant1 as any).testAuthCookie)
            .send({ name: "" });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("message");
    });
});
