import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../src/index.js";
import User from "../src/database/models/user.js";
import Session from "../src/database/models/session.js";
import { setupTestDatabase } from "./setup.js";

describe("/users GET integration tests", () => {
    let authToken: string;
    let inactiveSessionToken: string;
    let expiredSessionToken: string;

    beforeAll(async () => {
        await setupTestDatabase();

        const hashedPassword = await bcrypt.hash("Password123!", 10);

        const apiUser = await User.create({
            login_id: "apiuser",
            phone: "09110000000",
            employee_id: 100,
            hashed_password: hashedPassword,
        });

        await apiUser.assignPermission("user.view", true);

        await User.create({
            login_id: "searchuser",
            phone: "09119999999",
            employee_id: 200,
            hashed_password: hashedPassword,
        });

        await User.create({
            login_id: "inactiveuser",
            phone: "09118888888",
            employee_id: 300,
            hashed_password: hashedPassword,
            active: false,
        });

        const loginResponse = await request(app)
            .post("/auth/login")
            .send({ login_id: "apiuser", password: "Password123!" });

        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body).toHaveProperty("token");
        authToken = loginResponse.body.token;

        const inactiveSession = await Session.create({
            user_id: apiUser.id,
            ip_address: "127.0.0.1",
            user_agent: "vitest",
            active: false,
            expire_at: new Date(Date.now() + 60 * 60 * 1000),
        });

        inactiveSessionToken = jwt.sign(
            { sessionId: inactiveSession.id },
            process.env.JWT_EC_PRIVATE_KEY!,
            { algorithm: "ES256", expiresIn: Number(process.env.SESSION_LIFETIME || 60 * 60 * 5) },
        );

        const expiredSession = await Session.create({
            user_id: apiUser.id,
            ip_address: "127.0.0.1",
            user_agent: "vitest",
            active: true,
            expire_at: new Date(Date.now() - 1000),
        });

        expiredSessionToken = jwt.sign(
            { sessionId: expiredSession.id },
            process.env.JWT_EC_PRIVATE_KEY!,
            { algorithm: "ES256", expiresIn: Number(process.env.SESSION_LIFETIME || 60 * 60 * 5) },
        );
    });

    it("should user has permission", async () => {
        const apiUser = await User.findOne({ where: { login_id: "apiuser" } });
        expect(apiUser).not.toBeNull();
        expect(await apiUser!.hasPermission("user.view")).toBe(true);
    });

    it("returns 401 when authorization header is missing", async () => {
        const response = await request(app).get("/users");

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Authentication Failed" });
    });

    it("returns 401 when authorization token is invalid", async () => {
        const response = await request(app)
            .get("/users")
            .set("Authorization", "Bearer invalid-token");

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Authentication Failed" });
    });

    it("returns 401 when session is inactive", async () => {
        const response = await request(app)
            .get("/users")
            .set("Authorization", `Bearer ${inactiveSessionToken}`);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Authentication Failed" });
    });

    it("returns 401 when session is expired", async () => {
        const response = await request(app)
            .get("/users")
            .set("Authorization", `Bearer ${expiredSessionToken}`);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Authentication Failed" });
    });

    it("returns 400 when page is not a positive integer", async () => {
        const response = await request(app)
            .get("/users?page=0")
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("صفحه نامعتبر است");
    });

    it("returns 400 when limit is not a positive integer", async () => {
        const response = await request(app)
            .get("/users?limit=0")
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("محدودیت نامعتبر است");
    });

    it("returns 400 when limit is greater than 50", async () => {
        const response = await request(app)
            .get("/users?limit=51")
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "محدودیت نامعتبر است",
        );
    });

    it("returns 400 when search is longer than 64 characters", async () => {
        const longSearch = "x".repeat(65);
        const response = await request(app)
            .get(`/users?search=${longSearch}`)
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("جستجو نمیتواند بیشتر از ۶۴ کاراکتر باشد");
    });

    it("returns a paginated user list by default", async () => {
        const response = await request(app)
            .get("/users")
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            expect.objectContaining({ count: 3, rows: expect.any(Array) }),
        );
        expect(response.body.rows.length).toBe(3);
        expect(response.body.rows[0]).not.toHaveProperty("hashed_password");
    });

    it("returns search results when search is numeric and matches employee_id", async () => {
        const response = await request(app)
            .get("/users?search=100")
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.count).toBe(1);
        expect(response.body.rows[0]).toMatchObject({ login_id: "apiuser", employee_id: 100 });
    });
});

