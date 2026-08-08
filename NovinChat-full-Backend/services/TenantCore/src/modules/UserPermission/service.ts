import { AppError } from "../../middlewares/errorMiddleware.js";
import type PermissionService from "../Permission/service.js";
import type { Sequelize } from "sequelize";
import type { Models } from "../../database/models/index.js";
import type User from "../../database/models/user.js";

class UserPermissionService {
    models?: Models;
    constructor(
        private sequelize: Sequelize,
        private PermissionService: PermissionService,
    ) {}
    async index(userId: number) {
        const existsUser: User | null = await this.models!.User.findByPk(userId);
        if (!existsUser) {
            throw new AppError("کاربر مورد نظر پیدا نشد", 404);
        }

        const userPermissions = await this.models!.UserPermission.findAll({
            where: {
                user_id: userId,
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

        return userPermissions.map((userPermission) => ({
            name: userPermission.permission.name,
            allow: userPermission.allow,
        }));
    }

    async assign(userId: number, permissionName: string, allow: boolean) {
        const user: User | null = await this.models!.User.findByPk(userId);
        if (!user) {
            throw new AppError("کاربر مورد نظر پیدا نشد", 404);
        }
        await this.PermissionService.assignPermissionToUser(user, permissionName, allow);
    }

    async remove(userId: number, permissionName: string) {
        const user: User | null = await this.models!.User.findByPk(userId);
        if (!user) {
            throw new AppError("کاربر مورد نظر پیدا نشد", 404);
        }

        await this.PermissionService.removePermissionFromUser(user, permissionName);
    }
}

export default UserPermissionService;
