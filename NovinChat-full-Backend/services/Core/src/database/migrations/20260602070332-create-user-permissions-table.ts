"use strict";

import type { QueryInterface } from "sequelize";

const migration = {
    async up(queryInterface: QueryInterface) {
        await queryInterface.createTable("user-permissions", {
            id: {
                type: "INTEGER",
                autoIncrement: true,
                primaryKey: true,
            },
            user_id: {
                type: "INTEGER",
                allowNull: false,
                references: {
                    model: "users",
                    key: "id",
                },
                onDelete: "CASCADE",
            },
            allow: {
                type: "BOOLEAN",
                allowNull: false,
                defaultValue: false,
            },
            permission_id: {
                type: "INTEGER",
                allowNull: false,
                references: {
                    model: "permissions",
                    key: "id",
                },
                onDelete: "CASCADE",
            },
            created_at: {
                type: "DATE",
                allowNull: false,
            },
            updated_at: {
                type: "DATE",
                allowNull: false,
            },
        });
    },

    async down(queryInterface: QueryInterface) {
        await queryInterface.dropTable("user-permissions");
    },
};

export default migration;
