import { AppError } from "../../middlewares/errorMiddleware.js";
import logger from "../../config/pino.js";

export interface TenantData {
    id: number;
    name: string;
    domain: string;
    db_name: string;
    active: boolean;
    created_at: Date;
}

// Manager-issued JWTs live for 5 minutes; refresh a little early to avoid
// racing the expiry on in-flight requests.
const TOKEN_TTL_MS = 5 * 60 * 1000;
const TOKEN_SKEW_MS = 10 * 1000;

/**
 * App-global client for the manager service. Owns the lifecycle of the manager
 * JWT (fetched from `/services/token` with SECRET_KEY) and exposes tenant
 * lookups. A single cached token is shared across all tenants/requests.
 */
class ManagerService {
    private token: string | null = null;
    private tokenExpiresAt = 0;
    private inflightToken: Promise<string> | null = null;

    private get baseUrl(): string {
        const baseUrl = process.env.MANAGER_BASE_URL;
        if (baseUrl === undefined) {
            throw new AppError("سرویس مدیریت پیکربندی نشده است", 500);
        }
        return baseUrl;
    }

    /**
     * Return a valid manager JWT, reusing the cached token until it nears its
     * 5-minute expiry. Concurrent callers share a single refresh.
     */
    async getToken(): Promise<string> {
        if (this.token !== null && Date.now() < this.tokenExpiresAt) {
            return this.token;
        }
        if (!this.inflightToken) {
            this.inflightToken = this.refreshToken().finally(() => {
                this.inflightToken = null;
            });
        }
        return this.inflightToken;
    }

    private async refreshToken(): Promise<string> {
        const secretKey = process.env.SECRET_KEY;
        if (secretKey === undefined) {
            throw new AppError("سرویس مدیریت پیکربندی نشده است", 500);
        }

        const response = await fetch(`${this.baseUrl}/services/token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ secret: secretKey }),
        });

        if (!response.ok) {
            logger.error({ status: response.status }, "manager token request failed");
            throw new AppError("دریافت توکن از سرویس مدیریت ناموفق بود", 502);
        }

        const body = (await response.json()) as { token?: string };
        if (body.token === undefined) {
            throw new AppError("پاسخ سرویس مدیریت نامعتبر است", 502);
        }

        this.token = body.token;
        this.tokenExpiresAt = Date.now() + TOKEN_TTL_MS - TOKEN_SKEW_MS;
        return this.token;
    }

    /**
     * Look up a tenant's configuration by its domain.
     */
    async getTenantByDomain(domain: string): Promise<TenantData> {
        const token = await this.getToken();

        const url = new URL(`${this.baseUrl}/services/tenants`);
        url.searchParams.set("domain", domain);

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (response.status === 404) {
            throw new AppError("مستاجر یافت نشد", 404);
        }
        if (!response.ok) {
            logger.error({ status: response.status, domain }, "manager tenant request failed");
            throw new AppError("دریافت اطلاعات مستاجر ناموفق بود", 502);
        }

        const body = (await response.json()) as TenantData;
        if (!body.db_name) {
            throw new AppError("اطلاعات مستاجر نامعتبر است", 502);
        }

        return body;
    }
}

const managerService = new ManagerService();
export default managerService;
