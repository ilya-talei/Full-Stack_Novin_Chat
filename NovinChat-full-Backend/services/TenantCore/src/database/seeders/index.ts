import type { QueryInterface, Sequelize } from "sequelize";
import { Tenant } from "../../middlewares/tenantMiddleware.js";
import permissionsSeeder from "./20260602193617-permissions.js";

const runSeeders = async (domain: string) => {
    const tenant: Tenant = await Tenant.get(domain);

    const queryInterface: QueryInterface = tenant.sequelize.getQueryInterface();

    console.log("permissions seeder");
    await permissionsSeeder.up(queryInterface);

    console.log("seed successfully!");
};

export const runSeedersBySequelizeInstance = async (sequelize: Sequelize) => {
    const queryInterface: QueryInterface = sequelize.getQueryInterface();

    await permissionsSeeder.up(queryInterface);
};

export default runSeeders;
