import { DataTypes, Model, type Optional } from "sequelize";
import sequelize from "../../config/db.js";

interface PermissionAttributes {
    id: number;
    name: string;
    description: string | null;
    default_value: boolean;
    created_at?: Date;
    updated_at?: Date;
}

type PermissionCreationAttributes = Optional<
    PermissionAttributes,
    "id" | "description" | "default_value" | "created_at" | "updated_at"
>;

class Permission
    extends Model<PermissionAttributes, PermissionCreationAttributes>
    implements PermissionAttributes
{
    declare id: number;
    declare name: string;
    declare description: string | null;
    declare default_value: boolean;
    declare created_at: Date;
    declare updated_at: Date;
}

Permission.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(32),
            unique: true,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        default_value: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
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
        modelName: "Permission",
        tableName: "permissions",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    },
);

export default Permission;
