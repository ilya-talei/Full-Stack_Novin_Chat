import bcrypt from "bcrypt";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import session from "supertest-session";
import app from "../src/index.js";
import { setupTestDatabase } from "./setup.js";
import { Tenant } from "../src/middlewares/tenantMiddleware.js";
import managerService from "../src/modules/Manager/service.js";

describe("Profile integration tests", () => {
    let tenant1: Tenant;
    let tenant2: Tenant;

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

            if (domain === "tenant2.com") {
                return {
                    id: 2,
                    name: "Tenant 2",
                    domain: "tenant2.com",
                    db_name: "tenant2_db",
                    active: true,
                    created_at: new Date(),
                };
            }

            throw new Error("Tenant not found");
        });

        tenant1 = await Tenant.get("localhost");
        tenant2 = await Tenant.get("tenant2.com");

        await setupTestDatabase(tenant1.sequelize);
        await setupTestDatabase(tenant2.sequelize);

        await tenant1.models.User.create({
            login_id: "t1testuser",
            hashed_password: await bcrypt.hash("password123", 10),
            phone: "09038854587",
        });

        await tenant2.models.User.create({
            login_id: "t2testuser",
            hashed_password: await bcrypt.hash("password123", 10),
            phone: "09038854588",
        });
    });

    afterAll(() => {
        vi.restoreAllMocks();
    });

    it("should logout an authenticated user and clear auth cookies", async () => {
        const sess = session(app);

        const loginRes = await sess
            .post("/auth/login")
            .set("host", "localhost")
            .send({ login_id: "t1testuser", password: "password123" });

        expect(loginRes.status).toBe(204);
        expect(loginRes.headers["set-cookie"]).toBeDefined();

        const logoutRes = await sess.post("/profile/logout").set("host", "localhost");

        expect(logoutRes.status).toBe(200);
        expect(logoutRes.body).toEqual({});
        expect(logoutRes.headers["set-cookie"]).toBeDefined();

        const clearCookies = logoutRes.headers["set-cookie"].join("; ");
        expect(clearCookies).toContain("token=");
        expect(clearCookies).toContain("secret=");
    });

    it("should return 401 when logout is called without a valid token", async () => {
        const response = await request(app).post("/profile/logout").set("host", "localhost");

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("message", "Authentication Failed");
    });

    it("should return 401 when logout is called with a token for another tenant", async () => {
        const sess = session(app);

        const loginRes = await sess
            .post("/auth/login")
            .set("host", "localhost")
            .send({ login_id: "t1testuser", password: "password123" });

        expect(loginRes.status).toBe(204);
        expect(loginRes.headers["set-cookie"]).toBeDefined();

        const tenant2LogoutRes = await request(app)
            .post("/profile/logout")
            .set("host", "tenant2.com")
            .set("Cookie", loginRes.headers["set-cookie"])
            .expect(401);

        expect(tenant2LogoutRes.body).toHaveProperty("message", "Authentication Failed");
    });
});
