import Tenant from "../../database/models/tenant.js";
import { Op } from "sequelize";
import { AppError } from "../../middlewares/errorMiddleware.js";
import Subscription from "../../database/models/subscription.js";
import Product from "../../database/models/product.js";
import type { createValidationType, updateValidationType } from "./controller.js";

class TenantService {
    static async index(page: number, limit: number, search: string) {
        const offset: number = (page - 1) * limit;

        const tenants = await Tenant.findAndCountAll({
            where: {
                [Op.or]: [
                    {
                        name: {
                            [Op.like]: `%${search}%`,
                        },
                    },
                    {
                        domain: {
                            [Op.like]: `%${search}%`,
                        },
                    },
                ],
            },
            offset: offset,
            limit: limit,
            order: [["created_at", "DESC"]],
        });
        return tenants;
    }

    static async show(id: number) {
        const tenant = await Tenant.findByPk(id);
        return tenant;
    }

    static async showMyTenant(userId: number, tenantId: number) {
        const tenant: Tenant | null = await Tenant.findOne({
            where: {
                creator_id: userId,
                id: tenantId,
            },
            include: [
                {
                    model: Subscription,
                    attributes: ["status", "start_date", "end_date"],
                    include: [
                        {
                            model: Product,
                            attributes: ["id", "name"],
                        },
                    ],
                },
            ],
            attributes: ["name", "domain", "active", "created_at"],
        });

        if (!tenant) {
            throw new AppError("مستاجر مورد نظر پیدا نشد", 404);
        }

        return tenant.toJSON();
    }

    static async myTenants(userId: number, page: number, limit: number, search: string) {
        const offset: number = (page - 1) * limit;

        const tenants = await Tenant.findAndCountAll({
            where: {
                creator_id: userId,
                [Op.or]: [
                    {
                        name: {
                            [Op.like]: `%${search}%`,
                        },
                    },
                    {
                        domain: {
                            [Op.like]: `%${search}%`,
                        },
                    },
                ],
            },
            offset: offset,
            limit: limit,
            order: [["created_at", "DESC"]],
        });
        return tenants;
    }

    static async showByDomain(domain: string) {
        const tenant: Tenant | null = await Tenant.findOne({
            where: {
                domain: domain,
                active: true,
            },
            include: [
                {
                    model: Subscription,
                    attributes: ["status", "start_date", "end_date"],
                    include: [
                        {
                            model: Product,
                            attributes: ["id", "name"],
                        },
                    ],
                },
            ],
            attributes: ["id", "name", "domain", "db_name", "minio", "active", "created_at"],
        });

        if (!tenant) {
            throw new AppError("مستاجر مورد نظر پیدا نشد", 404);
        }

        return tenant.toJSON();
    }

    static async create(tenantData: createValidationType) {
        const data = {
            name: tenantData.name,
            domain: tenantData.domain,
            db_name: tenantData.db_name,
            minio: tenantData.minio,
            creator_id: tenantData.creator_id ?? null,
            active: tenantData.active ?? true,
        };
        const tenant = await Tenant.create(data);
        const t = tenant.get({ plain: true });
        const { id, name, domain, db_name, minio, creator_id, active, created_at, updated_at } = t;
        return { id, name, domain, db_name, minio, creator_id, active, created_at, updated_at };
    }

    static async update(id: number, tenantData: updateValidationType) {
        const tenant = await Tenant.findByPk(id);
        if (!tenant) {
            throw new AppError("مستاجر مورد نظر پیدا نشد", 404);
        }

        const filteredTenantData = Object.fromEntries(
            Object.entries(tenantData).filter(([_key, value]) => {
                return value !== undefined;
            }),
        );

        await tenant.update(filteredTenantData);
        const t = tenant.get({ plain: true });
        const {
            id: tid,
            name,
            domain,
            db_name,
            minio,
            creator_id,
            active,
            created_at,
            updated_at,
        } = t;
        return {
            id: tid,
            name,
            domain,
            db_name,
            minio,
            creator_id,
            active,
            created_at,
            updated_at,
        };
    }

    static async delete(id: number) {
        const tenant = await Tenant.findByPk(id);
        if (!tenant) {
            throw new AppError("مستاجر مورد نظر پیدا نشد", 404);
        }
        await tenant.destroy();
        return;
    }
}

export default TenantService;
