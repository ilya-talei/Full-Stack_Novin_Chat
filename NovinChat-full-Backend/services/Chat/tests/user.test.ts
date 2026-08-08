import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("file-type", () => ({
    fileTypeFromBuffer: vi.fn(),
}));

vi.mock("sharp", () => ({
    default: vi.fn(() => ({
        autoOrient: vi.fn().mockReturnThis(),
        resize: vi.fn().mockReturnThis(),
        webp: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from("processed")),
    })),
}));

import { fileTypeFromBuffer } from "file-type";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import UserService from "../src/services/userService.js";
import { AppError } from "../src/middlewares/errorMiddleware.js";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import userRoutes from "../src/routes/userRoutes.js";
import ChatService from "../src/services/chatService.js";
import authMiddleware from "../src/middlewares/authMiddleware.js";
import ErrorMiddleware from "../src/middlewares/errorMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const chatServiceRoot = path.resolve(__dirname, "..");

describe("UserService", () => {
    let container: StartedPostgreSqlContainer;
    let prisma: PrismaClient;
    let userService: UserService;

    beforeAll(async () => {
        container = await new PostgreSqlContainer("postgres:16-alpine")
            .withUsername("test")
            .withPassword("test")
            .start();

        const dbUrl = container.getConnectionUri();

        execSync("npx prisma db push --accept-data-loss", {
            env: { ...process.env, DATABASE_URL: dbUrl },
            cwd: chatServiceRoot,
            stdio: "pipe",
        });

        const adapter = new PrismaPg({ connectionString: dbUrl });
        prisma = new PrismaClient({ adapter });
        await prisma.$connect();

        userService = new UserService(prisma);
    }, 60000);

    afterAll(async () => {
        await prisma.$disconnect();
        await container.stop();
    });

    async function createUser(loginId: string) {
        return prisma.user.create({
            data: { login_id: loginId, hashed_password: "hashed" },
        });
    }

    describe("getUserById", () => {
        it("returns a user by id", async () => {
            const user = await createUser("get_by_id");

            const result = await userService.getUserById(user.id);
            expect(result).not.toBeNull();
            expect(result!.login_id).toBe("get_by_id");
        });

        it("returns null for non-existent user", async () => {
            const result = await userService.getUserById(99999);
            expect(result).toBeNull();
        });

        it("returns null for soft-deleted user", async () => {
            const user = await createUser("get_del");
            await prisma.user.update({
                where: { id: user.id },
                data: { deleted_at: new Date() },
            });

            const result = await userService.getUserById(user.id);
            expect(result).toBeNull();
        });
    });

    describe("updateUserById", () => {
        it("updates user fields", async () => {
            const user = await createUser("upd_user");

            const result = await userService.updateUserById(user.id, {
                login_id: "updated_login",
            });
            expect(result.login_id).toBe("updated_login");
        });
    });

    describe("createUserAvatar", () => {
        it("creates an avatar record for a user", async () => {
            const user = await createUser("avatar_cr");

            await userService.createUserAvatar(user.id, "test-avatar.webp");

            const avatar = await prisma.userAvatar.findFirst({
                where: { user_id: user.id },
            });
            expect(avatar).not.toBeNull();
            expect(avatar!.avatar_file_name).toBe("test-avatar.webp");
        });
    });

    describe("uploadAvatar", () => {
        it("throws error when services.MinIOService is not configured", async () => {
            const user = await createUser("upload_no_svc");
            const file = { buffer: Buffer.from("test") } as Express.Multer.File;

            await expect(
                userService.uploadAvatar(file, user.id, user.id),
            ).rejects.toThrow();
        });

        it("processes image and uploads avatar successfully", async () => {
            const user = await createUser("upload_usr");
            userService.services = {
                MinIOService: {
                    uploadUserAvatar: vi.fn().mockResolvedValue("user-avatar.webp"),
                },
            } as any;

            const file = { buffer: Buffer.from("test-image") } as Express.Multer.File;

            await userService.uploadAvatar(file, user.id, user.id);

            const avatar = await prisma.userAvatar.findFirst({
                where: { user_id: user.id },
            });
            expect(avatar).not.toBeNull();
            expect(avatar!.avatar_file_name).toBe("user-avatar.webp");

            userService.services = undefined as any;
        });
    });
});

