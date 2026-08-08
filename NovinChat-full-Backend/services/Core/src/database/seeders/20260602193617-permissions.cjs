const { Op } = require("sequelize");

const seedPermissions = [
    { name: "user.create", description: "Permission to create a user", default_value: false },
    { name: "user.delete", description: "Permission to delete a user", default_value: false },
    { name: "user.update", description: "Permission to update a user", default_value: false },
    { name: "user.view", description: "Permission to view a user", default_value: false },
    {
        name: "user.change_password",
        description: "Permission to change a user's password",
        default_value: false,
    },

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

    { name: "tenant.create", description: "Permission to create a tenant", default_value: false },
    { name: "tenant.delete", description: "Permission to delete a tenant", default_value: false },
    { name: "tenant.update", description: "Permission to update a tenant", default_value: false },
    { name: "tenant.view", description: "Permission to view tenants", default_value: false },
    {
        name: "tenant.my_tenants",
        description: "Permission to view own tenants",
        default_value: false,
    },

    {
        name: "subscription.create",
        description: "Permission to create a subscription",
        default_value: false,
    },
    {
        name: "subscription.update",
        description: "Permission to update a subscription",
        default_value: false,
    },
];

module.exports = {
    async up(queryInterface) {
        const data = seedPermissions.map((p) => ({
            ...p,
            created_at: new Date(),
            updated_at: new Date(),
        }));

        await queryInterface.bulkInsert("permissions", data);
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete("permissions", {
            name: {
                [Op.in]: seedPermissions.map((p) => p.name),
            },
        });
    },
};
