import { beforeAll, afterAll } from "vitest";
import sequelize from "../src/config/db.js";
import seeder from "../src/database/seeders/20260602193617-permissions.cjs";

// tests/setup.ts
beforeAll(async () => {
    await sequelize.sync({ force: true });
    await seeder.up(sequelize.getQueryInterface());
});

afterAll(async () => {
    await sequelize.close();
});

export const setupTestDatabase = async () => {
    await sequelize.sync({ force: true });
    await seeder.up(sequelize.getQueryInterface());
};
