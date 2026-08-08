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
import ChatService from "../src/services/chatService.js";
import { AppError } from "../src/middlewares/errorMiddleware.js";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import chatRoutes from "../src/routes/chatRoutes.js";
import authMiddleware from "../src/middlewares/authMiddleware.js";
import ErrorMiddleware from "../src/middlewares/errorMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const chatServiceRoot = path.resolve(__dirname, "..");

describe("ChatService", () => {
    let container: StartedPostgreSqlContainer;
    let prisma: PrismaClient;
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

    describe("create", () => {
        it("creates a group chat", async () => {
            const user = await createUser("create_group");

            const result = await chatService.create(user.id, "group", "Test Group");

            expect(result).toMatchObject({
                type: "group",
                name: "Test Group",
                lastMessage: null,
                pinned_message_id: null,
            });
            expect(result.id).toBeGreaterThan(0);
        });

        it("creates a channel chat", async () => {
            const user = await createUser("create_channel");

            const result = await chatService.create(user.id, "channel", "Test Channel");

            expect(result.type).toBe("channel");
            expect(result.name).toBe("Test Channel");
        });

        it("adds the creator as a member", async () => {
            const user = await createUser("create_member");

            const result = await chatService.create(user.id, "group", "Membership Test");

            const member = await prisma.chatMember.findFirst({
                where: { chat_id: result.id, user_id: user.id, deleted_at: null },
            });
            expect(member).not.toBeNull();
        });

        it("throws AppError(400) for invalid chat type", async () => {
            const user = await createUser("create_invalid");

            await expect(
                chatService.create(user.id, "invalid" as "group", "Test"),
            ).rejects.toThrow(AppError);
        });
    });

    describe("update", () => {
        it("updates chat name", async () => {
            const user = await createUser("update_name");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Old Name", owner_id: user.id },
            });
            await addMember(chat.id, user.id);

            await chatService.update(user.id, chat.id, "New Name", null);

            const updated = await prisma.chat.findUnique({ where: { id: chat.id } });
            expect(updated?.chat_name).toBe("New Name");
            expect(updated?.description).toBe("");
        });

        it("updates chat description", async () => {
            const user = await createUser("update_desc");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Desc Test", owner_id: user.id },
            });
            await addMember(chat.id, user.id);

            await chatService.update(user.id, chat.id, null, "New description");

            const updated = await prisma.chat.findUnique({ where: { id: chat.id } });
            expect(updated?.description).toBe("New description");
        });

        it("updates both name and description", async () => {
            const user = await createUser("update_both");
            const chat = await prisma.chat.create({
                data: { type: "channel", chat_name: "Old", owner_id: user.id },
            });
            await addMember(chat.id, user.id);

            await chatService.update(user.id, chat.id, "New Name", "New description");

            const updated = await prisma.chat.findUnique({ where: { id: chat.id } });
            expect(updated?.chat_name).toBe("New Name");
            expect(updated?.description).toBe("New description");
        });

        it("updates a channel chat", async () => {
            const user = await createUser("update_channel");
            const chat = await prisma.chat.create({
                data: { type: "channel", chat_name: "Old Channel", owner_id: user.id },
            });
            await addMember(chat.id, user.id);

            await chatService.update(user.id, chat.id, "Updated Channel", "Channel desc");

            const updated = await prisma.chat.findUnique({ where: { id: chat.id } });
            expect(updated?.chat_name).toBe("Updated Channel");
        });

        it("throws AppError(404) for non-existent chat", async () => {
            const user = await createUser("update_nonexist");

            await expect(
                chatService.update(user.id, 99999, "Name", null),
            ).rejects.toThrow(AppError);
        });

        it("throws AppError(404) when user is not a member", async () => {
            const owner = await createUser("update_owner");
            const intruder = await createUser("update_intruder");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Private", owner_id: owner.id },
            });
            await addMember(chat.id, owner.id);

            await expect(
                chatService.update(intruder.id, chat.id, "Hacked", null),
            ).rejects.toThrow(AppError);
        });

        it("throws AppError(404) for private chat", async () => {
            const user1 = await createUser("update_priv1");
            const user2 = await createUser("update_priv2");
            const chat = await prisma.chat.create({ data: { type: "private" } });
            await addMember(chat.id, user1.id);
            await addMember(chat.id, user2.id);

            await expect(
                chatService.update(user1.id, chat.id, "New Name", null),
            ).rejects.toThrow(AppError);
        });
    });

    describe("isUserJoinedToChat", () => {
        it("returns true when user is an active member", async () => {
            const user1 = await createUser("joined_true1");
            const user2 = await createUser("joined_true2");
            const chat = await prisma.chat.create({ data: { type: "private" } });
            await addMember(chat.id, user1.id);
            await addMember(chat.id, user2.id);

            const result = await chatService.isUserJoinedToChat(user1.id, chat.id);
            expect(result).toBe(true);
        });

        it("returns false when user is not a member", async () => {
            const user1 = await createUser("joined_false1");
            const user2 = await createUser("joined_false2");
            const outsider = await createUser("joined_outsider");
            const chat = await prisma.chat.create({ data: { type: "private" } });
            await addMember(chat.id, user1.id);
            await addMember(chat.id, user2.id);

            const result = await chatService.isUserJoinedToChat(outsider.id, chat.id);
            expect(result).toBe(false);
        });

        it("returns false when membership is soft-deleted", async () => {
            const user = await createUser("joined_deleted");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Gone" },
            });
            await addMember(chat.id, user.id);

            await prisma.chatMember.updateMany({
                where: { chat_id: chat.id, user_id: user.id },
                data: { deleted_at: new Date() },
            });

            const result = await chatService.isUserJoinedToChat(user.id, chat.id);
            expect(result).toBe(false);
        });

        it("returns false for non-existent chat", async () => {
            const user = await createUser("joined_nochat");

            const result = await chatService.isUserJoinedToChat(user.id, 99999);
            expect(result).toBe(false);
        });
    });

    describe("getUserChatIdsByUserID", () => {
        it("returns all chat IDs the user belongs to", async () => {
            const user = await createUser("chatids_all");
            const chat1 = await prisma.chat.create({
                data: { type: "group", chat_name: "A", owner_id: user.id },
            });
            await addMember(chat1.id, user.id);
            const chat2 = await prisma.chat.create({
                data: { type: "channel", chat_name: "B", owner_id: user.id },
            });
            await addMember(chat2.id, user.id);

            const result = await chatService.getUserChatIdsByUserID(user.id);
            expect(result).toEqual(expect.arrayContaining([chat1.id, chat2.id]));
            expect(result).toHaveLength(2);
        });

        it("returns empty array when user has no chats", async () => {
            const user = await createUser("chatids_empty");

            const result = await chatService.getUserChatIdsByUserID(user.id);
            expect(result).toEqual([]);
        });

        it("throws AppError for non-existent (soft-deleted) user", async () => {
            const user = await createUser("chatids_deleted");
            await prisma.user.update({
                where: { id: user.id },
                data: { deleted_at: new Date() },
            });

            await expect(
                chatService.getUserChatIdsByUserID(user.id),
            ).rejects.toThrow(AppError);
        });

        it("throws AppError for completely non-existent user ID", async () => {
            await expect(
                chatService.getUserChatIdsByUserID(99999),
            ).rejects.toThrow(AppError);
        });
    });

    describe("getChatByIdAndUserId", () => {
        it("returns chat when user is the owner", async () => {
            const user = await createUser("owner_find1");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Owned", owner_id: user.id },
            });

            const result = await chatService.getChatByIdAndUserId(chat.id, user.id);
            expect(result).not.toBeNull();
            expect(result!.id).toBe(chat.id);
            expect(result!.chat_name).toBe("Owned");
        });

        it("returns null when user is not the owner", async () => {
            const owner = await createUser("owner_false1");
            const other = await createUser("owner_false2");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Not Yours", owner_id: owner.id },
            });

            const result = await chatService.getChatByIdAndUserId(chat.id, other.id);
            expect(result).toBeNull();
        });

        it("returns null when chat is soft-deleted", async () => {
            const user = await createUser("owner_deleted");
            const chat = await prisma.chat.create({
                data: {
                    type: "group",
                    chat_name: "Deleted Chat",
                    owner_id: user.id,
                    deleted_at: new Date(),
                },
            });

            const result = await chatService.getChatByIdAndUserId(chat.id, user.id);
            expect(result).toBeNull();
        });

        it("returns null for non-existent chat ID", async () => {
            const user = await createUser("owner_nonexist");

            const result = await chatService.getChatByIdAndUserId(99999, user.id);
            expect(result).toBeNull();
        });
    });

    describe("index", () => {
        it("returns empty array when user has no chats", async () => {
            const user = await createUser("index_empty");

            const result = await chatService.index(user.id);
            expect(result).toEqual([]);
        });

        it("returns group chat with correct structure", async () => {
            const user = await createUser("index_group");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "My Group", owner_id: user.id },
            });
            await addMember(chat.id, user.id);

            const result = await chatService.index(user.id);
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: "group",
                name: "My Group",
                lastMessage: null,
            });
        });

        it("returns channel chat with correct structure", async () => {
            const user = await createUser("index_channel");
            const chat = await prisma.chat.create({
                data: { type: "channel", chat_name: "My Channel", owner_id: user.id },
            });
            await addMember(chat.id, user.id);

            const result = await chatService.index(user.id);
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: "channel",
                name: "My Channel",
                lastMessage: null,
            });
        });

        it("returns private chat with other user details", async () => {
            const user1 = await createUser("index_priv1");
            const user2 = await createUser("index_priv2");
            const chat = await prisma.chat.create({ data: { type: "private" } });
            await addMember(chat.id, user1.id);
            await addMember(chat.id, user2.id);

            const result = await chatService.index(user1.id);
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: "private",
                login_id: user2.login_id,
            });
        });

        it("excludes soft-deleted chats", async () => {
            const user = await createUser("index_softdel");
            const chat = await prisma.chat.create({
                data: {
                    type: "group",
                    chat_name: "Deleted",
                    owner_id: user.id,
                    deleted_at: new Date(),
                },
            });
            await addMember(chat.id, user.id);

            const result = await chatService.index(user.id);
            expect(result).toEqual([]);
        });

        it("throws AppError for non-existent (soft-deleted) user", async () => {
            const user = await createUser("index_usrdel");
            await prisma.user.update({
                where: { id: user.id },
                data: { deleted_at: new Date() },
            });

            await expect(chatService.index(user.id)).rejects.toThrow(AppError);
        });

        it("throws AppError(500) when private chat has no other members", async () => {
            const user = await createUser("index_nomembers");
            const chat = await prisma.chat.create({ data: { type: "private" } });
            await addMember(chat.id, user.id);

            await expect(chatService.index(user.id)).rejects.toThrow(AppError);
        });

        it("throws AppError(500) for chat with invalid type", async () => {
            const user = await createUser("index_invtype");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Fix Later", owner_id: user.id },
            });
            await addMember(chat.id, user.id);

            await prisma.$executeRawUnsafe(
                'UPDATE "chats" SET type = \'invalid_type\' WHERE id = $1',
                chat.id,
            );

            await expect(chatService.index(user.id)).rejects.toThrow(AppError);
        });
    });

    describe("show", () => {
        it("throws AppError(500) for chat with invalid type", async () => {
            const user = await createUser("show_invtype");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Fix Type Later", owner_id: user.id },
            });
            await addMember(chat.id, user.id);

            await prisma.$executeRawUnsafe(
                'UPDATE "chats" SET type = \'invalid_type\' WHERE id = $1',
                chat.id,
            );

            await expect(
                chatService.show(user.id, chat.id),
            ).rejects.toThrow(AppError);

            await prisma.$executeRawUnsafe(
                'UPDATE "chats" SET type = \'group\' WHERE id = $1',
                chat.id,
            );
        });
        it("returns a group chat when user is a member", async () => {
            const user = await createUser("show_group");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Show Group", owner_id: user.id },
            });
            await addMember(chat.id, user.id);

            const result = await chatService.show(user.id, chat.id);
            expect(result).toMatchObject({
                type: "group",
                name: "Show Group",
            });
        });

        it("returns a channel chat when user is a member", async () => {
            const user = await createUser("show_channel");
            const chat = await prisma.chat.create({
                data: { type: "channel", chat_name: "Show Channel", owner_id: user.id },
            });
            await addMember(chat.id, user.id);

            const result = await chatService.show(user.id, chat.id);
            expect(result).toMatchObject({
                type: "channel",
                name: "Show Channel",
            });
        });

        it("returns a private chat with other user details", async () => {
            const user1 = await createUser("show_priv1");
            const user2 = await createUser("show_priv2");
            const chat = await prisma.chat.create({ data: { type: "private" } });
            await addMember(chat.id, user1.id);
            await addMember(chat.id, user2.id);

            const result = await chatService.show(user1.id, chat.id);
            expect(result).toMatchObject({
                type: "private",
                login_id: user2.login_id,
            });
        });

        it("includes lastMessage when messages exist", async () => {
            const user = await createUser("show_msg");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "With Messages", owner_id: user.id },
            });
            await addMember(chat.id, user.id);

            await prisma.message.create({
                data: {
                    chat_id: chat.id,
                    sender_id: user.id,
                    message_type: "text",
                    message_uuid: crypto.randomUUID(),
                    message_data: { type: "text", content: "Hello", created_at: new Date(), sender_id: user.id, chat_id: chat.id },
                },
            });

            const result = await chatService.show(user.id, chat.id);
            expect(result.lastMessage).not.toBeNull();
            expect(result.lastMessage!.message_type).toBe("text");
            expect(result.lastMessage!.message_data.content).toBe("Hello");
        });

        it("throws AppError(404) when user is not a member", async () => {
            const owner = await createUser("show_nmember1");
            const stranger = await createUser("show_nmember2");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Restricted", owner_id: owner.id },
            });
            await addMember(chat.id, owner.id);

            await expect(
                chatService.show(stranger.id, chat.id),
            ).rejects.toThrow(AppError);
        });

        it("throws AppError(404) for non-existent chat", async () => {
            const user = await createUser("show_nonexist");

            await expect(
                chatService.show(user.id, 99999),
            ).rejects.toThrow(AppError);
        });

        it("throws AppError(500) when private chat has no other members", async () => {
            const user = await createUser("show_nomembers");
            const chat = await prisma.chat.create({ data: { type: "private" } });
            await addMember(chat.id, user.id);

            await expect(
                chatService.show(user.id, chat.id),
            ).rejects.toThrow(AppError);
        });
    });

    describe("uploadAvatar", () => {
        it("throws AppError(404) when chat is not found by owner", async () => {
            const user = await createUser("upload_nf");
            const file = { buffer: Buffer.from("test") } as Express.Multer.File;

            await expect(
                chatService.uploadAvatar(file, 99999, user.id),
            ).rejects.toThrow(AppError);
        });

        it("throws AppError(404) when chat is private", async () => {
            const user = await createUser("upload_priv");
            const chat = await prisma.chat.create({
                data: { type: "private", owner_id: user.id },
            });

            const file = { buffer: Buffer.from("test") } as Express.Multer.File;

            await expect(
                chatService.uploadAvatar(file, chat.id, user.id),
            ).rejects.toThrow(AppError);
        });

        it("processes image and uploads avatar successfully", async () => {
            const user = await createUser("upload_success");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Upload Test", owner_id: user.id },
            });

            chatService.services = {
                MinIOService: {
                    uploadChatAvatar: vi.fn().mockResolvedValue("uploaded-avatar.webp"),
                },
            } as any;

            const file = { buffer: Buffer.from("test-image") } as Express.Multer.File;

            await chatService.uploadAvatar(file, chat.id, user.id);

            const updated = await prisma.chat.findUnique({ where: { id: chat.id } });
            expect(updated?.avatar_file_name).toBe("uploaded-avatar.webp");

            chatService.services = undefined as any;
        });
    });

    describe("updateChatAvatar", () => {
        it("updates avatar file name for a chat", async () => {
            const user = await createUser("avatar_update");
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Avatar Chat", owner_id: user.id },
            });

            await chatService.updateChatAvatar(chat.id, "avatar-test.webp");

            const updated = await prisma.chat.findUnique({ where: { id: chat.id } });
            expect(updated?.avatar_file_name).toBe("avatar-test.webp");
        });

        it("throws AppError when chat does not exist", async () => {
            await expect(
                chatService.updateChatAvatar(99999, "nonexist.webp"),
            ).rejects.toThrow(AppError);
        });

        it("throws AppError when chat is soft-deleted", async () => {
            const user = await createUser("avatar_del");
            const chat = await prisma.chat.create({
                data: {
                    type: "group",
                    chat_name: "Deleted Chat",
                    owner_id: user.id,
                    deleted_at: new Date(),
                },
            });

            await expect(
                chatService.updateChatAvatar(chat.id, "avatar.webp"),
            ).rejects.toThrow(AppError);
        });
    });
});

