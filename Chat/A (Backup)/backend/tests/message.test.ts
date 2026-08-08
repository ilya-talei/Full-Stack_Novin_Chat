import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("sharp", () => ({
    default: vi.fn(() => ({
        autoOrient: vi.fn().mockReturnThis(),
        resize: vi.fn().mockReturnThis(),
        webp: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from("processed")),
    })),
}));

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import MessageService from "../src/services/messageService.js";
import { AppError } from "../src/middlewares/errorMiddleware.js";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import messageRoutes from "../src/routes/messageRoutes.js";
import authMiddleware from "../src/middlewares/authMiddleware.js";
import ErrorMiddleware from "../src/middlewares/errorMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const chatServiceRoot = path.resolve(__dirname, "..");

describe("MessageService", () => {
    let container: StartedPostgreSqlContainer;
    let prisma: PrismaClient;
    let messageService: MessageService;

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

        messageService = new MessageService(prisma);
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

    async function addMember(chatId: number, userId: number) {
        return prisma.chatMember.create({
            data: { chat_id: chatId, user_id: userId },
        });
    }

    async function createMessage(chatId: number, senderId: number, content: string) {
        return prisma.message.create({
            data: {
                chat_id: chatId,
                sender_id: senderId,
                message_type: "text",
                message_uuid: crypto.randomUUID(),
                message_data: {
                    type: "text",
                    content,
                    created_at: new Date(),
                    sender_id: senderId,
                    chat_id: chatId,
                },
            },
        });
    }

    describe("index", () => {
        it("returns messages for a chat the user is a member of", async () => {
            const user = await createUser("msg_idx_1");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Msg Index", owner_id: user.id },
            });
            await addMember(chat.id, user.id);
            await createMessage(chat.id, user.id, "Hello");
            await createMessage(chat.id, user.id, "World");

            const result = await messageService.index(user.id, chat.id, 20, null, null);
            expect(result).toHaveLength(2);
            expect(result[0].message_data.content).toBe("World");
            expect(result[1].message_data.content).toBe("Hello");
        });

        it("returns messages in descending order by default", async () => {
            const user = await createUser("msg_idx_desc");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Msg Desc", owner_id: user.id },
            });
            await addMember(chat.id, user.id);
            const m1 = await createMessage(chat.id, user.id, "First");
            const m2 = await createMessage(chat.id, user.id, "Second");
            const m3 = await createMessage(chat.id, user.id, "Third");

            const result = await messageService.index(user.id, chat.id, 20, null, null);
            expect(result).toHaveLength(3);
            expect(result[0].id).toBe(m3.id);
            expect(result[2].id).toBe(m1.id);
        });

        it("returns messages after a given cursor", async () => {
            const user = await createUser("msg_idx_after");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Msg After", owner_id: user.id },
            });
            await addMember(chat.id, user.id);
            const m1 = await createMessage(chat.id, user.id, "First");
            const m2 = await createMessage(chat.id, user.id, "Second");
            const m3 = await createMessage(chat.id, user.id, "Third");

            const result = await messageService.index(user.id, chat.id, 20, null, m1.id);
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe(m2.id);
            expect(result[1].id).toBe(m3.id);
        });

        it("returns messages before a given cursor", async () => {
            const user = await createUser("msg_idx_before");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Msg Before", owner_id: user.id },
            });
            await addMember(chat.id, user.id);
            const m1 = await createMessage(chat.id, user.id, "First");
            const m2 = await createMessage(chat.id, user.id, "Second");
            const m3 = await createMessage(chat.id, user.id, "Third");

            const result = await messageService.index(user.id, chat.id, 20, m3.id, null);
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe(m2.id);
            expect(result[1].id).toBe(m1.id);
        });

        it("respects the limit parameter", async () => {
            const user = await createUser("msg_idx_limit");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Msg Limit", owner_id: user.id },
            });
            await addMember(chat.id, user.id);
            for (let i = 0; i < 5; i++) {
                await createMessage(chat.id, user.id, `Msg ${i}`);
            }

            const result = await messageService.index(user.id, chat.id, 3, null, null);
            expect(result).toHaveLength(3);
        });

        it("throws AppError(403) when user is not a member", async () => {
            const user = await createUser("msg_idx_forbid");
            const other = await createUser("msg_idx_other");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Forbidden", owner_id: other.id },
            });
            await addMember(chat.id, other.id);

            await expect(
                messageService.index(user.id, chat.id, 20, null, null),
            ).rejects.toThrow(AppError);
        });
    });

    describe("saveMessageToDb", () => {
        it("throws AppError(403) when user is not a member", async () => {
            const user = await createUser("save_forbid");
            const other = await createUser("save_other");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Save Forbid", owner_id: other.id },
            });
            await addMember(chat.id, other.id);
            messageService.services = {
                ChatService: {
                    isUserJoinedToChat: vi.fn().mockResolvedValue(false),
                },
            } as any;

            await expect(
                messageService.saveMessageToDb(user.id, {
                    chat_id: chat.id,
                    message_type: "text",
                    message_uuid: crypto.randomUUID(),
                    message_data: {
                        type: "text",
                        content: "Should not work",
                        created_at: new Date(),
                        sender_id: user.id,
                        chat_id: chat.id,
                    },
                }),
            ).rejects.toThrow(AppError);

            messageService.services = undefined as any;
        });
    });

    describe("deleteMessageFromDb", () => {
        it("deletes own message", async () => {
            const user = await createUser("del_own");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Del Own", owner_id: user.id },
            });
            await addMember(chat.id, user.id);
            const msg = await createMessage(chat.id, user.id, "Delete me");

            const result = await messageService.deleteMessageFromDb(user.id, chat.id, msg.id);
            expect(result).toBe(true);

            const deleted = await prisma.message.findUnique({ where: { id: msg.id } });
            expect(deleted?.deleted_at).not.toBeNull();
        });

        it("deletes message as chat owner", async () => {
            const owner = await createUser("del_owner");
            const member = await createUser("del_member");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Del As Owner", owner_id: owner.id },
            });
            await addMember(chat.id, member.id);
            const msg = await createMessage(chat.id, member.id, "Owner can delete");

            const result = await messageService.deleteMessageFromDb(owner.id, chat.id, msg.id);
            expect(result).toBe(true);
        });

        it("throws AppError(404) for non-existent message", async () => {
            const user = await createUser("del_nf");

            await expect(
                messageService.deleteMessageFromDb(user.id, 99999, 99999),
            ).rejects.toThrow(AppError);
        });

        it("throws AppError(403) when user is neither sender nor owner", async () => {
            const user1 = await createUser("del_no_perm_1");
            const user2 = await createUser("del_no_perm_2");
            const stranger = await createUser("del_stranger");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "No Perm", owner_id: user1.id },
            });
            await addMember(chat.id, user1.id);
            await addMember(chat.id, user2.id);
            const msg = await createMessage(chat.id, user1.id, "Can't touch this");

            await expect(
                messageService.deleteMessageFromDb(stranger.id, chat.id, msg.id),
            ).rejects.toThrow(AppError);
        });

        it("throws AppError(404) for already deleted message", async () => {
            const user = await createUser("del_already");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Already Del", owner_id: user.id },
            });
            await addMember(chat.id, user.id);
            const msg = await createMessage(chat.id, user.id, "Gone");
            await messageService.deleteMessageFromDb(user.id, chat.id, msg.id);

            await expect(
                messageService.deleteMessageFromDb(user.id, chat.id, msg.id),
            ).rejects.toThrow(AppError);
        });
    });
});

