import type { PrismaClient } from "../generated/prisma/client.js";
import { AppError } from "../middlewares/errorMiddleware.js";
import type { Services } from "../middlewares/tenantMiddleware.js";

class ContactService {
    public services?: Services;
    constructor(private prisma: PrismaClient) {}

    private async applyPrivacy(
        viewerId: number,
        contactUserId: number,
        mapped: {
            id: string;
            contactRowId: string;
            name: string;
            phone: string;
            email?: string;
            username: string;
            online: boolean;
            blocked: boolean;
            avatar: string | null;
            last_login_at?: Date | null;
        },
    ) {
        if (!this.services?.SettingsService) return mapped;
        const privacy = await this.services.SettingsService.getPrivacy(contactUserId);
        // viewer is in target's contacts list if target has viewer as contact
        const reverse = await this.prisma.contact.findFirst({
            where: {
                user_id: contactUserId,
                contact_user_id: viewerId,
                deleted_at: null,
                blocked: false,
            },
            select: { id: true },
        });
        const contactOk = Boolean(reverse);
        const allow = (level: string) => {
            if (level === "everybody") return true;
            if (level === "contacts") return contactOk;
            return false;
        };

        return {
            ...mapped,
            phone: allow(privacy.phoneVisibility) ? mapped.phone : "",
            avatar: allow(privacy.profilePhoto) ? mapped.avatar : null,
            online: allow(privacy.lastSeen) ? mapped.online : false,
        };
    }

    private mapContact(
        row: {
            id: number;
            blocked: boolean;
            contact: {
                id: number;
                login_id: string;
                display_name: string | null;
                phone: string | null;
                email: string | null;
                last_login_at: Date;
                userAvatar: { avatar_file_name: string }[];
            };
        },
        onlineUserIds: Set<number>,
    ) {
        const name = row.contact.display_name || row.contact.login_id;
        return {
            id: String(row.contact.id),
            contactRowId: String(row.id),
            name,
            phone: row.contact.phone ?? "",
            email: row.contact.email ?? undefined,
            username: row.contact.login_id,
            online: onlineUserIds.has(row.contact.id),
            blocked: row.blocked,
            avatar: row.contact.userAvatar[0]?.avatar_file_name ?? null,
            last_login_at: row.contact.last_login_at,
        };
    }

    async list(userId: number, onlineUserIds: Set<number> = new Set()) {
        const rows = await this.prisma.contact.findMany({
            where: {
                user_id: userId,
                deleted_at: null,
                contact: { deleted_at: null, active: true },
            },
            orderBy: { created_at: "desc" },
            select: {
                id: true,
                blocked: true,
                contact: {
                    select: {
                        id: true,
                        login_id: true,
                        display_name: true,
                        phone: true,
                        email: true,
                        last_login_at: true,
                        userAvatar: {
                            where: { deleted_at: null },
                            take: 1,
                            orderBy: { id: "desc" },
                            select: { avatar_file_name: true },
                        },
                    },
                },
            },
        });

        return Promise.all(
            rows.map(async (row) => {
                const mapped = this.mapContact(row, onlineUserIds);
                return this.applyPrivacy(userId, row.contact.id, mapped);
            }),
        );
    }

