import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl =
    process.env.DATABASE_URL ??
    `postgresql://${process.env.DATABASE_USER}:${encodeURIComponent(process.env.DATABASE_PASSWORD ?? "")}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}?schema=public`;

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const users = [
    { login_id: "admin", password: "123456", display_name: "مدیر سیستم" },
    { login_id: "user", password: "123456", display_name: "کاربر تست" },
];

async function main() {
    const created = [];
    for (const entry of users) {
        const hashed = await bcrypt.hash(entry.password, 10);
        const user = await prisma.user.upsert({
            where: { login_id: entry.login_id },
            update: {
                hashed_password: hashed,
                display_name: entry.display_name,
                active: true,
                deleted_at: null,
            },
            create: {
                login_id: entry.login_id,
                display_name: entry.display_name,
                hashed_password: hashed,
                active: true,
            },
        });
        created.push(user);
        console.log(`Seeded user: ${entry.login_id} / ${entry.password}`);
    }

    if (created.length >= 2) {
        const [a, b] = created;
        await prisma.contact.upsert({
            where: {
                user_id_contact_user_id: {
                    user_id: a.id,
                    contact_user_id: b.id,
                },
            },
            update: { deleted_at: null, blocked: false },
            create: { user_id: a.id, contact_user_id: b.id },
        });
        await prisma.contact.upsert({
            where: {
                user_id_contact_user_id: {
                    user_id: b.id,
                    contact_user_id: a.id,
                },
            },
            update: { deleted_at: null, blocked: false },
            create: { user_id: b.id, contact_user_id: a.id },
        });

        await prisma.notification.create({
            data: {
                user_id: a.id,
                type: "system",
                title: "خوش آمدید",
                body: "محیط لوکال نوین چت آماده است. با user چت خصوصی بسازید.",
            },
        });
        console.log("Seeded mutual contacts + welcome notification");
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
