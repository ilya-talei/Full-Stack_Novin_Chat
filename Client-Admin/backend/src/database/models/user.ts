import type { NonAttribute, Sequelize } from "sequelize";
import { DataTypes, Model, type Optional } from "sequelize";
import type { Services } from "../../middlewares/tenantMiddleware.js";
import type UserPermission from "./userPermission.js";
import type Session from "./session.js";

interface UserAttributes {
    id: number;
    employee_id: number | null;
    phone: string;
    role_id: number | null;
    login_id: string;
    hashed_password: string;
    last_login_at: Date;
    active: boolean;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

type UserCreationAttributes = Optional<
    UserAttributes,
    | "id"
    | "deleted_at"
    | "last_login_at"
    | "role_id"
    | "created_at"
    | "updated_at"
    | "active"
    | "employee_id"
>;

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    declare id: number;
    declare employee_id: number | null;
    declare phone: string;
    declare role_id: number | null;
    declare login_id: string;
    declare hashed_password: string;
    declare last_login_at: Date;
    declare active: boolean;
    declare deleted_at: Date | null;
    declare created_at: Date;
    declare updated_at: Date;
    services?: Services;

    public async assignPermission(permission: string, allow: boolean): Promise<boolean> {
        return await this.services!.permission.assignPermissionToUser(this, permission, allow);
    }

    public async hasPermission(permission: string): Promise<boolean> {
        return await this.services!.permission.hasPermission(this, permission);
    }

    declare userPermissions: NonAttribute<UserPermission[]>;
    declare users: NonAttribute<Session[]>;
}

export const UserModelFactory = (sequelize: Sequelize, services: Services) => {
    class UserModel extends User {
        services: Services = services;
    }

    UserModel.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            employee_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            phone: {
                type: DataTypes.STRING(11),
                unique: true,
            },
            role_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            login_id: {
                type: DataTypes.STRING(32),
                unique: true,
                allowNull: false,
            },
            hashed_password: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            last_login_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
            active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
            deleted_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
            },
        },
        {
            sequelize,
            tableName: "users",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            deletedAt: "deleted_at",
            paranoid: true,
        },
    );

    return UserModel;
};

export default User;
