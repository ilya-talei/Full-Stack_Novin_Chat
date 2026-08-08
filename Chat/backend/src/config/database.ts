import "dotenv/config";

const dbConfig = {
    username: process.env.DATABASE_USER ?? "postgres",
    password: process.env.DATABASE_PASSWORD ?? "password",
    database: process.env.DATABASE_NAME ?? "core_db",
    testDatabase: process.env.DATABASE_TEST_NAME ?? process.env.DATABASE_NAME ?? "core_db",
    host: process.env.DATABASE_HOST ?? "127.0.0.1",
    port: Number(process.env.DATABASE_PORT ?? 5432),
};

const config = {
    development: {
        username: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.database,
        host: dbConfig.host,
        port: dbConfig.port,
        logging: true,
    },
    test: {
        username: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.testDatabase,
        host: dbConfig.host,
        port: dbConfig.port,
        logging: false,
    },
    production: {
        username: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.database,
        host: dbConfig.host,
        port: dbConfig.port,
        logging: false,
    },
};

export default config;
