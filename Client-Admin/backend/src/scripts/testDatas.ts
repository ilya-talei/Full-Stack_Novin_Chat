import { Tenant } from "../middlewares/tenantMiddleware.js";
import bcrypt from "bcrypt";

const input = process.argv[2];

if (input === undefined) {
    console.log("Usage: ts-node testDatas.ts <tenant-domain-or-id>");
    process.exit(1);
}

const tenant: Tenant = await Tenant.get(input);

await tenant.models.User.create({
    login_id: "testuser",
    hashed_password: await bcrypt.hash("password123", 10),
    phone: "09035564854",
    active: true,
});

console.log("testUser created successfully for tenant: ", input);
