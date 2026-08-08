import type { Request, Response, NextFunction } from "express";
import type { Options } from "sequelize";
import { Sequelize } from "sequelize";
import config from "../config/database.js";
import ModelsFactory from "../database/models/index.js";
import type { Models } from "../database/models/index.js";
import UserService from "../modules/User/service.js";
import UserPermissionService from "../modules/UserPermission/service.js";
import AuthService from "../modules/Auth/service.js";
import PermissionService from "../modules/Permission/service.js";
import ProfileService from "../modules/Profile/service.js";
import RoleService from "../modules/Role/service.js";
import RolePermissionService from "../modules/RolePermission/service.js";
import type { TenantData } from "../modules/Manager/service.js";
import managerService from "../modules/Manager/service.js";

export interface Services {
    auth: AuthService;
    permission: PermissionService;
    profile: ProfileService;
    role: RoleService;
    rolePermission: RolePermissionService;
    user: UserService;
    userPermission: UserPermissionService;
}

type Enviroment = "production" | "development" | "test";

export class Tenant {
    private static cache = new Map<string, Tenant>();

    data: TenantData;
    dbOptions: Options;
    sequelize: Sequelize;
    models: Models;
    services: Services;
    constructor(data: TenantData) {
        this.data = data;
        this.dbOptions = this.buildDbOptions();
        this.sequelize = new Sequelize(this.dbOptions);
        this.services = this.buildServices();
        this.models = ModelsFactory(this.sequelize, this.services);
        this.injectServices(this.models);
    }

    buildServices(): Services {
        const permission = new PermissionService(this.sequelize);
        return {
            auth: new AuthService(this.sequelize, this.data.id),
            permission,
            profile: new ProfileService(),
            role: new RoleService(this.sequelize),
            rolePermission: new RolePermissionService(this.sequelize, permission),
            user: new UserService(this.sequelize),
            userPermission: new UserPermissionService(this.sequelize, permission),
        };
    }

    injectServices(models: Models): void {
        this.services.auth.models = models;
        this.services.permission.models = models;
        this.services.role.models = models;
        this.services.rolePermission.models = models;
        this.services.user.models = models;
        this.services.userPermission.models = models;
    }

    static async get(domain: string): Promise<Tenant> {
        let tenant = Tenant.cache.get(domain);
        if (!tenant) {
            const data = await managerService.getTenantByDomain(domain);
            tenant = new Tenant(data);
            Tenant.cache.set(domain, tenant);
        }

        return tenant;
    }

    buildDbOptions(): Options {
        const env: Enviroment = (process.env.NODE_ENV as Enviroment) || "development";
        return {
            ...config[env],
            database: this.data.db_name,
        };
    }
}

const TenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const host = req.hostname;
        const domain = host.split(":")[0]!;
        const tenant = await Tenant.get(domain);
        req.tenant = tenant;
        req.log = req.log.child({ tenantId: tenant.data.id });
        next();
    } catch (error: unknown) {
        next(error);
    }
};

export default TenantMiddleware;