describe("/users/:id DELETE integration tests", () => {
    let authToken: string;
    let targetUserId: number;

    beforeAll(async () => {
        await setupTestDatabase();

        const hashedPassword = await bcrypt.hash("Password123!", 10);

        const deleteApiUser: User = await User.create({
            login_id: "deleteapiuser",
            phone: "09140000000",
            employee_id: 1000,
            hashed_password: hashedPassword,
        });

        await deleteApiUser.assignPermission("user.delete", true);
        await deleteApiUser.assignPermission("user.view", true);

        const target = await User.create({
            login_id: "todeleteuser",
            phone: "09141111111",
            employee_id: 1001,
            hashed_password: hashedPassword,
        });
        targetUserId = target.id;

        const loginResponse = await request(app)
            .post("/auth/login")
            .send({ login_id: "deleteapiuser", password: "Password123!" });

        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body).toHaveProperty("token");
        authToken = loginResponse.body.token;
    });

    it("returns 401 when authorization header is missing", async () => {
        const response = await request(app).delete(`/users/${targetUserId}`);
        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Authentication Failed" });
    });

    it("returns 401 when authorization token is invalid", async () => {
        const response = await request(app)
            .delete(`/users/${targetUserId}`)
            .set("Authorization", "Bearer invalid-token");

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Authentication Failed" });
    });

    it("returns 400 when id is not a number", async () => {
        const response = await request(app)
            .delete("/users/abc")
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("شناسه نامعتبر است");
    });

    it("returns 400 when id is zero", async () => {
        const response = await request(app)
            .delete("/users/0")
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("شناسه نامعتبر است");
    });

    it("returns 400 when id is negative", async () => {
        const response = await request(app)
            .delete("/users/-1")
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("شناسه نامعتبر است");
    });

    it("returns 400 when id contains special characters", async () => {
        const response = await request(app)
            .delete("/users/1;DROP TABLE users")
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("شناسه نامعتبر است");
    });

    it("returns 400 when id is a float-like string", async () => {
        const response = await request(app)
            .delete("/users/1.5")
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("شناسه نامعتبر است");
    });

    it("returns 404 when user does not exist", async () => {
        const nonExistentId = 9999999;
        const response = await request(app)
            .delete(`/users/${nonExistentId}`)
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("User not found");
    });

    it("deletes user successfully and returns 204", async () => {
        const response = await request(app)
            .delete(`/users/${targetUserId}`)
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(204);
    });

    it("returns 404 when deleting an already deleted user", async () => {
        const response = await request(app)
            .delete(`/users/${targetUserId}`)
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("User not found");
    });

    it("GET after delete returns 404", async () => {
        const response = await request(app)
            .get(`/users/${targetUserId}`)
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("کاربر پیدا نشد");
    });
});

describe("/users POST integration tests", () => {
    let authToken: string;

    beforeAll(async () => {
        await setupTestDatabase();
        const hashedPassword = await bcrypt.hash("Password123!", 10);

        const postApiUser: User = await User.create({
            login_id: "postapiuser",
            phone: "09112223333",
            employee_id: 400,
            hashed_password: hashedPassword,
        });

        await postApiUser.assignPermission("user.create", true);

        const loginResponse = await request(app)
            .post("/auth/login")
            .send({ login_id: "postapiuser", password: "Password123!" });

        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body).toHaveProperty("token");
        authToken = loginResponse.body.token;
    });

    it("creates a user with valid payload", async () => {
        const payload = {
            login_id: "newuser_post",
            phone: "09113334444",
            employee_id: 500,
            password: "Secret123!",
        };

        const response = await request(app)
            .post("/users")
            .set("Authorization", `Bearer ${authToken}`)
            .send(payload);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty("id");
        expect(response.body).toHaveProperty("login_id", "newuser_post");
        expect(response.body).not.toHaveProperty("hashed_password");
    });

    it("returns 400 when login_id is missing", async () => {
        const payload = { phone: "09114445555", employee_id: 501, password: "Secret123!" };

        const response = await request(app)
            .post("/users")
            .set("Authorization", `Bearer ${authToken}`)
            .send(payload);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("message");
    });

    it("returns 400 when phone is longer than 15 characters", async () => {
        const payload = {
            login_id: "longphoneuser",
            phone: "0".repeat(16),
            employee_id: 502,
            password: "Secret123!",
        };

        const response = await request(app)
            .post("/users")
            .set("Authorization", `Bearer ${authToken}`)
            .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("شماره تلفن نمیتواند بیشتر از ۱۵ کاراکتر باشد");
    });

    it("returns 400 when employee_id is not positive", async () => {
        const payload = {
            login_id: "bademp",
            phone: "09115556666",
            employee_id: 0,
            password: "Secret123!",
        };

        const response = await request(app)
            .post("/users")
            .set("Authorization", `Bearer ${authToken}`)
            .send(payload);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("message");
    });

    it("returns 500 when login_id is duplicated", async () => {
        const payload1 = {
            login_id: "dupuser",
            phone: "09116667777",
            employee_id: 600,
            password: "Secret123!",
        };

        const res1 = await request(app)
            .post("/users")
            .set("Authorization", `Bearer ${authToken}`)
            .send(payload1);

        expect(res1.status).toBe(201);

        const payload2 = {
            login_id: "dupuser",
            phone: "09119998888",
            employee_id: 601,
            password: "Secret123!",
        };

        const res2 = await request(app)
            .post("/users")
            .set("Authorization", `Bearer ${authToken}`)
            .send(payload2);

        expect(res2.status).toBe(400);
        expect(res2.body.message).toBeDefined();
    });
});

