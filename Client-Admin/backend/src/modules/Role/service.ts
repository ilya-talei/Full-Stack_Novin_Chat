import { AppError } from "../../middlewares/errorMiddleware.js";
import type { Sequelize } from "sequelize";
import type { Models } from "../../database/models/index.js";

class RoleService {
    models?: Models;
    constructor(private sequelize: Sequelize) {}
    async index(page: number, limit: number) {
        if (page <= 0 || !Number.isInteger(page) || limit <= 0 || !Number.isInteger(limit)) {
            throw new AppError("نامعتبر", 400);
        }
        const offset = (page - 1) * limit;
        const roles = await this.models!.Role.findAndCountAll({
            limit,
            offset,
            order: [["created_at", "DESC"]],
        });
        return {
            data: roles.rows,
            total: roles.count,
            page,
            totalPages: Math.ceil(roles.count / limit),
        };
    }
    async create(data: { name: string; description?: string | null }) {
        const normalizedName = data.name.toLowerCase().trim();
        const existingRole = await this.models!.Role.findOne({
            where: { name: normalizedName },
        });
        if (existingRole) {
            throw new AppError("نقش قبلا ایجاد شده است", 409);
        }
        const role = await this.models!.Role.create({
            name: normalizedName,
            description: data.description ?? null,
        });
        return role;
    }

    async show(id: number) {
        const role = await this.models!.Role.findByPk(id);
        if (!role) {
            throw new AppError("نقش پیدا نشد", 404);
        } else {
            return role;
        }
    }
    async update(
        id: number,
        data: {
            name?: string | undefined;
            description?: string | null | undefined;
        },
    ) {
        const role = await this.models!.Role.findByPk(id);

        if (!role) {
            throw new AppError("نقش یافت نشد", 404);
        }

        const updateData: {
            name?: string;
            description?: string | null;
        } = {};

        if (data.name !== undefined) {
            const normalizedName = data.name.toLowerCase().trim();

            const existingRole = await this.models!.Role.findOne({
                where: { name: normalizedName },
            });

            if (existingRole && existingRole.id !== id) {
                throw new AppError("نقش قبلا ایجاد شده است", 409);
            }

            updateData.name = normalizedName;
        }

        if (data.description !== undefined) {
            updateData.description = data.description;
        }

        await role.update(updateData);

        return role;
    }

    async delete(id: number) {
        const role = await this.models!.Role.findByPk(id);
        if (!role) {
            throw new AppError("نقش یافت نشد", 404);
        }
        await role.destroy();
        return { message: "role deleted" };
    }
}

export default RoleService;
