"use strict";

import type { QueryInterface } from "sequelize/lib/dialects/abstract/query-interface";

const migration = {
    async up(queryInterface: QueryInterface) {
        await queryInterface.createTable("role-permissions", {
            id: {
                type: "INTEGER",
                autoIncrement: true,
                primaryKey: true,
            },
            role_id: {
                type: "INTEGER",
                allowNull: false,
                references: {
                    model: "roles",
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
        await queryInterface.dropTable("role-permissions");
    },
};

export default migration;
