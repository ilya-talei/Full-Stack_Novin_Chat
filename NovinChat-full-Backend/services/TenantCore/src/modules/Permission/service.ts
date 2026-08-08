import { Transaction } from "sequelize";
import type { FindOptions, Sequelize } from "sequelize";
import type { Models } from "../../database/models/index.js";
import type Permission from "../../database/models/permission.js";
import type User from "../../database/models/user.js";
import type UserPermission from "../../database/models/userPermission.js";
import type RolePermission from "../../database/models/rolePermissions.js";
import type Role from "../../database/models/role.js";

class PermissionService {
    models?: Models;
    constructor(private sequelize: Sequelize) {}
    public async getPermissionId(
        permissionName: string,
        transaction?: Transaction,
    ): Promise<number | null> {
        const findOptions: FindOptions = {
            where: {
                name: permissionName,
            },
        };

        if (transaction) {
            findOptions.transaction = transaction;
            findOptions.lock = Transaction.LOCK.SHARE;
        }

        const permissionRecord: Permission | null =
            await this.models!.Permission.findOne(findOptions);

        return permissionRecord ? permissionRecord.id : null;
    }

    public async hasPermission(user: User, permission: string): Promise<boolean> {
        const permissionRecord: Permission | null = await this.models!.Permission.findOne({
            where: { name: permission },
        });
        if (permissionRecord === null) {
            return false;
        }

        const userHasPermission: UserPermission | null = await this.models!.UserPermission.findOne({
            where: { permission_id: permissionRecord.id, user_id: user.id },
        });
        if (userHasPermission) {
            return userHasPermission.allow;
        } else if (user.role_id === null) {
            return permissionRecord.default_value;
        }

        const roleHasPermission: RolePermission | null = await this.models!.RolePermission.findOne({
            where: { permission_id: permissionRecord.id, role_id: user.role_id },
        });

        return roleHasPermission?.allow ?? permissionRecord.default_value;
    }

    public async assignPermissionToUser(
        user: User,
        permission: string,
        allow: boolean,
    ): Promise<boolean> {
        const t = await this.sequelize.transaction();
        try {
            const permissionId: number | null = await this.getPermissionId(permission, t);
            if (permissionId === null) {
                await t.rollback();
                return false;
            }

            const permissionExists: UserPermission | null =
                await this.models!.UserPermission.findOne({
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

            await this.models!.UserPermission.create(
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

    public async assignPermissionToRole(
        role: Role,
        permission: string,
        allow: boolean,
    ): Promise<boolean> {
        const t = await this.sequelize.transaction();
        try {
            const permissionId: number | null = await this.getPermissionId(permission, t);
            if (permissionId === null) {
                await t.rollback();
                return false;
            }

            const permissionExists: RolePermission | null =
                await this.models!.RolePermission.findOne({
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

            await this.models!.RolePermission.create(
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

    public async removePermissionFromUser(user: User, permission: string): Promise<boolean> {
        const t = await this.sequelize.transaction();
        try {
            const permissionId: number | null = await this.getPermissionId(permission, t);
            if (permissionId === null) {
                await t.rollback();
                return false;
            }

            await this.models!.UserPermission.destroy({
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

    public async removePermissionFromRole(role: Role, permission: string): Promise<boolean> {
        const t = await this.sequelize.transaction();
        try {
            const permissionId: number | null = await this.getPermissionId(permission, t);
            if (permissionId === null) {
                await t.rollback();
                return false;
            }

            await this.models!.RolePermission.destroy({
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

    public async resolveUserPermissions(user: User): Promise<Record<string, boolean>> {
        const permissionsMap: Record<string, boolean> = {};

        const allPermissions: Permission[] = await this.models!.Permission.findAll({
            attributes: ["name", "default_value"],
        });

        for (const permission of allPermissions) {
            if (permission.default_value) {
                permissionsMap[permission.name] = true;
            }
        }

        if (user.role_id !== null) {
            const rolePermissions = await this.models!.RolePermission.findAll({
                where: { role_id: user.role_id },
                include: [{ model: this.models!.Permission, attributes: ["name"] }],
                attributes: ["allow"],
            });

            for (const rp of rolePermissions) {
                const name = rp.permission.name;
                if (name) {
                    permissionsMap[name] = rp.allow;
                }
            }
        }

        const userPermissions: UserPermission[] = await this.models!.UserPermission.findAll({
            where: { user_id: user.id },
            include: [{ model: this.models!.Permission, as: "permission", attributes: ["name"] }],
            attributes: ["allow"],
        });

        for (const up of userPermissions) {
            const name = up.permission.name;
            if (name) {
                // user-specific permissions override role permissions
                permissionsMap[name] = up.allow;
            }
        }

        return permissionsMap;
    }
}

export default PermissionService;
