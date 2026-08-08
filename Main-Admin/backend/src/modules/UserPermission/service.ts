import User from "../../database/models/user.js";
import UserPermission from "../../database/models/userPermission.js";
import Permission from "../../database/models/permission.js";
import { AppError } from "../../middlewares/errorMiddleware.js";
import PermissionService from "../Permission/service.js";

class UserPermissionService {
    static async index(userId: number) {
        const existsUser: User | null = await User.findByPk(userId);
        if (!existsUser) {
            throw new AppError("کاربر مورد نظر پیدا نشد", 404);
        }

        const permissions = await UserPermission.findAll({
            where: {
                user_id: userId,
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

    static async assign(userId: number, permissionName: string, allow: boolean) {
        const user: User | null = await User.findByPk(userId);
        if (!user) {
            throw new AppError("کاربر مورد نظر پیدا نشد", 404);
        }
        await PermissionService.assignPermissionToUser(user, permissionName, allow);
    }

    static async remove(userId: number, permissionName: string) {
        const user: User | null = await User.findByPk(userId);
        if (!user) {
            throw new AppError("کاربر مورد نظر پیدا نشد", 404);
        }

        await PermissionService.removePermissionFromUser(user, permissionName);
    }
}

export default UserPermissionService;
