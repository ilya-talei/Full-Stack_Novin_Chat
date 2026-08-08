import bcrypt from "bcrypt";
import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import session from "supertest-session";
import app from "../src/index.js";
import { setupTestDatabase } from "./setup.js";
import { Tenant } from "../src/middlewares/tenantMiddleware.js";
import managerService from "../src/modules/Manager/service.js";
import jwt from "jsonwebtoken";
import type { jwtSession } from "../src/middlewares/authMiddleware.js";

describe("/auth/login POST route", () => {
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
            } else if (domain === "tenant2.com") {
                return {
                    id: 2,
                    name: "Tenant 2",
                    domain: "tenant2.com",
                    db_name: "tenant2_db",
                    active: true,
                    created_at: new Date(),
                };
            } else {
                throw new Error("Tenant not found");
            }
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

        // create inactive user for tenant1
        await tenant1.models.User.create({
            login_id: "inactiveuser",
            hashed_password: await bcrypt.hash("password123", 10),
            phone: "09038854589",
            active: false,
        });
    });

    it("should return 400 if login_id or password is missing", async () => {
        const response = await request(app)
            .post("/auth/login")
            .set("host", "localhost")
            .send({ login_id: "testuser" }); // Missing password

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("message");
    });

    it("should return 401 if login_id or password is incorrect", async () => {
        const response = await request(app)
            .post("/auth/login")
            .set("host", "localhost")
            .send({ login_id: "testuser", password: "wrongpassword" });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("message");
    });

    it("should return 401 when the password is wrong for an existing user", async () => {
        const response = await request(app)
            .post("/auth/login")
            .set("host", "localhost")
            .send({ login_id: "t1testuser", password: "wrongpassword" });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("message", "شناسه ورود و یا کلمه عبور اشتباه است");
    });

    it("should return 401 if user does not exist", async () => {
        const response = await request(app)
            .post("/auth/login")
            .set("host", "localhost")
            .send({ login_id: "nonexistentuser", password: "password123" });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("message", "شناسه ورود و یا کلمه عبور اشتباه است");
    });

    it("should not allow a user to access resources from another tenant", async () => {
        const response = await request(app)
            .post("/auth/login")
            .set("host", "tenant2.com")
            .send({ login_id: "t1testuser", password: "password123" });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("message", "شناسه ورود و یا کلمه عبور اشتباه است");
    });

    it("should return 200 and a token if login_id and password are correct", async () => {
        const response = await request(app)
            .post("/auth/login")
            .set("host", "localhost")
            .send({ login_id: "t1testuser", password: "password123" });

        expect(response.status).toBe(204);
        expect(response.headers["set-cookie"]).toBeDefined();
    });

    it("should return 401 when the session token belongs to a different tenant", async () => {
        // create session for tenant1 and login
        const sess1 = session(app);
        const loginRes = await sess1
            .post("/auth/login")
            .set("host", "localhost")
            .send({ login_id: "t1testuser", password: "password123" });

        expect(loginRes.status).toBe(204);
        expect(loginRes.headers["set-cookie"]).toBeDefined();

        // create a new session for tenant2 and attach tenant1's token
        const sess2 = session(app);
        // some apps accept Authorization header along with session; send token to tenant2 domain
        const res = await sess2
            .get("/profile/logout") // assuming this is a protected route
            .set("host", "tenant2.com");

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("message", "Authentication Failed");
    });

    it("should return 401 when the session token is invalid", async () => {
        const response = await request(app)
            .get("/profile/logout")
            .set("host", "localhost")
            .set("Cookie", "token=invalidtoken")
            .expect(401);
        expect(response.body).toHaveProperty("message", "Authentication Failed");
    });

    it("should return 401 when user account is inactive", async () => {
        const response = await request(app)
            .post("/auth/login")
            .set("host", "localhost")
            .send({ login_id: "inactiveuser", password: "password123" })
            .expect(401);
        expect(response.body).toHaveProperty("message", "شناسه ورود و یا کلمه عبور اشتباه است");
    });

    it("should return 401 when user account is deleted", async () => {
        // First, delete the user
        await tenant1.models.User.destroy({ where: { login_id: "t1testuser" } });

        const response = await request(app)
            .post("/auth/login")
            .set("host", "localhost")
            .send({ login_id: "t1testuser", password: "password123" })
            .expect(401);
        expect(response.body).toHaveProperty("message", "شناسه ورود و یا کلمه عبور اشتباه است");

        const user = await tenant1.models.User.findOne({
            where: { login_id: "t1testuser" },
            paranoid: false,
        });
        expect(user).not.toBeNull();
        expect(user!.deleted_at).not.toBeNull();
    });
});

