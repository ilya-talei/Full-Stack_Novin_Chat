import { DataTypes, Model, type Optional } from "sequelize";
import sequelize from "../../config/db.js";

export interface MinIOClientOptions {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    pathStyle: boolean;
}

export interface TenantAttributes {
    id: number;
    name: string;
    domain: string;
    db_name: string;
    minio: MinIOClientOptions;
    creator_id: number | null;
    active: boolean;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date | null;
}

type TenantCreationAttributes = Optional<
    TenantAttributes,
    "id" | "deleted_at" | "created_at" | "updated_at" | "active"
>;

class Tenant extends Model<TenantAttributes, TenantCreationAttributes> implements TenantAttributes {
    declare id: number;
    declare name: string;
    declare domain: string;
    declare db_name: string;
    declare minio: MinIOClientOptions;
    declare creator_id: number | null;
    declare active: boolean;
    declare deleted_at: Date | null;
    declare created_at: Date;
    declare updated_at: Date;
}

Tenant.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        domain: {
            type: DataTypes.STRING(64),
            unique: true,

            allowNull: false,
        },
        db_name: {
            type: DataTypes.STRING(64),
            unique: true,
            allowNull: false,
        },
        minio: {
            type: DataTypes.JSON,
            allowNull: false,
        },
        creator_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        // deleted_at: {
        //     type: DataTypes.DATE,
        //     allowNull: true,
        // },
        // created_at: {
        //     type: DataTypes.DATE,
        //     allowNull: false,
        // },
        // updated_at: {
        //     type: DataTypes.DATE,
        //     allowNull: false,
        // },
    },
    {
        sequelize,
        tableName: "tenants",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at",
        paranoid: true,
    },
);

export default Tenant;
