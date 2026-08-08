import runSeeders from "../src/database/seeders/index.js";

const input = process.argv[2];

if (input === undefined) {
    console.log("Usage: ts-node runSeeders.ts <tenant-domain-or-id>");
    process.exit(1);
}

await runSeeders(input);
