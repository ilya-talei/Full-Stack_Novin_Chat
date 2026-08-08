import { DataTypes, type QueryInterface } from "sequelize";

/** @type {import('sequelize-cli').Migration} */
const migration = {
    async up(queryInterface: QueryInterface) {
        await queryInterface.createTable("products", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
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
        await queryInterface.dropTable("products");
    },
};

export default migration;
