import type { QueryInterface } from "sequelize";
import { Tenant } from "../../middlewares/tenantMiddleware.js";
import usersMigration from "./20260529061128-create-users-table.js";
import sessionsMigration from "./20260529064750-create-session-table.js";
import rolesMigration from "./20260602065147-create-roles-table.js";
import permissionsMigration from "./20260602065455-create-permissions-table.js";
import rolePermissionsMigration from "./20260602070037-create-role-permissions-table.js";
import userPermissionMigration from "./20260602070332-create-user-permissions-table.js";

const runMigration = async (domain: string) => {
    const tenant: Tenant = await Tenant.get(domain);

    const queryInterface: QueryInterface = tenant.sequelize.getQueryInterface();

    await usersMigration.up(queryInterface);
    await sessionsMigration.up(queryInterface);
    await rolesMigration.up(queryInterface);
    await permissionsMigration.up(queryInterface);
    await rolePermissionsMigration.up(queryInterface);
    await userPermissionMigration.up(queryInterface);

    console.log("migration successfully!");
};

export default runMigration;
