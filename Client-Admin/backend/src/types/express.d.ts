import type Session from "../database/models/session.ts";
import type { Tenant } from "../middlewares/tenantMiddleware.ts";

declare global {
    namespace Express {
        interface Request {
            userId?: number;
            session?: Session;
            tenant?: Tenant;
            permissions?: Record<string, boolean>;
        }
    }
}

export {};