describe("Message API Integration", () => {
    let container: StartedPostgreSqlContainer;
    let prisma: PrismaClient;
    let app: express.Application;
    let messageService: MessageService;

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

        messageService = new MessageService(prisma);

        app = express();
        app.use(express.json());
        app.use(cookieParser());

        app.use((req, _res, next) => {
            req.tenant = {
                data: { id: 1, domain: "test.localhost", active: true, name: "Test", db_name: "test", created_at: new Date() },
                services: { MessageService: messageService },
            } as any;
            req.log = { info: () => {}, error: () => {}, warn: () => {}, debug: () => {}, trace: () => {}, fatal: () => {} } as any;
            next();
        });

        app.use(authMiddleware);
        app.use("/messages", messageRoutes);
        app.use(ErrorMiddleware);
    }, 120000);

    afterAll(async () => {
        await prisma.$disconnect();
        await container.stop();
    });

    let seq = 0;
    async function uniqueUser() {
        seq++;
        const loginId = `api_msg_user_${Date.now()}_${seq}`;
        const user = await prisma.user.create({
            data: { login_id: loginId, hashed_password: "hashed" },
        });
        return { user, token: jwt.sign(
            { sessionId: 1, userId: user.id, permissions: {}, tenant_id: 1 },
            process.env.JWT_EC_PRIVATE_KEY_TEST!,
            { algorithm: "ES256" },
        ) };
    }

    async function addMember(chatId: number, userId: number) {
        return prisma.chatMember.create({
            data: { chat_id: chatId, user_id: userId },
        });
    }

    async function createMessage(chatId: number, senderId: number, content: string) {
        return prisma.message.create({
            data: {
                chat_id: chatId,
                sender_id: senderId,
                message_type: "text",
                message_uuid: crypto.randomUUID(),
                message_data: {
                    type: "text",
                    content,
                    created_at: new Date(),
                    sender_id: senderId,
                    chat_id: chatId,
                },
            },
        });
    }

    describe("GET /messages", () => {
        it("returns 401 without auth token", async () => {
            const res = await request(app)
                .get("/messages")
                .send({ chat_id: 1 });
            expect(res.status).toBe(401);
        });

        it("returns messages for a joined chat", async () => {
            const { user, token } = await uniqueUser();
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "API Msg", owner_id: user.id },
            });
            await addMember(chat.id, user.id);
            await createMessage(chat.id, user.id, "API Hello");

            const res = await request(app)
                .get("/messages")
                .set("Cookie", `token=${token}`)
                .send({ chat_id: chat.id });
            expect(res.status).toBe(200);
            expect(res.body.messasges).toHaveLength(1);
            expect(res.body.messasges[0].message_data.content).toBe("API Hello");
        });

        it("returns 400 when chat_id is missing", async () => {
            const { token } = await uniqueUser();
            const res = await request(app)
                .get("/messages")
                .set("Cookie", `token=${token}`)
                .send({});
            expect(res.status).toBe(400);
        });

        it("returns 400 when limit exceeds maximum", async () => {
            const { user, token } = await uniqueUser();
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Limit Test", owner_id: user.id },
            });
            await addMember(chat.id, user.id);

            const res = await request(app)
                .get("/messages")
                .set("Cookie", `token=${token}`)
                .send({ chat_id: chat.id, limit: 100 });
            expect(res.status).toBe(400);
        });

        it("returns 403 when user is not a member", async () => {
            const { user: owner } = await uniqueUser();
            const { token } = await uniqueUser();
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Restricted", owner_id: owner.id },
            });
            await addMember(chat.id, owner.id);

            const res = await request(app)
                .get("/messages")
                .set("Cookie", `token=${token}`)
                .send({ chat_id: chat.id });
            expect(res.status).toBe(403);
        });

        it("supports pagination with before cursor", async () => {
            const { user, token } = await uniqueUser();
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Paginate", owner_id: user.id },
            });
            await addMember(chat.id, user.id);
            const m1 = await createMessage(chat.id, user.id, "First");
            const m2 = await createMessage(chat.id, user.id, "Second");

            const res = await request(app)
                .get("/messages")
                .set("Cookie", `token=${token}`)
                .send({ chat_id: chat.id, before: m2.id });
            expect(res.status).toBe(200);
            expect(res.body.messasges).toHaveLength(1);
            expect(res.body.messasges[0].message_data.content).toBe("First");
        });
    });
});
