import { DataTypes, type QueryInterface } from "sequelize";

/** @type {import('sequelize-cli').Migration} */
const migration = {
    async up(queryInterface: QueryInterface) {
        await queryInterface.createTable("subscriptions", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            tenant_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: "tenants",
                    key: "id",
                },
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },
            product_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: "products",
                    key: "id",
                },
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
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
            deleted_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
        });
    },
    async down(queryInterface: QueryInterface) {
        await queryInterface.dropTable("subscriptions");
    },
};

export default migration;
