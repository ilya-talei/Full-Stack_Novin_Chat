import runMigration from "../database/migrations/index.js";

const input = process.argv[2];

if (input === undefined) {
    console.log("Usage: ts-node migrateTenant.ts <tenant-domain-or-id>");
    process.exit(1);
}

await runMigration(input);
