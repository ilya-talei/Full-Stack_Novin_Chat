import { PostgreSqlContainer } from "@testcontainers/postgresql";
import "dotenv/config";
import config from "../src/config/database.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const nodeEnv = process.env.NODE_ENV;
const env: "development" | "production" | "test" =
    nodeEnv === "production" || nodeEnv === "test" ? nodeEnv : "development";

const db = config[env];

const requiredDatabases = [
    "tenant_1",
    "tenant_2",
];

export const setupTestContainer = async () => {
    const container = await new PostgreSqlContainer("postgres:18-alpine")
        .withDatabase(db.database)
        .withUsername(db.username)
        .withPassword(db.password)
        .start();

    const connectionUri = container.getConnectionUri();

    const adapter = new PrismaPg({ connectionString: connectionUri });
    const client = new PrismaClient({ adapter });

    for(let i = 0; i < requiredDatabases.length; i++){
        await client.$executeRawUnsafe(`CREATE DATABASE ${requiredDatabases[i]}`);
    }

    return container;
}