describe("/users/:id GET integration tests", () => {
    let authToken: string;
    let activeUser: User;
    let userId: number;
    let inactiveUserId: number;

    beforeAll(async () => {
        await setupTestDatabase();
        const hashedPassword = await bcrypt.hash("Password123!", 10);

        activeUser = await User.create({
            login_id: "getapiuser",
            phone: "09121110000",
            employee_id: 700,
            hashed_password: hashedPassword,
        });
        userId = activeUser.id;
        await activeUser.assignPermission("user.view", true);

        const inactiveUser = await User.create({
            login_id: "getinactiveuser",
            phone: "09121112222",
            employee_id: 701,
            hashed_password: hashedPassword,
            active: false,
        });
        inactiveUserId = inactiveUser.id;

        const loginResponse = await request(app)
            .post("/auth/login")
            .send({ login_id: "getapiuser", password: "Password123!" });

        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body).toHaveProperty("token");
        authToken = loginResponse.body.token;
    });

    it("returns 401 when user active = false", async () => {
        activeUser.active = false;
        await activeUser.save();
        const response = await request(app)
            .get(`/users/${userId}`)
            .set("Authorization", `Bearer ${authToken}`);
        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Authentication Failed" });
        activeUser.active = true;
        await activeUser.save();
    });

    it("returns 401 when authorization header is missing", async () => {
        const response = await request(app).get(`/users/${userId}`);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Authentication Failed" });
    });

    it("returns 401 when authorization token is invalid", async () => {
        const response = await request(app)
            .get(`/users/${userId}`)
            .set("Authorization", "Bearer invalid-token");

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Authentication Failed" });
    });

    it("returns 400 when id is not a number", async () => {
        const response = await request(app)
            .get("/users/abc")
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("شناسه نامعتبر است");
    });

    it("returns 400 when id is zero", async () => {
        const response = await request(app)
            .get("/users/0")
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("شناسه نامعتبر است");
    });

    it("returns 400 when id is negative", async () => {
        const response = await request(app)
            .get("/users/-1")
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("شناسه نامعتبر است");
    });

    it("returns 404 when user does not exist", async () => {
        const nonExistentId = 999999;
        const response = await request(app)
            .get(`/users/${nonExistentId}`)
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("کاربر پیدا نشد");
    });

    it("returns 200 with user data when user exists", async () => {
        const response = await request(app)
            .get(`/users/${userId}`)
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            id: userId,
            login_id: "getapiuser",
            phone: "09121110000",
            employee_id: 700,
            active: true,
        });
        expect(response.body).not.toHaveProperty("hashed_password");
    });

    it("returns 200 with inactive user data when requested", async () => {
        const response = await request(app)
            .get(`/users/${inactiveUserId}`)
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            id: inactiveUserId,
            login_id: "getinactiveuser",
            active: false,
        });
        expect(response.body).not.toHaveProperty("hashed_password");
    });

    it("returns 400 when id contains special characters", async () => {
        const response = await request(app)
            .get("/users/1;DROP TABLE users")
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("شناسه نامعتبر است");
    });

    it("returns 400 when id is a float-like string", async () => {
        const response = await request(app)
            .get("/users/1.5")
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("شناسه نامعتبر است");
    });

    it("returns 200 when id is a valid large integer", async () => {
        const largeId = 2147483647;
        const response = await request(app)
            .get(`/users/${largeId}`)
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("کاربر پیدا نشد");
    });
});