describe("User API Integration", () => {
    let container: StartedPostgreSqlContainer;
    let prisma: PrismaClient;
    let app: express.Application;
    let chatService: ChatService;

    beforeAll(async () => {
        container = await new PostgreSqlContainer("postgres:16-alpine")
            .withUsername("test")
            .withPassword("test")
            .start();

        const dbUrl = container.getConnectionUri();

        execSync("npx prisma db push --accept-data-loss", {
            env: { ...process.env, DATABASE_URL: dbUrl },
            cwd: chatServiceRoot,
            stdio: "pipe",
        });

        const adapter = new PrismaPg({ connectionString: dbUrl });
        prisma = new PrismaClient({ adapter });
        await prisma.$connect();

        chatService = new ChatService(prisma);

        app = express();
        app.use(express.json());
        app.use(cookieParser());

        app.use((req, _res, next) => {
            req.tenant = {
                data: { id: 1, domain: "test.localhost", active: true, name: "Test", db_name: "test", created_at: new Date() },
                services: { ChatService: chatService },
            } as any;
            req.log = { info: () => {}, error: () => {}, warn: () => {}, debug: () => {}, trace: () => {}, fatal: () => {} } as any;
            next();
        });

        app.use(authMiddleware);
        app.use("/users", userRoutes);
        app.use(ErrorMiddleware);
    }, 120000);

    afterAll(async () => {
        await prisma.$disconnect();
        await container.stop();
    });

    let seq = 0;
    async function uniqueUser() {
        seq++;
        const loginId = `api_usr_${Date.now()}_${seq}`;
        const user = await prisma.user.create({
            data: { login_id: loginId, hashed_password: "hashed" },
        });
        return { user, token: jwt.sign(
            { sessionId: 1, userId: user.id, permissions: {}, tenant_id: 1 },
            process.env.JWT_EC_PRIVATE_KEY_TEST!,
            { algorithm: "ES256" },
        ) };
    }

    describe("PUT /users/:chatId/avatar", () => {
        it("returns 401 without auth token", async () => {
            const res = await request(app)
                .put("/users/1/avatar")
                .attach("avatar", Buffer.from("test"), "test.png");
            expect(res.status).toBe(401);
        });

        it("returns 400 when no file is uploaded", async () => {
            const { user, token } = await uniqueUser();
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Usr Avatar", owner_id: user.id },
            });

            const res = await request(app)
                .put(`/users/${chat.id}/avatar`)
                .set("Cookie", `token=${token}`);
            expect(res.status).toBe(400);
            expect(res.body.message).toBe("ارسال تصویر الزامی است");
        });

        it("returns 400 when file type is not PNG or JPEG", async () => {
            const { user, token } = await uniqueUser();
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Usr Bad Type", owner_id: user.id },
            });

            const res = await request(app)
                .put(`/users/${chat.id}/avatar`)
                .set("Cookie", `token=${token}`)
                .attach("avatar", Buffer.from("plain text"), "test.txt");
            expect(res.status).toBe(400);
            expect(res.body.message).toBe("فرمت های مجاز برای تصویر png و jpeg هستند");
        });

        it("returns 400 when chatId is invalid", async () => {
            const { token } = await uniqueUser();
            const res = await request(app)
                .put("/users/abc/avatar")
                .set("Cookie", `token=${token}`)
                .attach("avatar", Buffer.from("test"), "test.png");
            expect(res.status).toBe(400);
        });

        it("returns 204 on successful avatar upload", async () => {
            const { user, token } = await uniqueUser();
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Usr Success", owner_id: user.id },
            });

            fileTypeFromBuffer.mockResolvedValue({ ext: "png", mime: "image/png" });
            const uploadSpy = vi.spyOn(chatService, "uploadAvatar").mockResolvedValue(undefined);

            const res = await request(app)
                .put(`/users/${chat.id}/avatar`)
                .set("Cookie", `token=${token}`)
                .attach("avatar", Buffer.from("fake-png"), "test.png");
            expect(res.status).toBe(204);

            uploadSpy.mockRestore();
        });
    });
});
