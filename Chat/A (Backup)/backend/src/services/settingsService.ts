import type { PrismaClient } from "../generated/prisma/client.js";
import { DEFAULT_USER_PREFS, deepMergePrefs } from "../constants/defaultUserPrefs.js";

class SettingsService {
    constructor(private prisma: PrismaClient) {}

    async getPrefs(userId: number): Promise<Record<string, unknown>> {
        const row = await this.prisma.userSettings.findUnique({
            where: { user_id: userId },
        });

        if (!row) {
            const prefs = structuredClone(DEFAULT_USER_PREFS) as unknown as Record<string, unknown>;
            await this.prisma.userSettings.create({
                data: { user_id: userId, prefs },
            });
            return prefs;
        }

        return deepMergePrefs(
            structuredClone(DEFAULT_USER_PREFS) as unknown as Record<string, unknown>,
            (row.prefs ?? {}) as Record<string, unknown>,
        );
    }

    async updatePrefs(userId: number, patch: Record<string, unknown>) {
        const current = await this.getPrefs(userId);
        const next = deepMergePrefs(current, patch);

        await this.prisma.userSettings.upsert({
            where: { user_id: userId },
            create: { user_id: userId, prefs: next },
            update: { prefs: next },
        });

        return next;
    }

    async getPrivacy(userId: number) {
        const prefs = await this.getPrefs(userId);
        const privacy = (prefs.privacy ?? {}) as Record<string, unknown>;
        return {
            phoneVisibility: String(privacy.phoneVisibility ?? "contacts"),
            lastSeen: String(privacy.lastSeen ?? "everybody"),
            profilePhoto: String(privacy.profilePhoto ?? "everybody"),
            bio: String(privacy.bio ?? "everybody"),
            forwards: String(privacy.forwards ?? "everybody"),
            calls: String(privacy.calls ?? "everybody"),
            groups: String(privacy.groups ?? "everybody"),
            voiceMessages: String(privacy.voiceMessages ?? "everybody"),
            birthday: String(privacy.birthday ?? "contacts"),
            readReceipts: privacy.readReceipts !== false,
            inviteLink: privacy.inviteLink !== false,
        };
    }
}

export default SettingsService;
