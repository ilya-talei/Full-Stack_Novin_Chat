import type { PrismaClient, Session } from "../generated/prisma/client.js";

class SessionService {
    constructor(private prismaClient: PrismaClient) {}

    async getSessionById(sessionId: number): Promise<Session | null> {
        return await this.prismaClient.session.findUnique({
            where: {
                id: sessionId,
            },
        });
    }
}

export default SessionService;
