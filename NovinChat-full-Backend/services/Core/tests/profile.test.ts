import bcrypt from "bcrypt";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import app from "../src/index.js";
import User from "../src/database/models/user.js";
import Session from "../src/database/models/session.js";
import { setupTestDatabase } from "./setup.js";

describe("/profile POST logout integration tests", () => {
    let testUser: User;
    let testToken: string;
    let testSessionId: number;

    beforeAll(async () => {
        await setupTestDatabase();
        const hashedPassword = await bcrypt.hash("TestPass123!", 10);

        testUser = await User.create({
            employee_id: 200,
            phone: "09120000001",
            login_id: "profile_test_user",
            hashed_password: hashedPassword,
        });
    });

    beforeEach(async () => {
        // Create a fresh login for each test
        const loginResponse = await request(app)
            .post("/auth/login")
            .send({ login_id: "profile_test_user", password: "TestPass123!" });

        testToken = loginResponse.body.token;

        // Decode token to get session ID for verification
        const tokenParts = testToken.split(".");
        if (tokenParts.length === 3) {
            const decoded = JSON.parse(Buffer.from(tokenParts[1], "base64").toString());
            testSessionId = decoded.sessionId;
        }
    });

    it("returns 401 when authorization header is missing", async () => {
        const response = await request(app).post("/profile/logout");

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Authentication Failed");
    });

    it("returns 401 when authorization token is invalid", async () => {
        const response = await request(app)
            .post("/profile/logout")
            .set("Authorization", "Bearer invalid-token");

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Authentication Failed");
    });

    it("returns 401 when authorization token format is invalid", async () => {
        const response = await request(app)
            .post("/profile/logout")
            .set("Authorization", "InvalidFormat " + testToken);

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Authentication Failed");
    });

    it("returns 401 when bearer token is missing", async () => {
        const response = await request(app).post("/profile/logout").set("Authorization", "Bearer ");

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Authentication Failed");
    });

    it("successfully logs out an authenticated user", async () => {
        const response = await request(app)
            .post("/profile/logout")
            .set("Authorization", `Bearer ${testToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({});
    });

    it("expires the session after logout", async () => {
        // Get session before logout
        const sessionBefore = await Session.findByPk(testSessionId);
        expect(sessionBefore).toBeDefined();
        expect(sessionBefore!.active).toBe(true);

        // Logout
        const response = await request(app)
            .post("/profile/logout")
            .set("Authorization", `Bearer ${testToken}`);

        expect(response.status).toBe(200);

        // Get session after logout
        const sessionAfter = await Session.findByPk(testSessionId);
        expect(sessionAfter).toBeDefined();
        // Verify expire_at is set to approximately now (within 2 seconds)
        const timeDifference = Math.abs(new Date().getTime() - sessionAfter!.expire_at.getTime());
        expect(timeDifference).toBeLessThan(2000);
    });

    it("handles logout for user with minimal permissions", async () => {
        const hashedPassword = await bcrypt.hash("MinPass123!", 10);
        const minimalUser = await User.create({
            employee_id: 201,
            phone: "09120000002",
            login_id: "minimal_user",
            hashed_password: hashedPassword,
        });

        const loginResponse = await request(app)
            .post("/auth/login")
            .send({ login_id: "minimal_user", password: "MinPass123!" });

        const token = loginResponse.body.token;

        const response = await request(app)
            .post("/profile/logout")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({});
    });

    it("handles logout for user with many permissions", async () => {
        const hashedPassword = await bcrypt.hash("AdminPass123!", 10);
        const adminUser = await User.create({
            employee_id: 202,
            phone: "09120000003",
            login_id: "admin_user",
            hashed_password: hashedPassword,
        });

        // Assign multiple permissions
        const permissions = [
            "user.create",
            "user.update",
            "user.delete",
            "user.view",
            "user_permission.assign",
            "user_permission.remove",
        ];

        for (const permission of permissions) {
            await adminUser.assignPermission(permission, true);
        }

        const loginResponse = await request(app)
            .post("/auth/login")
            .send({ login_id: "admin_user", password: "AdminPass123!" });

        const token = loginResponse.body.token;

        const response = await request(app)
            .post("/profile/logout")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({});
    });

    it("allows new login after logout", async () => {
        // Logout
        const logoutResponse = await request(app)
            .post("/profile/logout")
            .set("Authorization", `Bearer ${testToken}`);

        expect(logoutResponse.status).toBe(200);

        // Login again with the same user
        const newLoginResponse = await request(app)
            .post("/auth/login")
            .send({ login_id: "profile_test_user", password: "TestPass123!" });

        expect(newLoginResponse.status).toBe(200);
        expect(newLoginResponse.body).toHaveProperty("token");
        const newToken = newLoginResponse.body.token;

        // Verify new token works
        const verifyResponse = await request(app)
            .post("/profile/logout")
            .set("Authorization", `Bearer ${newToken}`);

        expect(verifyResponse.status).toBe(200);
    });

    it("handles multiple logouts sequentially", async () => {
        // First logout
        const firstLogout = await request(app)
            .post("/profile/logout")
            .set("Authorization", `Bearer ${testToken}`);

        expect(firstLogout.status).toBe(200);

        // Login again
        const secondLogin = await request(app)
            .post("/auth/login")
            .send({ login_id: "profile_test_user", password: "TestPass123!" });

        const newToken = secondLogin.body.token;

        // Second logout
        const secondLogout = await request(app)
            .post("/profile/logout")
            .set("Authorization", `Bearer ${newToken}`);

        expect(secondLogout.status).toBe(200);

        // Verify old token is still invalid
        const oldTokenTest = await request(app)
            .post("/profile/logout")
            .set("Authorization", `Bearer ${testToken}`);

        expect(oldTokenTest.status).toBe(401);

        // Verify new token is also invalid now
        const newTokenTest = await request(app)
            .post("/profile/logout")
            .set("Authorization", `Bearer ${newToken}`);

        expect(newTokenTest.status).toBe(401);
    });

    it("handles logout for inactive user correctly", async () => {
        const hashedPassword = await bcrypt.hash("InactivePass123!", 10);
        const inactiveUser = await User.create({
            employee_id: 203,
            phone: "09120000004",
            login_id: "inactive_user",
            hashed_password: hashedPassword,
            active: false,
        });

        // Even with inactive flag, login should fail before logout is attempted
        const loginResponse = await request(app)
            .post("/auth/login")
            .send({ login_id: "inactive_user", password: "InactivePass123!" });

        // Login should fail for inactive user
        expect(loginResponse.status).toBe(401);
    });

    it("handles concurrent logout requests", async () => {
        // Make two concurrent logout requests
        const promises = [
            request(app).post("/profile/logout").set("Authorization", `Bearer ${testToken}`),
            request(app).post("/profile/logout").set("Authorization", `Bearer ${testToken}`),
        ];

        const responses = await Promise.all(promises);

        // First request should succeed
        expect([200, 401]).toContain(responses[0].status);
        // Second request should fail (session already expired) or succeed depending on race condition
        expect([200, 401]).toContain(responses[1].status);
    });

    it("preserves other session data before logout", async () => {
        const sessionBefore = await Session.findByPk(testSessionId);

        expect(sessionBefore).toBeDefined();
        const userIdBefore = sessionBefore!.user_id;
        const ipAddressBefore = sessionBefore!.ip_address;
        const userAgentBefore = sessionBefore!.user_agent;
        const createdAtBefore = sessionBefore!.created_at;

        // Logout
        const response = await request(app)
            .post("/profile/logout")
            .set("Authorization", `Bearer ${testToken}`);

        expect(response.status).toBe(200);

        // Verify other session data is preserved
        const sessionAfter = await Session.findByPk(testSessionId);

        expect(sessionAfter).toBeDefined();
        expect(sessionAfter!.user_id).toBe(userIdBefore);
        expect(sessionAfter!.ip_address).toBe(ipAddressBefore);
        expect(sessionAfter!.user_agent).toBe(userAgentBefore);
        expect(sessionAfter!.created_at).toEqual(createdAtBefore);
    });

    it("returns 200 status code with empty response body on successful logout", async () => {
        const response = await request(app)
            .post("/profile/logout")
            .set("Authorization", `Bearer ${testToken}`);

        expect(response.status).toBe(200);
        expect(Object.keys(response.body).length).toBe(0);
    });

    it("handles logout with extra headers", async () => {
        const response = await request(app)
            .post("/profile/logout")
            .set("Authorization", `Bearer ${testToken}`)
            .set("X-Custom-Header", "custom-value")
            .set("Accept", "application/json");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({});
    });

    it("does not create new sessions after logout", async () => {
        const sessionCountBefore = await Session.count({ where: { user_id: testUser.id } });

        // Logout
        await request(app).post("/profile/logout").set("Authorization", `Bearer ${testToken}`);

        const sessionCountAfter = await Session.count({ where: { user_id: testUser.id } });

        // Session count should not increase, just the existing one should be updated
        expect(sessionCountAfter).toBe(sessionCountBefore);
    });

    it("handles logout for user with specific permissions assigned and revoked", async () => {
        const hashedPassword = await bcrypt.hash("PermsPass123!", 10);
        const permsUser = await User.create({
            employee_id: 204,
            phone: "09120000005",
            login_id: "perms_user",
            hashed_password: hashedPassword,
        });

        // Assign then revoke permissions
        await permsUser.assignPermission("user.create", true);
        await permsUser.assignPermission("user.delete", false);

        const loginResponse = await request(app)
            .post("/auth/login")
            .send({ login_id: "perms_user", password: "PermsPass123!" });

        const token = loginResponse.body.token;

        const response = await request(app)
            .post("/profile/logout")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
    });
});
