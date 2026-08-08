import { DataTypes, Model, type NonAttribute, type Optional } from "sequelize";
import sequelize from "../../config/db.js";
import type Permission from "./permission.js";
import type Role from "./role.js";

interface RolePermissionAttributes {
    id: number;
    role_id: number;
    allow: boolean;
    permission_id: number;
    created_at?: Date;
    updated_at?: Date;
}

type RolePermissionCreationAttributes = Optional<
    RolePermissionAttributes,
    "id" | "created_at" | "updated_at" | "allow"
>;

class RolePermission
    extends Model<RolePermissionAttributes, RolePermissionCreationAttributes>
    implements RolePermissionAttributes
{
    declare id: number;
    declare role_id: number;
    declare allow: boolean;
    declare permission_id: number;
    declare created_at: Date;
    declare updated_at: Date;

    declare Permission: NonAttribute<Permission>;
    declare Role: NonAttribute<Role>;
}

RolePermission.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        role_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        allow: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        permission_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        // created_at: {
        //     type: DataTypes.DATE,
        //     allowNull: false,
        //     defaultValue: DataTypes.NOW,
        // },
        // updated_at: {
        //     type: DataTypes.DATE,
        //     allowNull: false,
        //     defaultValue: DataTypes.NOW,
        // },
    },
    {
        sequelize,
        modelName: "RolePermission",
        tableName: "role-permissions",
        createdAt: "created_at",
        updatedAt: "updated_at",
        timestamps: true,
    },
);

export default RolePermission;