describe("/users/:id PUT integration tests", () => {
    let authToken: string;
    let userId: number;
    let mainUser: User;
    let otherUserId: number;
    let ActiveUser: User;

    beforeAll(async () => {
        await setupTestDatabase();
        const hashedPassword = await bcrypt.hash("Password123!", 10);

        mainUser = await User.create({
            login_id: "putapiuser",
            phone: "09131110000",
            employee_id: 800,
            hashed_password: hashedPassword,
        });
        userId = mainUser.id;
        await mainUser.assignPermission("user.update", true);

        ActiveUser = await User.create({
            login_id: "active_user",
            phone: "09131110400",
            employee_id: 806,
            hashed_password: hashedPassword,
        });

        await User.create({
            login_id: "putotheruser",
            phone: "09131112222",
            employee_id: 801,
            hashed_password: hashedPassword,
        });
        otherUserId = (await User.findOne({ where: { login_id: "putotheruser" } }).then(
            (u) => u?.id,
        ))!;

        const loginResponse = await request(app)
            .post("/auth/login")
            .send({ login_id: "putapiuser", password: "Password123!" });

        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body).toHaveProperty("token");
        authToken = loginResponse.body.token;
    });

    it("returns 401 when authorization header is missing", async () => {
        const response = await request(app).put(`/users/${userId}`).send({ phone: "09999999999" });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Authentication Failed" });
    });

    it("returns 401 when authorization token is invalid", async () => {
        const response = await request(app)
            .put(`/users/${userId}`)
            .set("Authorization", "Bearer invalid-token")
            .send({ phone: "09999999999" });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Authentication Failed" });
    });

    it("returns 400 when id is not a number", async () => {
        const response = await request(app)
            .put("/users/abc")
            .set("Authorization", `Bearer ${authToken}`)
            .send({ phone: "09999999999" });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("شناسه نامعتبر است");
    });

    it("returns 400 when id is negative", async () => {
        const response = await request(app)
            .put("/users/-1")
            .set("Authorization", `Bearer ${authToken}`)
            .send({ phone: "09999999999" });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("شناسه نامعتبر است");
    });

    it("returns 404 when user does not exist", async () => {
        const response = await request(app)
            .put("/users/999999")
            .set("Authorization", `Bearer ${authToken}`)
            .send({ phone: "09999999999" });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("User not found");
    });

    it("updates phone successfully", async () => {
        const newPhone = "09132223333";
        const response = await request(app)
            .put(`/users/${userId}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ phone: newPhone });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("phone", newPhone);
        expect(response.body).not.toHaveProperty("hashed_password");
    });

    it("updates login_id successfully", async () => {
        const newLoginId = "putapiuser_updated";
        const response = await request(app)
            .put(`/users/${mainUser.id}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ login_id: newLoginId });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("login_id", newLoginId);
    });

    it("updates employee_id successfully", async () => {
        const newEmployeeId = 900;
        const response = await request(app)
            .put(`/users/${userId}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ employee_id: newEmployeeId });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("employee_id", newEmployeeId);
    });

    it("updates password successfully", async () => {
        const response = await request(app)
            .put(`/users/${userId}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ password: "NewSecret123!" });

        expect(response.status).toBe(200);
        expect(response.body).not.toHaveProperty("hashed_password");
    });

    it("updates active flag to false", async () => {
        const response = await request(app)
            .put(`/users/${ActiveUser.id}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ active: false });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("active", false);
    });

    it("updates active flag to true", async () => {
        const response = await request(app)
            .put(`/users/${userId}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ active: true });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("active", true);
    });

    it("updates multiple fields successfully", async () => {
        const payload = {
            phone: "09133334444",
            employee_id: 910,
            active: false,
        };

        await ActiveUser.update({ active: true });

        const response = await request(app)
            .put(`/users/${ActiveUser.id}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send(payload);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            phone: "09133334444",
            employee_id: 910,
            active: false,
        });
    });

    it("returns 400 when phone is longer than 15 characters", async () => {
        const response = await request(app)
            .put(`/users/${userId}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ phone: "0".repeat(16) });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("شماره تلفن نمیتواند بیشتر از ۱۵ کاراکتر باشد");
    });

    it("returns 400 when employee_id is zero", async () => {
        const response = await request(app)
            .put(`/users/${userId}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ employee_id: 0 });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("message");
    });

    it("returns 400 when employee_id is negative", async () => {
        const response = await request(app)
            .put(`/users/${userId}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ employee_id: -5 });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("message");
    });

    it("returns 400 when login_id is longer than 64 characters", async () => {
        const longLoginId = "a".repeat(65);
        const response = await request(app)
            .put(`/users/${userId}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ login_id: longLoginId });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("شناسه ورود نمیتواند بیشتر از ۶۴ کاراکتر باشد");
    });

    it("returns 400 when password is longer than 255 characters", async () => {
        const longPassword = "a".repeat(256);
        const response = await request(app)
            .put(`/users/${userId}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ password: longPassword });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("رمز عبور نمیتواند بیشتر از ۲۵۵ کاراکتر باشد");
    });

    it("returns 500 when updating to duplicate login_id", async () => {
        const response = await request(app)
            .put(`/users/${userId}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ login_id: "putotheruser" });

        expect(response.status).toBe(400);
        expect(response.body.message).toBeDefined();
    });

    it("works with empty body (no changes)", async () => {
        const response = await request(app)
            .put(`/users/${userId}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({});

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("id", userId);
    });
});

