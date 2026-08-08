import type { Tenant } from "../middlewares/tenantMiddleware.ts";

declare global {
    namespace Express {
        interface Request {
            userId?: number;
            sessionId?: number;
            tenant?: Tenant;
            permissions?: Record<string, boolean>;
        }
    }
}

export {};
