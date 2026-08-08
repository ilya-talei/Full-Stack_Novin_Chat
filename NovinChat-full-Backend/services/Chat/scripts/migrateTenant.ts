import { execSync } from "node:child_process";
import { Tenant } from "../src/middlewares/tenantMiddleware.js";

const input = process.argv[2];
if(input === undefined){
    console.log("Usage: ts-node migrateTenant.ts <tenant-domain>");
    process.exit(2);
}

const tenant: Tenant = await Tenant.get(input);

execSync('pnpm prisma migrate deploy', {
    env: {
        ...process.env,
        DATABASE_URL: tenant.dbString,
    },
    stdio: 'inherit',
});

await Tenant.closeConnections();
console.log('Done.')
process.exit(0);