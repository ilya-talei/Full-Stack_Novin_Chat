import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import {
    assertSendPermission,
    classifyContentPermission,
    mergePermissions,
} from "../src/services/chatPermissions.js";

function prismaWithAccess(access: object) {
    return {
        chatMember: { findFirst: vi.fn().mockResolvedValue(access) },
    } as unknown as PrismaClient;
}

describe("chat permissions", () => {
    it("classifies the existing media payload format", () => {
        expect(classifyContentPermission('⟵media:photo\n{"url":"/x"}')).toBe("send_photos");
        expect(classifyContentPermission("↩ reply\n⟵media:videonote\n{}")).toBe(
            "send_video_messages",
        );
        expect(classifyContentPermission("https://example.com")).toBe("send_links");
        expect(classifyContentPermission("سلام")).toBe("send_messages");
    });

    it("applies per-member overrides over chat defaults", () => {
        expect(
            mergePermissions({ send_messages: true, send_files: false }, { send_files: true }),
        ).toMatchObject({ send_messages: true, send_files: true });
    });

    it("requires post_messages from channel admins", async () => {
        const base = {
            id: 1,
            role: "admin",
            member_permissions: null,
            banned_until: null,
            chat: {
                id: 1,
                type: "channel",
                owner_id: 99,
                default_permissions: {},
                slow_mode_seconds: 0,
            },
        };
        await expect(
            assertSendPermission(
                prismaWithAccess({ ...base, admin_permissions: { post_messages: false } }),
                1,
                2,
                "send_messages",
            ),
        ).rejects.toMatchObject({ status_code: 403 });

        await expect(
            assertSendPermission(
                prismaWithAccess({ ...base, admin_permissions: { post_messages: true } }),
                1,
                2,
                "send_messages",
            ),
        ).resolves.toMatchObject({ role: "admin" });
    });

    it("lets owners bypass content restrictions", async () => {
        await expect(
            assertSendPermission(
                prismaWithAccess({
                    id: 1,
                    role: "member",
                    admin_permissions: null,
                    member_permissions: null,
                    banned_until: null,
                    chat: {
                        id: 1,
                        type: "channel",
                        owner_id: 7,
                        default_permissions: { send_messages: false, send_files: false },
                        slow_mode_seconds: 0,
                    },
                }),
                1,
                7,
                "send_files",
            ),
        ).resolves.toMatchObject({ role: "owner" });
    });
});
