import { DataTypes, Model, type Optional } from "sequelize";
import sequelize from "../../config/db.js";
import Tenant from "./tenant.js";
import Product from "./product.js";

export interface subscriptionJwt {
    tenant_id: number;
}

interface SubscriptionAttributes {
    id: number;
    tenant_id: number;
    product_id: number;
    status: "active" | "inactive" | "expired" | "cancelled";
    start_date: Date | null;
    end_date: Date | null;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date | null;
}

type SubscriptionCreationAttributes = Optional<
    SubscriptionAttributes,
    "id" | "deleted_at" | "created_at" | "updated_at" | "status" | "start_date" | "end_date"
>;

class Subscription
    extends Model<SubscriptionAttributes, SubscriptionCreationAttributes>
    implements SubscriptionAttributes
{
    declare id: number;
    declare tenant_id: number;
    declare product_id: number;
    declare status: "active" | "inactive" | "expired" | "cancelled";
    declare start_date: Date | null;
    declare end_date: Date | null;
    declare deleted_at: Date | null;
    declare created_at: Date;
    declare updated_at: Date;
}

Subscription.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        tenant_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: Tenant,
            },
        },
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: Product,
            },
        },
        status: {
            type: DataTypes.ENUM("active", "inactive", "expired", "cancelled"),
            allowNull: false,
            defaultValue: "active",
        },
        start_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        end_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
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
        tableName: "subscriptions",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at",
        paranoid: true,
    },
);

export default Subscription;
