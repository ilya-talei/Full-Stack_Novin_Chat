import type { Request, Response, NextFunction } from "express";
import type { TenantData } from "../services/managerService.js";
import managerService from "../services/managerService.js";
import config from "../config/database.js";
import { AppError } from "./errorMiddleware.js";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import SocketService from "../services/socketService.js";
import UserService from "../services/userService.js";
import SessionService from "../services/sessionService.js";
import ChatService from "../services/chatService.js";
import MessageService from "../services/messageService.js";
import MinIOService from "../services/minIoService.js";
import ContactService from "../services/contactService.js";
import NotificationService from "../services/notificationService.js";
import SettingsService from "../services/settingsService.js";
import type * as minio from "minio";

export interface Services {
    SocketService: SocketService;
    UserService: UserService;
    SessionService: SessionService;
    ChatService: ChatService;
    MessageService: MessageService;
    MinIOService: MinIOService;
    ContactService: ContactService;
    NotificationService: NotificationService;
    SettingsService: SettingsService;
}

type Enviroment = "production" | "development" | "test";

function isLocalMode() {
    return process.env.LOCAL_MODE === "true";
}

function getLocalTenantData(): TenantData {
    return {
        id: Number(process.env.LOCAL_TENANT_ID ?? 1),
        name: process.env.LOCAL_TENANT_NAME ?? "Local Dev",
        domain: process.env.LOCAL_TENANT_DOMAIN ?? "localhost",
        db_name: process.env.LOCAL_TENANT_DB_NAME ?? process.env.DATABASE_NAME ?? "novin_chat",
        active: true,
        created_at: new Date(),
        minio: {
            endpoint: process.env.LOCAL_MINIO_ENDPOINT ?? "127.0.0.1",
            port: Number(process.env.LOCAL_MINIO_PORT ?? 9000),
            accessKey: process.env.LOCAL_MINIO_ACCESS_KEY ?? "minioadmin",
            secretKey: process.env.LOCAL_MINIO_SECRET_KEY ?? "minioadmin",
            pathStyle: true,
        },
    };
}

export class Tenant {
    private static cache = new Map<string, Tenant>();

    data: TenantData;
    dbString: string;
    prisma: PrismaClient;
    services!: Services;
    minio!: minio.Client;
    private constructor(data: TenantData) {
        this.data = data;
        this.dbString = this.buildDbString();
        this.prisma = this.getPrismaClient();
    }

    static async create(data: TenantData) {
        const tenant = new Tenant(data);

        tenant.minio = await MinIOService.get(data.minio, data.id);

        tenant.services = tenant.buildServices();
        tenant.injectDependencies();

        return tenant;
    }

    buildServices(): Services {
        return {
            SocketService: new SocketService(),
            UserService: new UserService(this.prisma),
            SessionService: new SessionService(this.prisma),
            ChatService: new ChatService(this.prisma),
            MessageService: new MessageService(this.prisma),
            MinIOService: new MinIOService(this.minio, this),
            ContactService: new ContactService(this.prisma),
            NotificationService: new NotificationService(this.prisma),
            SettingsService: new SettingsService(this.prisma),
        };
    }

    injectDependencies() {
        this.services.ChatService.services = this.services;
        this.services.MessageService.services = this.services;
        this.services.UserService.services = this.services;
        this.services.ContactService.services = this.services;
        this.services.SocketService.servies = this.services;
    }

    static async get(domain: string): Promise<Tenant> {
        const normalizedDomain = domain.split(":")[0] || domain;
        let tenant = Tenant.cache.get(normalizedDomain);
        if (!tenant) {
            const data = isLocalMode()
                ? getLocalTenantData()
                : await managerService.getTenantByDomain(normalizedDomain);
            tenant = await Tenant.create(data);
            Tenant.cache.set(normalizedDomain, tenant);
            if (isLocalMode()) {
                Tenant.cache.set("localhost", tenant);
                Tenant.cache.set("127.0.0.1", tenant);
            }
        }
        return tenant;
    }

    buildDbString(): string {
        const nodeEnv = process.env.NODE_ENV;
        const env: Enviroment =
            nodeEnv === "production" || nodeEnv === "test" ? nodeEnv : "development";

        const db = config[env];
        const password = encodeURIComponent(db.password);
        const dbName = encodeURIComponent(this.data.db_name);

        return `postgresql://${db.username}:${password}@${db.host}:${db.port}/${dbName}?schema=public`;
    }

    getPrismaClient(): PrismaClient {
        const adapter = new PrismaPg({ connectionString: this.dbString });
        return new PrismaClient({ adapter });
    }

    async closeCurrentConnection() {
        await this.prisma.$disconnect();
    }

    static async closeConnections() {
        const results = await Promise.allSettled(
            Array.from(this.cache.values(), (value) => value.closeCurrentConnection()),
        );

        const failed = results.filter((r) => r.status === "rejected");
        if (failed.length > 0) {
            console.error(`Failed to close ${failed.length} connection(s):`, failed);
        }
    }
}

const TenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const domain = req.hostname;
        if (!domain) {
            throw new AppError("دامنه درخواست نامعتبر است", 400);
        }

        const tenant = await Tenant.get(domain);
        if (!tenant.data.active) {
            throw new AppError("این مستاجر غیرفعال است", 403);
        }

        req.tenant = tenant;
        next();
    } catch (err) {
        next(err);
    }
};

export default TenantMiddleware;
