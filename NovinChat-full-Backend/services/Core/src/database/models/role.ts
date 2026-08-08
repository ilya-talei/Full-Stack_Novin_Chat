import { DataTypes, Model, type Optional } from "sequelize";
import sequelize from "../../config/db.js";

interface RoleAttributes {
    id: number;
    name: string;
    description: string | null;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}

type RoleCreationAttributes = Optional<
    RoleAttributes,
    "id" | "deleted_at" | "created_at" | "updated_at"
>;

class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
    declare id: number;
    declare name: string;
    declare description: string | null;
    declare created_at: Date;
    declare updated_at: Date;
    declare deleted_at: Date;
}

Role.init(
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
        // deleted_at: {
        //     type: DataTypes.DATE,
        //     allowNull: true,
        // },
    },
    {
        sequelize,
        modelName: "Role",
        tableName: "roles",
        paranoid: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at",
        timestamps: false,
    },
);

export default Role;
