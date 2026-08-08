import { DataTypes, Model, type Optional } from "sequelize";
import sequelize from "../../config/db.js";

type ProductAttributes = {
    id: number;
    name: string;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date | null;
};

type ProductCreationAttributes = Optional<
    ProductAttributes,
    "id" | "deleted_at" | "created_at" | "updated_at"
>;

class Product
    extends Model<ProductAttributes, ProductCreationAttributes>
    implements ProductAttributes
{
    declare id: number;
    declare name: string;
    declare deleted_at: Date | null;
    declare created_at: Date;
    declare updated_at: Date;
}

Product.init(
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
        // deleted_at: {
        //     type: DataTypes.DATE,
        //     allowNull: true,
        // },
        // created_at: {
        //     type:DataTypes.DATE,
        //     allowNull: false,
        // },
        // updated_at: {
        //     type: DataTypes.DATE,
        //     allowNull: false,
        // }
    },
    {
        sequelize,
        tableName: "products",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at",
        paranoid: true,
    },
);

export default Product;
