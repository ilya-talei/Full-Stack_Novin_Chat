import { Prisma, type PrismaClient } from "../generated/prisma/client.js";
import { AppError } from "../middlewares/errorMiddleware.js";
import {
    ADMIN_PERMISSION_KEYS,
    assertManagementAccess,
    effectivePermissions,
    type ChatRole,
    type PermissionMap,
} from "./chatPermissions.js";

export type ChatSettingsInput = {
    chat_name?: string;
    description?: string;
    default_permissions?: PermissionMap;
    slow_mode_seconds?: number;
    is_public?: boolean;
    public_username?: string | null;
    history_visible?: boolean;
    signatures_enabled?: boolean;
};

export type MemberUpdateInput = {
    role?: ChatRole;
    custom_title?: string | null;
    admin_permissions?: PermissionMap | null;
    member_permissions?: PermissionMap | null;
    banned_until?: Date | null;
};

class ChatManagementService {
    constructor(private prisma: PrismaClient) {}

    async managedChats(userId: number) {
        const rows = await this.prisma.chatMember.findMany({
            where: {
                user_id: userId,
                deleted_at: null,
                OR: [{ role: { in: ["owner", "admin"] } }, { chat: { owner_id: userId } }],
                chat: { deleted_at: null, type: { in: ["group", "channel"] } },
            },
            select: {
                role: true,
                admin_permissions: true,
                chat: {
                    select: {
                        id: true,
                        type: true,
                        chat_name: true,
                        description: true,
                        avatar_file_name: true,
                        owner_id: true,
                        is_public: true,
                        public_username: true,
                        _count: { select: { members: { where: { deleted_at: null } } } },
                    },
                },
            },
            orderBy: { updated_at: "desc" },
        });
        return rows.map((row) => ({
            ...row.chat,
            role: row.chat.owner_id === userId ? "owner" : row.role,
            permissions: row.chat.owner_id === userId ? undefined : row.admin_permissions,
            canManage: true,
            memberCount: row.chat._count.members,
            _count: undefined,
        }));
    }

    async management(userId: number, chatId: number) {
        const access = await assertManagementAccess(this.prisma, chatId, userId);
        const chat = await this.prisma.chat.findUnique({
            where: { id: chatId },
            select: {
                id: true,
                type: true,
                chat_name: true,
                description: true,
                avatar_file_name: true,
                owner_id: true,
                default_permissions: true,
                slow_mode_seconds: true,
                is_public: true,
                public_username: true,
                history_visible: true,
                signatures_enabled: true,
                _count: { select: { members: { where: { deleted_at: null } } } },
            },
        });
        if (!chat) throw new AppError("گفتگو پیدا نشد", 404);
        return {
            ...chat,
            role: access.role,
            permissions: effectivePermissions(access),
            canManage: true,
            memberCount: chat._count.members,
            _count: undefined,
        };
    }

    async updateSettings(userId: number, chatId: number, input: ChatSettingsInput) {
        await assertManagementAccess(this.prisma, chatId, userId, "change_info");
        const current = await this.prisma.chat.findUnique({
            where: { id: chatId },
            select: { is_public: true, public_username: true },
        });
        if (!current) throw new AppError("گفتگو پیدا نشد", 404);
        const nextIsPublic = input.is_public ?? current.is_public;
        const nextUsername =
            input.public_username === undefined ? current.public_username : input.public_username;
        if (nextIsPublic && !nextUsername) {
            throw new AppError("برای گفتگوی عمومی نام کاربری الزامی است", 400);
        }
        if (input.public_username) {
            const duplicate = await this.prisma.chat.findFirst({
                where: {
                    public_username: input.public_username,
                    id: { not: chatId },
                },
                select: { id: true },
            });
            if (duplicate) throw new AppError("این نام کاربری قبلاً استفاده شده است", 409);
        }

        const data: Prisma.ChatUpdateInput = {};
        if (input.chat_name !== undefined) data.chat_name = input.chat_name;
        if (input.description !== undefined) data.description = input.description;
        if (input.default_permissions !== undefined) {
            data.default_permissions = input.default_permissions as Prisma.InputJsonValue;
        }
        if (input.slow_mode_seconds !== undefined) data.slow_mode_seconds = input.slow_mode_seconds;
        if (input.is_public !== undefined) data.is_public = input.is_public;
        if (input.public_username !== undefined) data.public_username = input.public_username;
        if (input.history_visible !== undefined) data.history_visible = input.history_visible;
        if (input.signatures_enabled !== undefined) {
            data.signatures_enabled = input.signatures_enabled;
        }
        if (input.is_public === false && input.public_username === undefined) {
            data.public_username = null;
        }
        return this.prisma.chat.update({ where: { id: chatId }, data });
    }

