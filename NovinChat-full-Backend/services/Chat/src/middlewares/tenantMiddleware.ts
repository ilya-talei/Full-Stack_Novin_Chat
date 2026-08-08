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
import type * as minio from "minio";

export interface Services {
    SocketService: SocketService;
    UserService: UserService;
    SessionService: SessionService;
    ChatService: ChatService;
    MessageService: MessageService;
    MinIOService: MinIOService;
}

type Enviroment = "production" | "development" | "test";

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
        };
    }

    injectDependencies() {
        this.services.ChatService.services = this.services;
        this.services.MessageService.services = this.services;
    }

    static async get(domain: string): Promise<Tenant> {
        let tenant = Tenant.cache.get(domain);
        if (!tenant) {
            const data = await managerService.getTenantByDomain(domain);
            tenant = await Tenant.create(data);
            Tenant.cache.set(domain, tenant);
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

    async closeCurrentConnection(){
        await this.prisma.$disconnect();
    }

    static async closeConnections() {
        const results = await Promise.allSettled(
            Array.from(this.cache.values(), (value) => value.closeCurrentConnection())
        );
        
        const failed = results.filter(r => r.status === 'rejected');
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
