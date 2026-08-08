import type { PrismaClient, User } from "../generated/prisma/client.js";
import { AppError } from "../middlewares/errorMiddleware.js";
import sharp from "sharp";
import bcrypt from "bcrypt";
import type { Services } from "../middlewares/tenantMiddleware.js";

class UserService {
    public services?: Services;
    constructor(private prismaClient: PrismaClient) {}

    async getUserById(userId: number): Promise<User | null> {
        return await this.prismaClient.user.findUnique({
            where: {
                deleted_at: null,
                id: userId,
            },
        });
    }

    async getProfile(userId: number) {
        const user = await this.prismaClient.user.findFirst({
            where: { id: userId, deleted_at: null },
            select: {
                id: true,
                login_id: true,
                display_name: true,
                email: true,
                phone: true,
                bio: true,
                last_login_at: true,
                userAvatar: {
                    where: { deleted_at: null },
                    take: 1,
                    orderBy: { id: "desc" },
                    select: { avatar_file_name: true },
                },
            },
        });

        if (!user) {
            throw new AppError("کاربر یافت نشد", 404);
        }

        return {
            id: String(user.id),
            username: user.login_id,
            name: user.display_name || user.login_id,
            email: user.email ?? `${user.login_id}@local.dev`,
            phone: user.phone,
            bio: user.bio,
            avatar: user.userAvatar[0]?.avatar_file_name ?? null,
            last_login_at: user.last_login_at,
            status: "online" as const,
        };
    }

    /**
     * Public view of a user's profile for a viewer, applying privacy prefs of the target.
     */
    async getPublicProfile(viewerId: number, targetUserId: number) {
        const profile = await this.getProfile(targetUserId);
        if (viewerId === targetUserId) return profile;

        const privacy = await this.services!.SettingsService.getPrivacy(targetUserId);
        const isContact = await this.prismaClient.contact.findFirst({
            where: {
                user_id: targetUserId,
                contact_user_id: viewerId,
                deleted_at: null,
                blocked: false,
            },
            select: { id: true },
        });
        const contactOk = Boolean(isContact);

        const allow = (level: string) => {
            if (level === "everybody") return true;
            if (level === "contacts") return contactOk;
            return false;
        };

        return {
            ...profile,
            phone: allow(privacy.phoneVisibility) ? profile.phone : null,
            bio: allow(privacy.bio) ? profile.bio : "",
            avatar: allow(privacy.profilePhoto) ? profile.avatar : null,
            last_login_at: allow(privacy.lastSeen) ? profile.last_login_at : null,
            status: allow(privacy.lastSeen) ? profile.status : ("unknown" as const),
            can_call: allow(privacy.calls),
            can_add_to_groups: allow(privacy.groups),
            can_forward: allow(privacy.forwards),
            can_send_voice: allow(privacy.voiceMessages),
            invite_link_enabled: privacy.inviteLink !== false,
        };
    }

    async updateProfile(
        userId: number,
        data: {
            display_name?: string;
            email?: string | null;
            phone?: string | null;
            bio?: string;
            login_id?: string;
        },
    ) {
        if (data.login_id) {
            const taken = await this.prismaClient.user.findFirst({
                where: {
                    login_id: data.login_id,
                    id: { not: userId },
                    deleted_at: null,
                },
                select: { id: true },
            });
            if (taken) {
                throw new AppError("این نام کاربری قبلاً گرفته شده است", 409);
            }
        }

        await this.prismaClient.user.update({
            where: { id: userId },
            data: {
                ...(data.display_name !== undefined ? { display_name: data.display_name } : {}),
                ...(data.email !== undefined ? { email: data.email } : {}),
                ...(data.phone !== undefined ? { phone: data.phone } : {}),
                ...(data.bio !== undefined ? { bio: data.bio } : {}),
                ...(data.login_id !== undefined ? { login_id: data.login_id } : {}),
            },
        });

        if (data.login_id || data.display_name !== undefined || data.bio !== undefined) {
            const prefsPatch: Record<string, unknown> = { profile: {} as Record<string, unknown> };
            const profilePatch = prefsPatch.profile as Record<string, unknown>;
            if (data.login_id) profilePatch.username = data.login_id;
            if (data.bio !== undefined) profilePatch.bio = data.bio;
            if (data.display_name) {
                const parts = data.display_name.trim().split(/\s+/);
                profilePatch.firstName = parts[0] || "";
                profilePatch.lastName = parts.slice(1).join(" ");
            }
            await this.services?.SettingsService.updatePrefs(userId, prefsPatch);
        }

        return this.getProfile(userId);
    }

    async changePassword(userId: number, currentPassword: string, newPassword: string) {
        const user = await this.getUserById(userId);
        if (!user) {
            throw new AppError("کاربر یافت نشد", 404);
        }

        const ok = await bcrypt.compare(currentPassword, user.hashed_password);
        if (!ok) {
            throw new AppError("رمز فعلی اشتباه است", 400);
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await this.prismaClient.user.update({
            where: { id: userId },
            data: { hashed_password: hashed },
        });

        return { success: true };
    }

    updateUserById(userId: number, data: object) {
        return this.prismaClient.user.update({
            where: {
                id: userId,
                deleted_at: null,
            },
            data: data,
        });
    }

    async createUserAvatar(userId: number, fileName: string) {
        await this.prismaClient.userAvatar.create({
            data: {
                user_id: userId,
                avatar_file_name: fileName,
            },
        });
    }

    async uploadAvatar(file: Express.Multer.File, userId: number) {
        const user = await this.prismaClient.user.findFirst({
            where: {
                id: userId,
                deleted_at: null,
            },
        });
        if (!user) {
            throw new AppError("کاربر مورد نظر پیدا نشد", 404);
        }

        const sharpedImage = await sharp(file.buffer)
            .autoOrient()
            .resize({ width: 512, height: 512, fit: "cover" })
            .webp({
                quality: 80,
            })
            .toBuffer();

        const fileName = await this.services!.MinIOService.uploadUserAvatar(sharpedImage, userId);
        await this.createUserAvatar(userId, fileName);
        return fileName;
    }

    async deleteAccount(userId: number) {
        const user = await this.prismaClient.user.findFirst({
            where: { id: userId, deleted_at: null },
            select: { id: true },
        });
        if (!user) {
            throw new AppError("کاربر یافت نشد", 404);
        }

        const now = new Date();
        await this.prismaClient.$transaction([
            this.prismaClient.user.update({
                where: { id: userId },
                data: {
                    deleted_at: now,
                    active: false,
                    login_id: `deleted_${userId}_${Date.now()}`,
                    phone: null,
                    email: null,
                    bio: "",
                    display_name: "حساب حذف‌شده",
                },
            }),
            this.prismaClient.session.updateMany({
                where: { user_id: userId, active: true },
                data: { active: false },
            }),
        ]);

        return { success: true };
    }
}

export default UserService;
