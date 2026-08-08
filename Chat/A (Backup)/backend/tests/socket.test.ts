import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("../src/config/redis.js", () => ({
    default: {
        script: vi.fn().mockResolvedValue("mocked_sha"),
        evalsha: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock("jsonwebtoken", () => ({
    default: {
        verify: vi.fn().mockReturnValue({
            sessionId: 1,
            userId: 1,
            permissions: {},
            tenant_id: 1,
        }),
    },
}));

import http from "http";
import { Server } from "socket.io";
import { io as Client } from "socket.io-client";
import SocketService from "../src/services/socketService.js";

function createMockSocket() {
    const rooms = new Set<string>();
    return {
        id: "test-socket-id",
        emit: vi.fn(),
        join: vi.fn((room: string) => rooms.add(room)),
        to: vi.fn(() => ({
            emit: vi.fn(),
        })),
        disconnect: vi.fn(),
        handshake: {
            headers: {
                host: "localhost",
                cookie: "token=test-jwt-token",
            },
        },
        rooms,
        jwtSession: undefined,
        tenant: undefined,
        session: undefined,
    } as any;
}

describe("SocketService", () => {
    let socketService: SocketService;

    beforeAll(async () => {
        socketService = new SocketService();
        socketService.servies = {
            ChatService: {
                getUserChatIdsByUserID: vi.fn().mockResolvedValue([]),
            },
            MessageService: {
                saveMessageToDb: vi.fn().mockResolvedValue({
                    id: 1,
                    chat: { id: 1, type: "group", chat_name: "Test Chat" },
                    sender: { id: 1, login_id: "test_user" },
                    message_type: "text",
                    message_data: { type: "text", content: "Hello" },
                    created_at: new Date(),
                }),
                deleteMessageFromDb: vi.fn().mockResolvedValue(true),
            },
        } as any;
    });

    describe("sendResponseToClient", () => {
        it("emits message_response to the socket", () => {
            const socket = createMockSocket();
            const data = {
                id: 1,
                chat: { id: 1, type: "group" as const, chat_name: "Test" },
                sender: { id: 1, login_id: "user" },
                message_type: "text",
                message_data: { type: "text" as const, content: "Hi" },
                created_at: new Date(),
            };

            socketService.sendResponseToClient(socket, data as any);

            expect(socket.emit).toHaveBeenCalledWith("message_response", data);
        });
    });

    describe("sendMessageToChat", () => {
        it("emits new_message to the correct chat room", () => {
            const socket = createMockSocket();
            socket.tenant = { data: { id: 1 } };
            const data = {
                id: 1,
                chat: { id: 5, type: "group" as const, chat_name: "Room" },
                sender: { id: 1, login_id: "user" },
                message_type: "text",
                message_data: { type: "text" as const, content: "Hi all" },
                created_at: new Date(),
            };

            socketService.sendMessageToChat(socket, data as any);

            expect(socket.to).toHaveBeenCalledWith("tenant:1,chat_id:5.messages");
        });
    });

    describe("sendDeleteMessageToChat", () => {
        it("emits delete_message to the correct chat room", () => {
            const socket = createMockSocket();
            socket.tenant = { data: { id: 2 } };
            const data = { chat_id: 10, message_id: 42 };

            socketService.sendDeleteMessageToChat(socket, data);

            expect(socket.to).toHaveBeenCalledWith("tenant:2,chat_id:10.messages");
        });
    });

    describe("handleDisconnect", () => {
        it("returns early when tenant or jwtSession is missing", async () => {
            const socket = createMockSocket();

            await socketService.handleDisconnect(socket);

            expect(socket.emit).not.toHaveBeenCalled();
        });
    });

    describe("handleMessage", () => {
        it("validates and processes a message", async () => {
            const mockSave = vi.mocked(socketService.servies!.MessageService.saveMessageToDb);

            const socket = createMockSocket();
            socket.jwtSession = { userId: 1, sessionId: 1, permissions: {}, tenant_id: 1 };
            socket.tenant = { data: { id: 1 } };
            socket.session = { id: 1, user_id: 1 };
            socket.to = vi.fn(() => ({ emit: vi.fn() }));

            const messageData = {
                chat_id: 1,
                message_type: "text",
                message_uuid: "550e8400-e29b-41d4-a716-446655440000",
                message_data: {
                    type: "text",
                    content: "Test message",
                    created_at: new Date(),
                    sender_id: 1,
                    chat_id: 1,
                },
            };

            await (socketService as any).handleMessage(socket, messageData);

            expect(mockSave).toHaveBeenCalledWith(1, messageData);
            expect(socket.emit).toHaveBeenCalledWith(
                "message_response",
                expect.objectContaining({ id: 1 }),
            );
        });
    });

    describe("handleDeleteMessage", () => {
        it("validates and deletes a message", async () => {
            const mockDelete = vi.mocked(
                socketService.servies!.MessageService.deleteMessageFromDb,
            );

            const socket = createMockSocket();
            socket.session = { id: 1, user_id: 1 };

            const deleteData = { chat_id: 1, message_id: 5 };

            await (socketService as any).handleDeleteMessage(socket, deleteData);

            expect(mockDelete).toHaveBeenCalledWith(1, 1, 5);
        });
    });
});

describe("Socket.IO Integration", () => {
    let httpServer: http.Server;
    let ioServer: Server;
    let socketService: SocketService;
    let port: number;

    beforeAll(async () => {
        socketService = new SocketService();
        socketService.servies = {
            ChatService: {
                getUserChatIdsByUserID: vi.fn().mockResolvedValue([]),
                isUserJoinedToChat: vi.fn().mockResolvedValue(true),
            },
            MessageService: {
                saveMessageToDb: vi.fn().mockResolvedValue({
                    id: 42,
                    chat: { id: 1, type: "group", chat_name: "Test Chat" },
                    sender: { id: 1, login_id: "test_user" },
                    message_type: "text",
                    message_data: { type: "text", content: "Hello via socket" },
                    created_at: new Date(),
                }),
                deleteMessageFromDb: vi.fn().mockResolvedValue(true),
            },
        } as any;

        httpServer = http.createServer();
        ioServer = new Server(httpServer, {
            cors: { origin: "*" },
        });

        ioServer.on("connection", (socket: any) => {
            socket.jwtSession = { userId: 1, sessionId: 1, permissions: {}, tenant_id: 1 };
            socket.tenant = { data: { id: 1 } };
            socket.session = { id: 1, user_id: 1 };

            const onSafe = (event: string, handler: (sock: any, ...args: any[]) => Promise<void>) => {
                socket.on(event, async (...args: any[]) => {
                    try {
                        await handler(socket, ...args);
                    } catch (err: any) {
                        socket.emit("error", err?.message ?? "Handler error");
                    }
                });
            };

            onSafe("message", socketService.handleMessage);
            onSafe("delete_message", socketService.handleDeleteMessage);

            socket.emit("connected", { userId: 1 });
        });

        await new Promise<void>((resolve) => {
            httpServer.listen(0, () => {
                port = (httpServer.address() as any).port;
                resolve();
            });
        });
    }, 30000);

    afterAll(async () => {
        ioServer.close();
        httpServer.close();
    });

    it("client connects and receives connected event", async () => {
        const client = Client(`http://localhost:${port}`, {
            transports: ["websocket"],
        });

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("connection timeout")), 5000);
            client.on("connected", (data: any) => {
                clearTimeout(timeout);
                expect(data.userId).toBe(1);
                client.close();
                resolve();
            });
            client.on("connect_error", (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }, 10000);

    it("shows Zod v4 rejects serialized Date strings in handleMessage", async () => {
        const client = Client(`http://localhost:${port}`, {
            transports: ["websocket"],
        });

        await new Promise<void>((resolve, reject) => {
            let settled = false;
            const done = (err?: any) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeout);
                client.close();
                if (err) reject(err);
                else resolve();
            };
            const timeout = setTimeout(() => done(new Error("timeout")), 5000);

            client.on("connected", () => {
                client.on("error", (msg: string) => {
                    expect(msg).toContain("expected date");
                    done();
                });

                client.emit("message", {
                    chat_id: 1,
                    message_type: "text",
                    message_uuid: crypto.randomUUID(),
                    message_data: {
                        type: "text",
                        content: "Hello",
                        created_at: new Date().toISOString(),
                        sender_id: 1,
                        chat_id: 1,
                    },
                });
            });
        });
    }, 10000);

    it("client sends delete_message and service is called", async () => {
        const mockDelete = vi.mocked(
            socketService.servies!.MessageService.deleteMessageFromDb,
        );
        mockDelete.mockResolvedValue(true);

        const client = Client(`http://localhost:${port}`, {
            transports: ["websocket"],
        });

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("timeout")), 5000);
            client.on("connected", () => {
                clearTimeout(timeout);

                setTimeout(() => {
                    expect(mockDelete).toHaveBeenCalledWith(1, 3, 10);
                    client.close();
                    resolve();
                }, 500);

                client.emit("delete_message", { chat_id: 3, message_id: 10 });
            });
        });
    }, 10000);

    it("rejects invalid message data", async () => {
        const client = Client(`http://localhost:${port}`, {
            transports: ["websocket"],
        });

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("timeout")), 5000);
            client.on("connected", () => {
                clearTimeout(timeout);

                client.on("error", (err: any) => {
                    expect(err).toBeDefined();
                    client.close();
                    resolve();
                });

                client.emit("message", { invalid: "data" });
            });
        });
    }, 10000);
});