describe("/auth/token GET route", () => {
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
            } else if (domain === "tenant2.com") {
                return {
                    id: 2,
                    name: "Tenant 2",
                    domain: "tenant2.com",
                    db_name: "tenant2_db",
                    active: true,
                    created_at: new Date(),
                };
            } else {
                throw new Error("Tenant not found");
            }
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

    it("should return 401 if session token is missing", async () => {
        const response = await request(app).post("/auth/token").set("host", "localhost");

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("message", "Token Is Missing");
    });

    it("should return 401 if session token is invalid", async () => {
        const response = await request(app)
            .post("/auth/token")
            .set("host", "localhost")
            .set("Cookie", "token=invalidtoken");

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("message", "Token Is Missing");
    });

    it("should return 200 and user info if session token is valid", async () => {
        const sess = session(app);
        const loginRes = await sess
            .post("/auth/login")
            .set("host", "localhost")
            .send({ login_id: "t1testuser", password: "password123" });

        expect(loginRes.status).toBe(204);
        expect(loginRes.headers["set-cookie"]).toBeDefined();

        const tokenRes = await sess.post("/auth/token").set("host", "localhost");

        expect(tokenRes.status).toBe(204);
    });

    it("should return 401 when secret token is invalid in token refresh", async () => {
        const response = await request(app)
            .post("/auth/token")
            .set("host", "localhost")
            .set("Cookie", "secret=invalidtoken")
            .expect(401);
        expect(response.body).toHaveProperty("message", "توکن معتبر نیست");
    });

    it("should return 401 when secret token for another tenant is used in token refresh", async () => {
        // create session for tenant1 and login
        const sess1 = session(app);
        const loginRes = await sess1
            .post("/auth/login")
            .set("host", "localhost")
            .send({ login_id: "t1testuser", password: "password123" });

        expect(loginRes.status).toBe(204);
        expect(loginRes.headers["set-cookie"]).toBeDefined();

        // create a new session for tenant2 and attach tenant1's secret token
        const sess2 = session(app);
        const res = await sess2
            .post("/auth/token")
            .set("host", "tenant2.com")
            .set("Cookie", loginRes.headers["set-cookie"][0]) // attach tenant1's secret token
            .expect(401);

        expect(res.body).toHaveProperty("message", "توکن معتبر نیست");
    });

    it("should return 401 when session is inactive in token refresh", async () => {
        // create session for tenant1 and login
        const sess1 = session(app);
        const loginRes = await sess1
            .post("/auth/login")
            .set("host", "localhost")
            .send({ login_id: "t1testuser", password: "password123" });

        expect(loginRes.status).toBe(204);
        expect(loginRes.headers["set-cookie"]).toBeDefined();

        // delete the session from the database to simulate an inactive session
        const secretToken = loginRes.headers["set-cookie"][0].split(";")[0].split("=")[1];
        const decoded = (await jwt.verify(secretToken, process.env.JWT_EC_PUBLIC_KEY!, {
            algorithms: ["ES256"],
        })) as jwtSession;
        const sessionId = decoded?.sessionId;
        if (sessionId) {
            await tenant1.models.Session.update({ active: false }, { where: { id: sessionId } });
        }

        // attempt to refresh the token with the now inactive session
        const sess2 = session(app);
        const res = await sess2
            .post("/auth/token")
            .set("host", "localhost")
            .set("Cookie", loginRes.headers["set-cookie"][0]) // attach tenant1's secret token
            .expect(401);

        expect(res.body).toHaveProperty("message", "نشست نامعتبر یا منقضی شده است");
    });

    it("should return 401 when user not found in token refresh", async () => {
        // create session for tenant1 and login
        const sess1 = session(app);
        const loginRes = await sess1
            .post("/auth/login")
            .set("host", "localhost")
            .send({ login_id: "t1testuser", password: "password123" });

        expect(loginRes.status).toBe(204);
        expect(loginRes.headers["set-cookie"]).toBeDefined();

        // soft-delete the user to simulate a deleted account
        const secretToken = loginRes.headers["set-cookie"][0].split(";")[0].split("=")[1];
        const decoded = (await jwt.verify(secretToken, process.env.JWT_EC_PUBLIC_KEY!, {
            algorithms: ["ES256"],
        })) as jwtSession;
        const userId = decoded?.userId;
        if (userId) {
            await tenant1.models.User.destroy({ where: { id: userId } });
        }

        // attempt to refresh the token with the now deleted user
        const sess2 = session(app);
        const res = await sess2
            .post("/auth/token")
            .set("host", "localhost")
            .set("Cookie", loginRes.headers["set-cookie"][0]) // attach tenant1's secret token
            .expect(401);

        expect(res.body).toHaveProperty("message", "کاربر یافت نشد");
    });
});
