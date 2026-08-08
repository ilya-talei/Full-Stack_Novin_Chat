import bcrypt from "bcrypt";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../src/index.js";
import User from "../src/database/models/user.js";
import { setupTestDatabase } from "./setup.js";

describe("/auth/login integration tests", () => {
    beforeAll(async () => {
        await setupTestDatabase();
        const hashedPassword = await bcrypt.hash("Password123!", 10);
        await User.create({
            employee_id: 1,
            phone: "09123456789",
            login_id: "testuser",
            hashed_password: hashedPassword,
        });
    });

    it("returns a token when credentials are valid", async () => {
        const response = await request(app)
            .post("/auth/login")
            .send({ login_id: "testuser", password: "Password123!" });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("token");
        expect(typeof response.body.token).toBe("string");
        expect(response.body.token.length).toBeGreaterThan(0);
        expect(response.body).not.toHaveProperty("hashed_password");
        expect(response.body).not.toHaveProperty("password");
    });

    it("returns 400 when validation fails", async () => {
        const response = await request(app)
            .post("/auth/login")
            .send({ login_id: "t", password: "pass" });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(expect.objectContaining({ message: expect.any(String) }));
    });

    it("returns 401 when the username is incorrect", async () => {
        const response = await request(app)
            .post("/auth/login")
            .send({ login_id: "amirh", password: "WrongPass123" });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("شناسه ورود و یا کلمه عبور اشتباه است");
    });

    it("returns 401 when the password is incorrect", async () => {
        const response = await request(app)
            .post("/auth/login")
            .send({ login_id: "testuser", password: "WrongPass123" });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("شناسه ورود و یا کلمه عبور اشتباه است");
    });
});