    async members(userId: number, chatId: number) {
        await assertManagementAccess(this.prisma, chatId, userId);
        return this.prisma.chatMember.findMany({
            where: { chat_id: chatId, deleted_at: null, user: { deleted_at: null } },
            select: {
                user_id: true,
                role: true,
                custom_title: true,
                admin_permissions: true,
                member_permissions: true,
                banned_until: true,
                created_at: true,
                user: {
                    select: {
                        login_id: true,
                        display_name: true,
                        active: true,
                        userAvatar: {
                            where: { deleted_at: null },
                            orderBy: { id: "desc" },
                            take: 1,
                            select: { avatar_file_name: true },
                        },
                    },
                },
            },
            orderBy: [{ role: "asc" }, { created_at: "asc" }],
        });
    }

    async addMembers(userId: number, chatId: number, userIds: number[]) {
        await assertManagementAccess(this.prisma, chatId, userId, "invite_users");
        const uniqueIds = [...new Set(userIds)];
        const count = await this.prisma.user.count({
            where: { id: { in: uniqueIds }, active: true, deleted_at: null },
        });
        if (count !== uniqueIds.length) throw new AppError("یک یا چند کاربر معتبر نیست", 400);

        await this.prisma.$transaction(
            uniqueIds.map((memberUserId) =>
                this.prisma.chatMember.upsert({
                    where: { chat_id_user_id: { chat_id: chatId, user_id: memberUserId } },
                    create: { chat_id: chatId, user_id: memberUserId, role: "member" },
                    update: { deleted_at: null },
                }),
            ),
        );
        return this.members(userId, chatId);
    }

    async updateMember(
        userId: number,
        chatId: number,
        targetUserId: number,
        input: MemberUpdateInput,
    ) {
        await assertManagementAccess(this.prisma, chatId, userId);
        const target = await this.prisma.chatMember.findUnique({
            where: { chat_id_user_id: { chat_id: chatId, user_id: targetUserId } },
            select: {
                id: true,
                role: true,
                deleted_at: true,
                chat: { select: { owner_id: true } },
            },
        });
        if (!target || target.deleted_at) throw new AppError("عضو پیدا نشد", 404);
        if (target.chat.owner_id === targetUserId || target.role === "owner") {
            throw new AppError("مالک قابل تنزل یا محدودسازی نیست", 403);
        }
        if (input.role === "owner") throw new AppError("انتقال مالکیت از این مسیر مجاز نیست", 400);

        const needsAdminControl =
            target.role === "admin" ||
            input.role === "admin" ||
            input.admin_permissions !== undefined ||
            input.custom_title !== undefined;
        const required = needsAdminControl ? "add_admins" : "ban_users";
        const actor = await assertManagementAccess(this.prisma, chatId, userId, required);

        if (actor.role !== "owner" && input.admin_permissions) {
            const actorPermissions =
                actor.admin_permissions && typeof actor.admin_permissions === "object"
                    ? (actor.admin_permissions as PermissionMap)
                    : {};
            const overGranted = ADMIN_PERMISSION_KEYS.some(
                (key) => input.admin_permissions?.[key] === true && actorPermissions[key] !== true,
            );
            if (overGranted)
                throw new AppError("نمی‌توانید مجوزی بالاتر از مجوز خود اعطا کنید", 403);
        }

        const data: Prisma.ChatMemberUpdateInput = {};
        if (input.role !== undefined) data.role = input.role;
        if (input.custom_title !== undefined) data.custom_title = input.custom_title;
        if (input.banned_until !== undefined) data.banned_until = input.banned_until;
        if (input.admin_permissions !== undefined) {
            data.admin_permissions =
                input.admin_permissions === null
                    ? Prisma.JsonNull
                    : (input.admin_permissions as Prisma.InputJsonValue);
        }
        if (input.member_permissions !== undefined) {
            data.member_permissions =
                input.member_permissions === null
                    ? Prisma.JsonNull
                    : (input.member_permissions as Prisma.InputJsonValue);
        }

        return this.prisma.chatMember.update({
            where: { id: target.id },
            data,
        });
    }

    async removeMember(userId: number, chatId: number, targetUserId: number) {
        await assertManagementAccess(this.prisma, chatId, userId);
        const target = await this.prisma.chatMember.findUnique({
            where: { chat_id_user_id: { chat_id: chatId, user_id: targetUserId } },
            select: {
                id: true,
                role: true,
                deleted_at: true,
                chat: { select: { owner_id: true } },
            },
        });
        if (!target || target.deleted_at) throw new AppError("عضو پیدا نشد", 404);
        if (target.chat.owner_id === targetUserId || target.role === "owner") {
            throw new AppError("مالک قابل حذف نیست", 403);
        }
        await assertManagementAccess(
            this.prisma,
            chatId,
            userId,
            target.role === "admin" ? "add_admins" : "ban_users",
        );
        await this.prisma.chatMember.update({
            where: { id: target.id },
            data: { deleted_at: new Date() },
        });
    }
}

export default ChatManagementService;
