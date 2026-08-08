import type { QueryInterface } from "sequelize";
import { DataTypes } from "sequelize";

const migration = {
    async up(queryInterface: QueryInterface) {
        await queryInterface.createTable("roles", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING(32),
                allowNull: false,
                unique: true,
            },
            description: {
                type: "TEXT",
                allowNull: true,
            },
            created_at: {
                type: "DATE",
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
            updated_at: {
                type: "DATE",
                defaultValue: DataTypes.NOW,
                allowNull: false,
            },
        });
    },

    async down(queryInterface: QueryInterface) {
        await queryInterface.dropTable("roles");
    },
};

export default migration;