describe("Chat API Integration", () => {
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
        app.use("/chats", chatRoutes);
        app.use(ErrorMiddleware);
    }, 120000);

    afterAll(async () => {
        await prisma.$disconnect();
        await container.stop();
    });

    let seq = 0;
    async function uniqueUser() {
        seq++;
        const loginId = `api_user_${Date.now()}_${seq}`;
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

    describe("Auth", () => {
        it("returns 401 when no token cookie is sent", async () => {
            const res = await request(app).get("/chats");
            expect(res.status).toBe(401);
            expect(res.body.message).toBe("Authentication Failed");
        });

        it("returns 401 when token is invalid", async () => {
            const res = await request(app)
                .get("/chats")
                .set("Cookie", "token=invalid.jwt.token");
            expect(res.status).toBe(401);
        });

        it("returns 401 when tenant_id in token does not match tenant", async () => {
            const { user } = await uniqueUser();
            const badToken = jwt.sign(
                { sessionId: 1, userId: user.id, permissions: {}, tenant_id: 999 },
                process.env.JWT_EC_PRIVATE_KEY_TEST!,
                { algorithm: "ES256" },
            );
            const res = await request(app)
                .get("/chats")
                .set("Cookie", `token=${badToken}`);
            expect(res.status).toBe(401);
            expect(res.body.message).toBe("Authentication Failed");
        });
    });

    describe("GET /chats", () => {
        it("returns empty array when user has no chats", async () => {
            const { token } = await uniqueUser();
            const res = await request(app)
                .get("/chats")
                .set("Cookie", `token=${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
        });

        it("returns group chat with correct structure", async () => {
            const { user, token } = await uniqueUser();
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "API Group", owner_id: user.id },
            });
            await addMember(chat.id, user.id);

            const res = await request(app)
                .get("/chats")
                .set("Cookie", `token=${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0]).toMatchObject({
                type: "group",
                name: "API Group",
                lastMessage: null,
            });
        });

        it("returns channel chat with correct structure", async () => {
            const { user, token } = await uniqueUser();
            const chat = await prisma.chat.create({
                data: { type: "channel", chat_name: "API Channel", owner_id: user.id },
            });
            await addMember(chat.id, user.id);

            const res = await request(app)
                .get("/chats")
                .set("Cookie", `token=${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0]).toMatchObject({
                type: "channel",
                name: "API Channel",
                lastMessage: null,
            });
        });

        it("returns private chat with other user details", async () => {
            const { user, token } = await uniqueUser();
            const { user: otherUser } = await uniqueUser();
            const chat = await prisma.chat.create({ data: { type: "private" } });
            await addMember(chat.id, user.id);
            await addMember(chat.id, otherUser.id);

            const res = await request(app)
                .get("/chats")
                .set("Cookie", `token=${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0]).toMatchObject({
                type: "private",
                login_id: otherUser.login_id,
            });
        });

        it("excludes soft-deleted chats", async () => {
            const { user, token } = await uniqueUser();
            const chat = await prisma.chat.create({
                data: {
                    type: "group",
                    chat_name: "Deleted",
                    owner_id: user.id,
                    deleted_at: new Date(),
                },
            });
            await addMember(chat.id, user.id);

            const res = await request(app)
                .get("/chats")
                .set("Cookie", `token=${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
        });

        it("returns 500 when service throws an unexpected error", async () => {
            const { token } = await uniqueUser();
            const spy = vi.spyOn(chatService, "index").mockRejectedValue(new Error("Unexpected"));

            const res = await request(app)
                .get("/chats")
                .set("Cookie", `token=${token}`);
            expect(res.status).toBe(500);

            spy.mockRestore();
        });
    });

    describe("POST /chats", () => {
        it("creates a group chat and returns 201", async () => {
            const { token } = await uniqueUser();
            const res = await request(app)
                .post("/chats")
                .set("Cookie", `token=${token}`)
                .send({ type: "group", chat_name: "New Group" });
            expect(res.status).toBe(201);
            expect(res.body.data).toMatchObject({
                type: "group",
                name: "New Group",
            });
            expect(res.body.data.id).toBeGreaterThan(0);
        });

        it("creates a channel chat", async () => {
            const { token } = await uniqueUser();
            const res = await request(app)
                .post("/chats")
                .set("Cookie", `token=${token}`)
                .send({ type: "channel", chat_name: "New Channel" });
            expect(res.status).toBe(201);
            expect(res.body.data.type).toBe("channel");
            expect(res.body.data.name).toBe("New Channel");
        });

        it("returns 400 when type is invalid", async () => {
            const { token } = await uniqueUser();
            const res = await request(app)
                .post("/chats")
                .set("Cookie", `token=${token}`)
                .send({ type: "invalid", chat_name: "Test" });
            expect(res.status).toBe(400);
        });

        it("returns 400 when chat_name is too short", async () => {
            const { token } = await uniqueUser();
            const res = await request(app)
                .post("/chats")
                .set("Cookie", `token=${token}`)
                .send({ type: "group", chat_name: "A" });
            expect(res.status).toBe(400);
        });

        it("returns 400 when chat_name is missing", async () => {
            const { token } = await uniqueUser();
            const res = await request(app)
                .post("/chats")
                .set("Cookie", `token=${token}`)
                .send({ type: "group" });
            expect(res.status).toBe(400);
        });
    });

    describe("GET /chats/:chatId", () => {
        it("returns chat details when user is a member", async () => {
            const { user, token } = await uniqueUser();
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Show Test", owner_id: user.id },
            });
            await addMember(chat.id, user.id);

            const res = await request(app)
                .get(`/chats/${chat.id}`)
                .set("Cookie", `token=${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data).toMatchObject({
                type: "group",
                name: "Show Test",
            });
        });

        it("returns 404 when user is not a member", async () => {
            const { user: owner } = await uniqueUser();
            const { token } = await uniqueUser();
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Restricted", owner_id: owner.id },
            });
            await addMember(chat.id, owner.id);

            const res = await request(app)
                .get(`/chats/${chat.id}`)
                .set("Cookie", `token=${token}`);
            expect(res.status).toBe(404);
        });

        it("returns 400 when chatId is not a number", async () => {
            const { token } = await uniqueUser();
            const res = await request(app)
                .get("/chats/abc")
                .set("Cookie", `token=${token}`);
            expect(res.status).toBe(400);
        });

        it("returns 400 when chatId is zero or negative", async () => {
            const { token } = await uniqueUser();
            const res = await request(app)
                .get("/chats/0")
                .set("Cookie", `token=${token}`);
            expect(res.status).toBe(400);
        });
    });

    describe("PUT /chats/:chatId", () => {
        it("updates chat name", async () => {
            const { user, token } = await uniqueUser();
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Old", owner_id: user.id },
            });
            await addMember(chat.id, user.id);

            const res = await request(app)
                .put(`/chats/${chat.id}`)
                .set("Cookie", `token=${token}`)
                .send({ chat_name: "Updated" });
            expect(res.status).toBe(200);
            expect(res.body.message).toBe("Chat updated successfully");
        });

        it("updates chat name and description", async () => {
            const { user, token } = await uniqueUser();
            const chat = await prisma.chat.create({
                data: { type: "channel", chat_name: "Old Channel", owner_id: user.id },
            });
            await addMember(chat.id, user.id);

            const res = await request(app)
                .put(`/chats/${chat.id}`)
                .set("Cookie", `token=${token}`)
                .send({ chat_name: "Updated Channel", description: "New desc" });
            expect(res.status).toBe(200);
        });

        it("returns 404 when updating a private chat", async () => {
            const { user, token } = await uniqueUser();
            const { user: other } = await uniqueUser();
            const chat = await prisma.chat.create({ data: { type: "private" } });
            await addMember(chat.id, user.id);
            await addMember(chat.id, other.id);

            const res = await request(app)
                .put(`/chats/${chat.id}`)
                .set("Cookie", `token=${token}`)
                .send({ chat_name: "Hacked" });
            expect(res.status).toBe(404);
        });

        it("returns 404 for non-existent chat", async () => {
            const { token } = await uniqueUser();
            const res = await request(app)
                .put("/chats/99999")
                .set("Cookie", `token=${token}`)
                .send({ chat_name: "Ghost" });
            expect(res.status).toBe(404);
        });

        it("returns 400 when chat_name is too short", async () => {
            const { user, token } = await uniqueUser();
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Valid", owner_id: user.id },
            });
            await addMember(chat.id, user.id);

            const res = await request(app)
                .put(`/chats/${chat.id}`)
                .set("Cookie", `token=${token}`)
                .send({ chat_name: "X" });
            expect(res.status).toBe(400);
        });

        it("returns 400 when chatId is not a number", async () => {
            const { token } = await uniqueUser();
            const res = await request(app)
                .put("/chats/invalid")
                .set("Cookie", `token=${token}`)
                .send({ chat_name: "Valid Name" });
            expect(res.status).toBe(400);
        });
    });

    describe("PUT /chats/:chatId/avatar", () => {
        it("returns 400 when no file is uploaded", async () => {
            const { user, token } = await uniqueUser();
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Avatar No File", owner_id: user.id },
            });

            const res = await request(app)
                .put(`/chats/${chat.id}/avatar`)
                .set("Cookie", `token=${token}`);
            expect(res.status).toBe(400);
            expect(res.body.message).toBe("ارسال تصویر الزامی است");
        });

        it("returns 400 when file type is not PNG or JPEG", async () => {
            const { user, token } = await uniqueUser();
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Avatar Bad Type", owner_id: user.id },
            });

            const res = await request(app)
                .put(`/chats/${chat.id}/avatar`)
                .set("Cookie", `token=${token}`)
                .attach("avatar", Buffer.from("plain text content"), "test.txt");
            expect(res.status).toBe(400);
            expect(res.body.message).toBe("فرمت های مجاز برای تصویر png و jpeg هستند");
        });

        it("returns 400 when chatId is invalid", async () => {
            const { token } = await uniqueUser();
            const res = await request(app)
                .put("/chats/abc/avatar")
                .set("Cookie", `token=${token}`)
                .attach("avatar", Buffer.from("test"), "test.png");
            expect(res.status).toBe(400);
        });

        it("returns 204 on successful avatar upload", async () => {
            const { user, token } = await uniqueUser();
            const chat = await prisma.chat.create({
                data: { type: "group", chat_name: "Avatar Success", owner_id: user.id },
            });

            fileTypeFromBuffer.mockResolvedValue({ ext: "png", mime: "image/png" });
            const uploadSpy = vi.spyOn(chatService, "uploadAvatar").mockResolvedValue(undefined);

            const res = await request(app)
                .put(`/chats/${chat.id}/avatar`)
                .set("Cookie", `token=${token}`)
                .attach("avatar", Buffer.from("fake-png"), "test.png");
            expect(res.status).toBe(204);

            uploadSpy.mockRestore();
        });
    });
});

