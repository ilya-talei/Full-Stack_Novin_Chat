import type Session from "../database/models/session.ts";

declare global {
    namespace Express {
        interface Request {
            userId?: number;
            session?: Session;
            serviceId: number;
            serviceName: string;
        }
    }
}

export {};
