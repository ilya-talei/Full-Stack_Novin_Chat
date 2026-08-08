import bcrypt from "bcrypt";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../src/index.js";
import User from "../src/database/models/user.js";
import Tenant from "../src/database/models/tenant.js";
import Product from "../src/database/models/product.js";
import Subscription from "../src/database/models/subscription.js";
import sequelize from "../src/config/db.js";
import { setupTestDatabase } from "./setup.js";

// beforeAll(async () => {
//     await sequelize.sync({ force: true });
// });

async function createAuthenticatedUser(loginId: string, password: string, permissions: string[]) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const phone = `091${String(Math.floor(Math.random() * 90000000) + 10000000)}`;
    const user = await User.create({
        login_id: loginId,
        phone,
        employee_id: Math.floor(Math.random() * 1000000) + 1000,
        hashed_password: hashedPassword,
    });

    for (const permission of permissions) {
        await user.assignPermission(permission, true);
    }

    const loginResponse = await request(app)
        .post("/auth/login")
        .send({ login_id: loginId, password });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toHaveProperty("token");

    return { user, token: loginResponse.body.token };
}

describe("/subscriptions PUT integration tests", () => {
    let authorizedToken: string;
    let unauthorizedToken: string;
    let subscriptionId: number;

    beforeAll(async () => {
        await setupTestDatabase();

        const tenant = await Tenant.create({
            name: "Subscription Tenant",
            domain: `subscription-${Date.now()}-${Math.floor(Math.random() * 100000)}.example`,
            minio: {
                accessKey: "fdsfdsfds",
                secretKey: "admin",
                endpoint: "fdsfdsfdsf",
                pathStyle: true,
            },
            creator_id: null,
            db_name: "tenant1_db",
            active: true,
        });

        const product = await Product.create({
            name: "Test Product",
        });

        const subscription = await Subscription.create({
            tenant_id: tenant.id,
            product_id: product.id,
            status: "active",
            start_date: new Date("2026-01-01"),
            end_date: new Date("2027-01-01"),
        });

        subscriptionId = subscription.id;

        const authorized = await createAuthenticatedUser("subscription_updater", "SubPass123!", [
            "subscription.update",
        ]);
        authorizedToken = authorized.token;

        const unauthorized = await createAuthenticatedUser("subscription_user", "SubPass123!", []);
        unauthorizedToken = unauthorized.token;
    });

    it("returns 401 when authorization header is missing", async () => {
        const response = await request(app)
            .put(`/subscriptions/${subscriptionId}`)
            .send({ status: "inactive" });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Authentication Failed" });
    });

    it("returns 403 when user lacks subscription.update permission", async () => {
        const response = await request(app)
            .put(`/subscriptions/${subscriptionId}`)
            .set("Authorization", `Bearer ${unauthorizedToken}`)
            .send({ status: "inactive" });

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: "غیرمجاز" });
    });

    it("returns 400 when subscription id is invalid", async () => {
        const response = await request(app)
            .put("/subscriptions/abc")
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({ status: "inactive" });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("شناسه نامعتبر است");
    });

    it("returns 400 when request body is invalid", async () => {
        const response = await request(app)
            .put(`/subscriptions/${subscriptionId}`)
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({ status: "not-a-valid-status" });

        expect(response.status).toBe(400);
        expect(typeof response.body.message).toBe("string");
    });

    it("returns 404 when subscription does not exist", async () => {
        const response = await request(app)
            .put("/subscriptions/999999")
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({ status: "inactive" });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("اشتراک مورد نظر پیدا نشد");
    });

    it("returns 204 when updating subscription status successfully", async () => {
        const response = await request(app)
            .put(`/subscriptions/${subscriptionId}`)
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({ status: "inactive" });

        expect(response.status).toBe(204);

        const updatedSubscription = await Subscription.findByPk(subscriptionId);
        expect(updatedSubscription).not.toBeNull();
        expect(updatedSubscription?.status).toBe("inactive");
    });
});

describe("/subscriptions POST integration tests", () => {
    let authorizedToken: string;
    let unauthorizedToken: string;
    let createTenantId: number;
    let createProductId: number;

    beforeAll(async () => {
        await setupTestDatabase();

        const tenant = await Tenant.create({
            name: "Create Subscription Tenant",
            domain: `create-subscription-${Date.now()}-${Math.floor(Math.random() * 100000)}.example`,
            creator_id: null,
            db_name: "tenant2_db",
            minio: {
                accessKey: "fdsfdsfds",
                secretKey: "admin",
                endpoint: "fdsfdsfdsf",
                pathStyle: true,
            },
            active: true,
        });

        const product = await Product.create({
            name: "Create Test Product",
        });

        createTenantId = tenant.id;
        createProductId = product.id;

        const authorized = await createAuthenticatedUser("subscription_creator", "SubCreate123!", [
            "subscription.create",
        ]);
        authorizedToken = authorized.token;

        const unauthorized = await createAuthenticatedUser(
            "subscription_create_user",
            "SubCreate123!",
            [],
        );
        unauthorizedToken = unauthorized.token;
    });

    it("returns 401 when authorization header is missing", async () => {
        const response = await request(app).post("/subscriptions").send({
            tenant_id: createTenantId,
            product_id: createProductId,
            start_date: "2026-08-01",
            end_date: "2027-08-01",
            status: "active",
        });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Authentication Failed" });
    });

    it("returns 403 when user lacks subscription.create permission", async () => {
        const response = await request(app)
            .post("/subscriptions")
            .set("Authorization", `Bearer ${unauthorizedToken}`)
            .send({
                tenant_id: createTenantId,
                product_id: createProductId,
                start_date: "2026-08-01",
                end_date: "2027-08-01",
                status: "active",
            });

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: "غیرمجاز" });
    });

    it("returns 400 when request body is invalid", async () => {
        const response = await request(app)
            .post("/subscriptions")
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                tenant_id: createTenantId,
                product_id: createProductId,
                start_date: "invalid-date",
                end_date: "2027-08-01",
                status: "active",
            });

        expect(response.status).toBe(400);
        expect(typeof response.body.message).toBe("string");
    });

    it("returns 404 when tenant does not exist", async () => {
        const response = await request(app)
            .post("/subscriptions")
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                tenant_id: 999999,
                product_id: createProductId,
                start_date: "2026-08-01",
                end_date: "2027-08-01",
                status: "active",
            });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("مستاجر مورد نظر پیدا نشد");
    });

    it("returns 404 when product does not exist", async () => {
        const response = await request(app)
            .post("/subscriptions")
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                tenant_id: createTenantId,
                product_id: 999999,
                start_date: "2026-08-01",
                end_date: "2027-08-01",
                status: "active",
            });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("محصول مورد نظر پیدا نشد");
    });

    it("returns 204 when a subscription is created successfully", async () => {
        const response = await request(app)
            .post("/subscriptions")
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                tenant_id: createTenantId,
                product_id: createProductId,
                start_date: "2026-08-01",
                end_date: "2027-08-01",
                status: "active",
            });

        expect(response.status).toBe(204);

        const created = await Subscription.findOne({
            where: {
                tenant_id: createTenantId,
                product_id: createProductId,
                status: "active",
            },
        });

        expect(created).not.toBeNull();
        expect(created?.start_date).toBe("2026-08-01");
        expect(created?.end_date).toBe("2027-08-01");
    });
});
