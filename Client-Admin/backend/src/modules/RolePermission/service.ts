import type { Sequelize } from "sequelize";
import { AppError } from "../../middlewares/errorMiddleware.js";
import type PermissionService from "../Permission/service.js";
import type { Models } from "../../database/models/index.js";
import type Role from "../../database/models/role.js";

class RolePermissionService {
    models?: Models;
    constructor(
        private sequelize: Sequelize,
        private PermissionService: PermissionService,
    ) {}
    async index(roleId: number) {
        const existsRole: Role | null = await this.models!.Role.findByPk(roleId);
        if (!existsRole) {
            throw new AppError("نقش مورد نظر پیدا نشد", 404);
        }

        const rolePermissions = await this.models!.RolePermission.findAll({
            where: {
                role_id: roleId,
            },
            include: [
                {
                    model: this.models!.Permission,
                    as: "permission",
                    attributes: ["name"],
                },
            ],
            attributes: ["allow"],
        });

        return rolePermissions.map((rolePermission) => ({
            name: rolePermission.permission.name,
            allow: rolePermission.allow,
        }));
    }

    async assign(roleId: number, permissionName: string, allow: boolean) {
        const role: Role | null = await this.models!.Role.findByPk(roleId);
        if (!role) {
            throw new AppError("نقش مورد نظر پیدا نشد", 404);
        }
        await this.PermissionService.assignPermissionToRole(role, permissionName, allow);
    }

    async remove(roleId: number, permissionName: string) {
        const role: Role | null = await this.models!.Role.findByPk(roleId);
        if (!role) {
            throw new AppError("نقش مورد نظر پیدا نشد", 404);
        }

        await this.PermissionService.removePermissionFromRole(role, permissionName);
    }
}

export default RolePermissionService;
