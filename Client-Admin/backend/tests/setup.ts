import type { Sequelize } from "sequelize/lib/sequelize";
import { runSeedersBySequelizeInstance } from "../src/database/seeders/index.js";

export const setupTestDatabase = async (sequelize: Sequelize) => {
    await sequelize.sync({ force: true });
    await runSeedersBySequelizeInstance(sequelize);
};