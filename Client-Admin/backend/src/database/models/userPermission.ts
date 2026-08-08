import type { NonAttribute, Sequelize } from "sequelize";
import { DataTypes, Model, type Optional } from "sequelize";
import type User from "./user.js";
import type Permission from "./permission.js";

interface UserPermissionAttributes {
    id: number;
    user_id: number;
    allow: boolean;
    permission_id: number;
    created_at: Date;
    updated_at: Date;
}

type UserPermissionCreationAttributes = Optional<
    UserPermissionAttributes,
    "id" | "created_at" | "updated_at" | "allow"
>;

class UserPermission
    extends Model<UserPermissionAttributes, UserPermissionCreationAttributes>
    implements UserPermissionAttributes
{
    declare id: number;
    declare user_id: number;
    declare allow: boolean;
    declare permission_id: number;
    declare created_at: Date;
    declare updated_at: Date;

    declare user: NonAttribute<User>;
    declare permission: NonAttribute<Permission>;
}

export const UserPermissionModelFactory = (sequelize: Sequelize) => {
    class UserPermissionModel extends UserPermission {}

    UserPermissionModel.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: "users",
                    key: "id",
                },
                onDelete: "CASCADE",
            },
            allow: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            permission_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: "permissions",
                    key: "id",
                },
                onDelete: "CASCADE",
            },
            created_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
                allowNull: false,
            },
            updated_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: "UserPermission",
            tableName: "user-permissions",
            timestamps: false,
        },
    );

    return UserPermissionModel;
};

export default UserPermission;