describe("/users/change-password integration tests", () => {
    let authToken: string;
    let userToChangePassword: User;

    beforeAll(async () => {
        await setupTestDatabase();
        const hashedPassword = await bcrypt.hash("Password123!", 10);

        userToChangePassword = await User.create({
            login_id: "changepassuser",
            phone: "09137778899",
            employee_id: 1002,
            hashed_password: hashedPassword,
        });

        await userToChangePassword.assignPermission("user.change_password", true);

        const loginResponse = await request(app)
            .post("/auth/login")
            .send({ login_id: "changepassuser", password: "Password123!" });

        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body).toHaveProperty("token");
        authToken = loginResponse.body.token;
    });

    it("returns 401 when authorization header is missing", async () => {
        const response = await request(app)
            .put("/users/change-password")
            .send({ current_password: "Password123!", new_password: "NewSecret123!" });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Authentication Failed" });
    });

    it("returns 401 when authorization token is invalid", async () => {
        const response = await request(app)
            .put("/users/change-password")
            .set("Authorization", "Bearer invalid-token")
            .send({ current_password: "Password123!", new_password: "NewSecret123!" });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Authentication Failed" });
    });

    it("returns 400 when current_password is missing", async () => {
        const response = await request(app)
            .put("/users/change-password")
            .set("Authorization", `Bearer ${authToken}`)
            .send({ new_password: "NewSecret123!" });

        expect(response.status).toBe(400);
    });

    it("returns 400 when new_password is too short", async () => {
        const response = await request(app)
            .put("/users/change-password")
            .set("Authorization", `Bearer ${authToken}`)
            .send({ current_password: "Password123!", new_password: "short" });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("رمز عبور جدید حداقل باید شامل ۸ کاراکتر باشد");
    });

    it("returns 400 when current password is incorrect", async () => {
        const response = await request(app)
            .put("/users/change-password")
            .set("Authorization", `Bearer ${authToken}`)
            .send({ current_password: "WrongPassword!", new_password: "NewSecret123!" });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("رمز عبور فعلی اشتباه است");
    });

    it("changes password successfully and allows login with new password", async () => {
        const response = await request(app)
            .put("/users/change-password")
            .set("Authorization", `Bearer ${authToken}`)
            .send({ current_password: "Password123!", new_password: "NewSecret123!" });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("رمز عبور با موفقیت تغییر یافت");

        const updatedUser = await User.findByPk(userToChangePassword.id);
        expect(updatedUser).not.toBeNull();
        expect(await bcrypt.compare("NewSecret123!", updatedUser!.hashed_password)).toBe(true);

        const loginResponse = await request(app)
            .post("/auth/login")
            .send({ login_id: "changepassuser", password: "NewSecret123!" });

        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body).toHaveProperty("token");
    });
});
