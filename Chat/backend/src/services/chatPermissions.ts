import type { PrismaClient } from "../generated/prisma/client.js";
import { AppError } from "../middlewares/errorMiddleware.js";

export const ADMIN_PERMISSION_KEYS = [
    "change_info",
    "post_messages",
    "edit_messages",
    "delete_messages",
    "ban_users",
    "invite_users",
    "pin_messages",
    "add_admins",
    "manage_call",
    "manage_topics",
    "anonymous",
] as const;

export const MEMBER_PERMISSION_KEYS = [
    "send_messages",
    "send_photos",
    "send_videos",
    "send_files",
    "send_voice",
    "send_video_messages",
    "send_stickers",
    "send_gifs",
    "send_links",
    "send_polls",
    "add_members",
    "change_info",
    "pin_messages",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSION_KEYS)[number];
export type MemberPermission = (typeof MEMBER_PERMISSION_KEYS)[number];
export type ChatRole = "owner" | "admin" | "member" | "restricted";
export type PermissionMap = Record<string, boolean>;

export const DEFAULT_MEMBER_PERMISSIONS: PermissionMap = Object.fromEntries(
    MEMBER_PERMISSION_KEYS.map((key) => [key, !["change_info", "pin_messages"].includes(key)]),
);

export const DEFAULT_CHANNEL_PERMISSIONS: PermissionMap = Object.fromEntries(
    MEMBER_PERMISSION_KEYS.map((key) => [key, false]),
);

export const ALL_ADMIN_PERMISSIONS: PermissionMap = Object.fromEntries(
    ADMIN_PERMISSION_KEYS.map((key) => [key, true]),
);

function jsonPermissions(value: unknown): PermissionMap {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
        Object.entries(value).filter((entry): entry is [string, boolean] => {
            return typeof entry[1] === "boolean";
        }),
    );
}

export function mergePermissions(base: unknown, override: unknown): PermissionMap {
    return { ...jsonPermissions(base), ...jsonPermissions(override) };
}

export function classifyContentPermission(content: string): MemberPermission {
    const mediaMatch = content.match(
        /⟵media:(gif|sticker|photo|video|file|voice|videonote)(?:\r?\n|$)/i,
    );
    if (mediaMatch) {
        const kind = mediaMatch[1]!.toLowerCase();
        const map: Record<string, MemberPermission> = {
            photo: "send_photos",
            video: "send_videos",
            file: "send_files",
            voice: "send_voice",
            videonote: "send_video_messages",
            sticker: "send_stickers",
            gif: "send_gifs",
        };
        return map[kind]!;
    }
    if (/(?:https?:\/\/|www\.)\S+/i.test(content)) return "send_links";
    return "send_messages";
}

export function uploadKindPermission(kind: string): MemberPermission {
    const map: Record<string, MemberPermission> = {
        photo: "send_photos",
        video: "send_videos",
        file: "send_files",
        voice: "send_voice",
        videonote: "send_video_messages",
        sticker: "send_stickers",
        gif: "send_gifs",
    };
    return map[kind] ?? "send_files";
}

export async function getChatAccess(prisma: PrismaClient, chatId: number, userId: number) {
    const member = await prisma.chatMember.findFirst({
        where: {
            chat_id: chatId,
            user_id: userId,
            deleted_at: null,
            chat: { deleted_at: null },
        },
        select: {
            id: true,
            role: true,
            admin_permissions: true,
            member_permissions: true,
            banned_until: true,
            chat: {
                select: {
                    id: true,
                    type: true,
                    owner_id: true,
                    default_permissions: true,
                    slow_mode_seconds: true,
                },
            },
        },
    });
    if (!member) {
        const ownedChat = await prisma.chat.findFirst({
            where: { id: chatId, owner_id: userId, deleted_at: null },
            select: {
                id: true,
                type: true,
                owner_id: true,
                default_permissions: true,
                slow_mode_seconds: true,
            },
        });
        if (!ownedChat) throw new AppError("عضویت فعال در گفتگو پیدا نشد", 403);
        return {
            id: 0,
            role: "owner" as const,
            admin_permissions: null,
            member_permissions: null,
            banned_until: null,
            chat: ownedChat,
        };
    }

    const role: ChatRole = member.chat.owner_id === userId ? "owner" : (member.role as ChatRole);
    return { ...member, role };
}

export async function assertManagementAccess(
    prisma: PrismaClient,
    chatId: number,
    userId: number,
    permission?: AdminPermission,
) {
    const access = await getChatAccess(prisma, chatId, userId);
    if (!["group", "channel"].includes(access.chat.type)) {
        throw new AppError("مدیریت فقط برای گروه و کانال در دسترس است", 400);
    }
    if (access.role === "owner") return access;
    if (access.role !== "admin") throw new AppError("فقط مالک یا مدیر مجاز است", 403);
    if (permission && jsonPermissions(access.admin_permissions)[permission] !== true) {
        throw new AppError("مجوز مدیریتی لازم را ندارید", 403);
    }
    return access;
}

export async function assertSendPermission(
    prisma: PrismaClient,
    chatId: number,
    userId: number,
    permission: MemberPermission,
) {
    const access = await getChatAccess(prisma, chatId, userId);
    if (access.chat.type === "private" || access.role === "owner") return access;

    if (access.banned_until && access.banned_until > new Date()) {
        throw new AppError("ارسال پیام برای شما تا زمان تعیین‌شده محدود است", 403);
    }

    if (access.role === "admin") {
        if (
            access.chat.type === "channel" &&
            jsonPermissions(access.admin_permissions).post_messages !== true
        ) {
            throw new AppError("مجوز انتشار پیام در کانال را ندارید", 403);
        }
        return access;
    }

    const effective = mergePermissions(access.chat.default_permissions, access.member_permissions);
    if (effective[permission] !== true) {
        throw new AppError("اجازه ارسال این نوع محتوا را ندارید", 403);
    }
    return access;
}

export function effectivePermissions(access: Awaited<ReturnType<typeof getChatAccess>>) {
    if (access.role === "owner") return { ...ALL_ADMIN_PERMISSIONS, ...DEFAULT_MEMBER_PERMISSIONS };
    if (access.role === "admin") return jsonPermissions(access.admin_permissions);
    return mergePermissions(access.chat.default_permissions, access.member_permissions);
}
