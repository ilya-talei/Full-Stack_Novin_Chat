import Permission from "../../database/models/permission.js";
import { AppError } from "../../middlewares/errorMiddleware.js";
import PermissionService from "../Permission/service.js";
import Role from "../../database/models/role.js";
import RolePermission from "../../database/models/rolePermissions.js";

class RolePermissionService {
    static async index(roleId: number) {
        const existsRole: Role | null = await Role.findByPk(roleId);
        if (!existsRole) {
            throw new AppError("نقش مورد نظر پیدا نشد", 404);
        }

        const permissions = await RolePermission.findAll({
            where: {
                role_id: roleId,
            },
            include: [
                {
                    model: Permission,
                    attributes: ["name"],
                },
            ],
            attributes: ["allow"],
        });

        return permissions.map((permission) => ({
            name: permission.Permission.name,
            allow: permission.allow,
        }));
    }

    static async assign(roleId: number, permissionName: string, allow: boolean) {
        const role: Role | null = await Role.findByPk(roleId);
        if (!role) {
            throw new AppError("نقش مورد نظر پیدا نشد", 404);
        }
        await PermissionService.assignPermissionToRole(role, permissionName, allow);
    }

    static async remove(roleId: number, permissionName: string) {
        const role: Role | null = await Role.findByPk(roleId);
        if (!role) {
            throw new AppError("نقش مورد نظر پیدا نشد", 404);
        }

        await PermissionService.removePermissionFromRole(role, permissionName);
    }
}

export default RolePermissionService;
