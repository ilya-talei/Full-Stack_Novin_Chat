import type Session from "./session.js";
import { SessionModelFactory } from "./session.js";
import type User from "./user.js";
import { UserModelFactory } from "./user.js";
import type Permission from "./permission.js";
import { PermissionModelFactory } from "./permission.js";
import type UserPermission from "./userPermission.js";
import { UserPermissionModelFactory } from "./userPermission.js";
import type { Sequelize } from "sequelize";
import type Role from "./role.js";
import { RoleModelFactory } from "./role.js";
import type RolePermission from "./rolePermissions.js";
import { RolePermissionModelFactory } from "./rolePermissions.js";
import type { Services } from "../../middlewares/tenantMiddleware.js";

export type Models = {
    User: typeof User;
    Session: typeof Session;
    Role: typeof Role;
    Permission: typeof Permission;
    UserPermission: typeof UserPermission;
    RolePermission: typeof RolePermission;
};

const ModelsFactory = (sequelize: Sequelize, services: Services) => {
    const models: Models = {
        User: UserModelFactory(sequelize, services),
        Session: SessionModelFactory(sequelize),
        Role: RoleModelFactory(sequelize),
        Permission: PermissionModelFactory(sequelize),
        UserPermission: UserPermissionModelFactory(sequelize),
        RolePermission: RolePermissionModelFactory(sequelize),
    };

    models.User.hasMany(models.Session, { foreignKey: "user_id" });
    models.Session.belongsTo(models.User, { foreignKey: "user_id" });

    models.Permission.hasMany(models.UserPermission, {
        foreignKey: "permission_id",
        as: "userPermissions",
    });
    models.UserPermission.belongsTo(models.Permission, {
        foreignKey: "permission_id",
        as: "permission",
    });

    models.User.hasMany(models.UserPermission, { foreignKey: "user_id", as: "userPermissions" });
    models.UserPermission.belongsTo(models.User, { foreignKey: "user_id", as: "user" });

    models.Permission.hasMany(models.RolePermission, {
        foreignKey: "permission_id",
        as: "rolePermissions",
    });
    models.RolePermission.belongsTo(models.Permission, {
        foreignKey: "permission_id",
        as: "permission",
    });

    models.Role.hasMany(models.RolePermission, { foreignKey: "role_id", as: "rolePermissions" });
    models.RolePermission.belongsTo(models.Role, { foreignKey: "role_id", as: "role" });

    return models;
};

export default ModelsFactory;
