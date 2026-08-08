import Permission from "../../database/models/permission.js";
import RolePermission from "../../database/models/rolePermissions.js";
import type User from "../../database/models/user.js";
import UserPermission from "../../database/models/userPermission.js";
import sequelize from "../../config/db.js";
import { Transaction, type LOCK } from "sequelize";
import type Role from "../../database/models/role.js";

type getPermissionIdfindOptions = {
    where: {
        name: string;
    };
    transaction?: Transaction;
    lock?: LOCK;
};

class PermissionService {
    static async getPermissionId(
        permissionName: string,
        transaction?: Transaction,
    ): Promise<number | null> {
        const findOptions: getPermissionIdfindOptions = { where: { name: permissionName } };
        if (transaction) {
            findOptions.transaction = transaction;
            findOptions.lock = Transaction.LOCK.SHARE;
        }

        const permissionRecord: Permission | null = await Permission.findOne(findOptions);

        return permissionRecord ? permissionRecord.id : null;
    }

    static async hasPermission(user: User, permission: string): Promise<boolean> {
        const permissionRecord: Permission | null = await Permission.findOne({
            where: { name: permission },
        });
        if (permissionRecord === null) {
            return false;
        }

        const userHasPermission: UserPermission | null = await UserPermission.findOne({
            where: { permission_id: permissionRecord.id, user_id: user.id },
        });
        if (userHasPermission) {
            return userHasPermission.allow;
        } else if (user.role_id === null) {
            return permissionRecord.default_value;
        }

        const roleHasPermission: RolePermission | null = await RolePermission.findOne({
            where: { permission_id: permissionRecord.id, role_id: user.role_id },
        });

        return roleHasPermission?.allow ?? permissionRecord.default_value;
    }

    static async assignPermissionToUser(
        user: User,
        permission: string,
        allow: boolean,
    ): Promise<boolean> {
        const t = await sequelize.transaction();
        try {
            const permissionId: number | null = await this.getPermissionId(permission, t);
            if (permissionId === null) {
                await t.rollback();
                return false;
            }

            const permissionExists: UserPermission | null = await UserPermission.findOne({
                where: { permission_id: permissionId, user_id: user.id },
                transaction: t,
                lock: Transaction.LOCK.UPDATE,
            });

            if (permissionExists) {
                permissionExists.allow = allow;
                await permissionExists.save({ transaction: t });
                await t.commit();
                return true;
            }

            await UserPermission.create(
                {
                    user_id: user.id,
                    permission_id: permissionId,
                    allow: allow,
                },
                { transaction: t },
            );

            await t.commit();
            return true;
        } catch (err) {
            await t.rollback();
            throw err;
        }
    }

    static async assignPermissionToRole(
        role: Role,
        permission: string,
        allow: boolean,
    ): Promise<boolean> {
        const t = await sequelize.transaction();
        try {
            const permissionId: number | null = await this.getPermissionId(permission, t);
            if (permissionId === null) {
                await t.rollback();
                return false;
            }

            const permissionExists: RolePermission | null = await RolePermission.findOne({
                where: { permission_id: permissionId, role_id: role.id },
                transaction: t,
                lock: Transaction.LOCK.UPDATE,
            });

            if (permissionExists) {
                permissionExists.allow = allow;
                await permissionExists.save({ transaction: t });
                await t.commit();
                return true;
            }

            await RolePermission.create(
                {
                    role_id: role.id,
                    permission_id: permissionId,
                    allow: allow,
                },
                { transaction: t },
            );

            await t.commit();
            return true;
        } catch (err) {
            await t.rollback();
            throw err;
        }
    }

    static async removePermissionFromUser(user: User, permission: string): Promise<boolean> {
        const t = await sequelize.transaction();
        try {
            const permissionId: number | null = await this.getPermissionId(permission, t);
            if (permissionId === null) {
                await t.rollback();
                return false;
            }

            await UserPermission.destroy({
                where: {
                    user_id: user.id,
                    permission_id: permissionId,
                },
                transaction: t,
            });

            await t.commit();
            return true;
        } catch (err) {
            await t.rollback();
            throw err;
        }
    }

    static async removePermissionFromRole(role: Role, permission: string): Promise<boolean> {
        const t = await sequelize.transaction();
        try {
            const permissionId: number | null = await this.getPermissionId(permission, t);
            if (permissionId === null) {
                await t.rollback();
                return false;
            }

            await RolePermission.destroy({
                where: {
                    role_id: role.id,
                    permission_id: permissionId,
                },
                transaction: t,
            });

            await t.commit();
            return true;
        } catch (err) {
            await t.rollback();
            throw err;
        }
    }
}

export default PermissionService;