    async add(userId: number, targetUserId: number) {
        if (userId === targetUserId) {
            throw new AppError("نمی‌توانید خودتان را اضافه کنید", 400);
        }

        const target = await this.prisma.user.findFirst({
            where: { id: targetUserId, active: true, deleted_at: null },
        });
        if (!target) {
            throw new AppError("کاربر یافت نشد", 404);
        }

        const existing = await this.prisma.contact.findFirst({
            where: {
                user_id: userId,
                contact_user_id: targetUserId,
            },
        });

        if (existing && !existing.deleted_at) {
            throw new AppError("این مخاطب قبلاً اضافه شده است", 409);
        }

        const row = existing
            ? await this.prisma.contact.update({
                  where: { id: existing.id },
                  data: { deleted_at: null, blocked: false },
                  include: {
                      contact: {
                          select: {
                              id: true,
                              login_id: true,
                              display_name: true,
                              phone: true,
                              email: true,
                              last_login_at: true,
                              userAvatar: {
                                  where: { deleted_at: null },
                                  take: 1,
                                  orderBy: { id: "desc" },
                                  select: { avatar_file_name: true },
                              },
                          },
                      },
                  },
              })
            : await this.prisma.contact.create({
                  data: {
                      user_id: userId,
                      contact_user_id: targetUserId,
                  },
                  include: {
                      contact: {
                          select: {
                              id: true,
                              login_id: true,
                              display_name: true,
                              phone: true,
                              email: true,
                              last_login_at: true,
                              userAvatar: {
                                  where: { deleted_at: null },
                                  take: 1,
                                  orderBy: { id: "desc" },
                                  select: { avatar_file_name: true },
                              },
                          },
                      },
                  },
              });

        return this.mapContact(
            {
                id: row.id,
                blocked: row.blocked,
                contact: row.contact,
            },
            new Set(),
        );
    }

    async addByLoginId(userId: number, loginId: string) {
        const target = await this.prisma.user.findFirst({
            where: { login_id: loginId.trim(), active: true, deleted_at: null },
        });
        if (!target) {
            throw new AppError("کاربر یافت نشد", 404);
        }
        return this.add(userId, target.id);
    }

    async remove(userId: number, contactUserId: number) {
        const result = await this.prisma.contact.updateMany({
            where: {
                user_id: userId,
                contact_user_id: contactUserId,
                deleted_at: null,
            },
            data: { deleted_at: new Date() },
        });
        if (result.count === 0) {
            throw new AppError("مخاطب یافت نشد", 404);
        }
        return { success: true, id: String(contactUserId) };
    }

    async block(userId: number, contactUserId: number) {
        const existing = await this.prisma.contact.findFirst({
            where: {
                user_id: userId,
                contact_user_id: contactUserId,
            },
        });

        if (!existing || existing.deleted_at) {
            await this.add(userId, contactUserId);
        }

        await this.prisma.contact.updateMany({
            where: {
                user_id: userId,
                contact_user_id: contactUserId,
            },
            data: { blocked: true, deleted_at: null },
        });

        return { success: true, id: String(contactUserId), blocked: true };
    }

    async search(userId: number, query: string, onlineUserIds: Set<number> = new Set()) {
        const q = query.trim();
        if (!q) return [];

        const users = await this.prisma.user.findMany({
            where: {
                id: { not: userId },
                active: true,
                deleted_at: null,
                OR: [
                    { login_id: { contains: q, mode: "insensitive" } },
                    { display_name: { contains: q, mode: "insensitive" } },
                    { phone: { contains: q } },
                    { email: { contains: q, mode: "insensitive" } },
                ],
            },
            take: 20,
            select: {
                id: true,
                login_id: true,
                display_name: true,
                phone: true,
                email: true,
                last_login_at: true,
                userAvatar: {
                    where: { deleted_at: null },
                    take: 1,
                    orderBy: { id: "desc" },
                    select: { avatar_file_name: true },
                },
            },
        });

        const contactIds = new Set(
            (
                await this.prisma.contact.findMany({
                    where: {
                        user_id: userId,
                        deleted_at: null,
                        contact_user_id: { in: users.map((u) => u.id) },
                    },
                    select: { contact_user_id: true, blocked: true },
                })
            ).map((c) => c.contact_user_id),
        );

        return users.map((user) => ({
            id: String(user.id),
            name: user.display_name || user.login_id,
            phone: user.phone ?? "",
            email: user.email ?? undefined,
            username: user.login_id,
            online: onlineUserIds.has(user.id),
            blocked: false,
            isContact: contactIds.has(user.id),
            avatar: user.userAvatar[0]?.avatar_file_name ?? null,
        }));
    }
}

export default ContactService;
