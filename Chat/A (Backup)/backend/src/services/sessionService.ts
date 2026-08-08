import type { PrismaClient, Session } from "../generated/prisma/client.js";

function parseUserAgent(ua: string | null | undefined) {
    const raw = ua || "Unknown";
    let platform = "Web";
    if (/Windows/i.test(raw)) platform = "Windows";
    else if (/Mac OS|Macintosh/i.test(raw)) platform = "macOS";
    else if (/Android/i.test(raw)) platform = "Android";
    else if (/iPhone|iPad|iOS/i.test(raw)) platform = "iOS";
    else if (/Linux/i.test(raw)) platform = "Linux";

    let name = "Novin Chat Web";
    if (/Chrome\//i.test(raw) && !/Edg\//i.test(raw)) name = "Chrome";
    else if (/Edg\//i.test(raw)) name = "Edge";
    else if (/Firefox\//i.test(raw)) name = "Firefox";
    else if (/Safari\//i.test(raw) && !/Chrome\//i.test(raw)) name = "Safari";

    return { name, platform };
}

class SessionService {
    constructor(private prismaClient: PrismaClient) {}

    async getSessionById(sessionId: number): Promise<Session | null> {
        return await this.prismaClient.session.findUnique({
            where: {
                id: sessionId,
            },
        });
    }

    async listActiveSessions(userId: number, currentSessionId: number) {
        const rows = await this.prismaClient.session.findMany({
            where: {
                user_id: userId,
                active: true,
                expire_at: { gt: new Date() },
            },
            orderBy: { created_at: "desc" },
        });

        return rows.map((s) => {
            const parsed = parseUserAgent(s.user_agent);
            const isCurrent = s.id === currentSessionId;
            return {
                id: String(s.id),
                name: parsed.name,
                platform: parsed.platform,
                location: s.ip_address || "محلی",
                active: true,
                isCurrent,
                lastActive: isCurrent ? "آنلاین" : s.created_at.toISOString(),
                createdAt: s.created_at,
                expireAt: s.expire_at,
            };
        });
    }

    async terminateOtherSessions(userId: number, currentSessionId: number) {
        const result = await this.prismaClient.session.updateMany({
            where: {
                user_id: userId,
                active: true,
                id: { not: currentSessionId },
            },
            data: { active: false },
        });
        return { success: true, terminated: result.count };
    }
}

export default SessionService;
