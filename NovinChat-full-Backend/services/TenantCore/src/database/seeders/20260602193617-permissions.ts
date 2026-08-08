import type { QueryInterface } from "sequelize";
import { Op } from "sequelize";

const permissions = [
    {
        name: "user.change_password",
        description: "Permission to change a user's password",
        default_value: true,
    },

    { name: "user.create", description: "Permission to create a user", default_value: false },
    { name: "user.delete", description: "Permission to delete a user", default_value: false },
    { name: "user.update", description: "Permission to update a user", default_value: false },
    { name: "user.view", description: "Permission to view a user", default_value: false },

    {
        name: "user_permission.index",
        description: "Permission to list user permissions",
        default_value: false,
    },
    {
        name: "user_permission.assign",
        description: "Permission to assign a permission to a user",
        default_value: false,
    },
    {
        name: "user_permission.remove",
        description: "Permission to remove a permission from user",
        default_value: false,
    },

    {
        name: "role_permission.index",
        description: "Permission to list role permissions",
        default_value: false,
    },
    {
        name: "role_permission.assign",
        description: "Permission to assign a permission to a role",
        default_value: false,
    },
    {
        name: "role_permission.remove",
        description: "Permission to remove a permission from a role",
        default_value: false,
    },

    { name: "role.create", description: "Permission to create a role", default_value: false },
    { name: "role.delete", description: "Permission to delete a role", default_value: false },
    { name: "role.update", description: "Permission to update a role", default_value: false },
    { name: "role.view", description: "Permission to view a role", default_value: false },
    {
        name: "role.assign",
        description: "Permission to assign a role to a user",
        default_value: false,
    },

    {
        name: "permission.assign_to_role",
        description: "Permission to assign a permission to a role",
        default_value: false,
    },
    {
        name: "permission.revoke_from_role",
        description: "Permission to revoke a permission from a role",
        default_value: false,
    },
    {
        name: "permission.assign_to_user",
        description: "Permission to assign a permission to a user",
        default_value: false,
    },
    {
        name: "permission.revoke_from_user",
        description: "Permission to revoke a permission from a user",
        default_value: false,
    },
] as const;

const permissionNames = permissions.map((p) => p.name);

const seeder = {
    async up(queryInterface: QueryInterface) {
        const now = new Date();

        await queryInterface.bulkInsert(
            "permissions",
            permissions.map((p) => ({
                ...p,
                created_at: now,
                updated_at: now,
            })),
        );
    },

    async down(queryInterface: QueryInterface) {
        await queryInterface.bulkDelete("permissions", {
            name: {
                [Op.in]: permissionNames,
            },
        });
    },
};

export default seeder;
