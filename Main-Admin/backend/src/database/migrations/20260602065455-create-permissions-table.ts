"use strict";

import { DataTypes } from "sequelize";
import type { QueryInterface } from "sequelize/lib/dialects/abstract/query-interface";

const migration = {
    async up(queryInterface: QueryInterface) {
        await queryInterface.createTable("permissions", {
            id: {
                type: "INTEGER",
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
            default_value: {
                type: "BOOLEAN",
                allowNull: false,
                defaultValue: false,
            },
            created_at: {
                type: "DATE",
                defaultValue: DataTypes.NOW,
                allowNull: false,
            },
            updated_at: {
                type: "DATE",
                defaultValue: DataTypes.NOW,
                allowNull: false,
            },
        });
    },

    async down(queryInterface: QueryInterface) {
        await queryInterface.dropTable("permissions");
    },
};

export default migration;
