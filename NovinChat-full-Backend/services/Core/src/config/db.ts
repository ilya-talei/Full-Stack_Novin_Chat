import { Sequelize } from "sequelize";
import "dotenv/config";
import config from "./database.js";

// const sequelize = new Sequelize({
//     host: process.env.PGSQL_HOST!,
//     port: Number(process.env.PGSQL_PORT) || 5432,
//     database: process.env.PGSQL_DATABASE!,
//     username: process.env.PGSQL_USER!,
//     dialect: 'postgres',
//     password: process.env.PGSQL_PASSWORD!,
// });

type Enviroment = "production" | "development" | "test";

const env: Enviroment = (process.env.NODE_ENV as Enviroment) || "development";
const sequelize: Sequelize = new Sequelize(config[env]);

export default sequelize;
