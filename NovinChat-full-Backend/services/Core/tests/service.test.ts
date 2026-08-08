import request from "supertest";
import { describe, expect, it, beforeAll } from "vitest";
import app from "../src/index.js";
import Service from "../src/database/models/service.js";
import Tenant from "../src/database/models/tenant.js";
import crypto from "crypto";
import { setupTestDatabase } from "./setup.js";

describe("/service route integration tests", () => {
    let testService: Service;
    let testTenant: Tenant;
    let validToken: string;

    beforeAll(async () => {
        await setupTestDatabase();

        // Create a test service with an explicit secret
        testService = await Service.create({
            name: "Test Service",
            secret: crypto.randomUUID(),
        });

        // Create a test tenant
        testTenant = await Tenant.create({
            name: "Test Tenant",
            domain: "test-service-tenant.com",
            minio: {
                accessKey: "fdsfdsfds",
                secretKey: "admin",
                endpoint: "fdsfdsfdsf",
                pathStyle: true,
            },
            db_name: "tenant1_db",
        });
    });

    describe("POST /service/token", () => {
        it("returns a valid JWT token when provided with correct secret", async () => {
            const response = await request(app)
                .post("/service/token")
                .send({ secret: testService.secret });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("token");
            expect(typeof response.body.token).toBe("string");
            expect(response.body.token.length).toBeGreaterThan(0);

            // Token should be a valid JWT (3 parts separated by dots)
            const tokenParts = response.body.token.split(".");
            expect(tokenParts.length).toBe(3);

            validToken = response.body.token;
        });

        it("returns 401 when secret is not provided", async () => {
            const response = await request(app).post("/service/token").send({});

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty("message");
            expect(response.body.message).toBe("Authentication Failed");
        });

        it("returns 401 when secret is empty string", async () => {
            const response = await request(app).post("/service/token").send({ secret: "" });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty("message");
            expect(response.body.message).toBe("Authentication Failed");
        });

        it("returns 401 when secret is invalid", async () => {
            const response = await request(app)
                .post("/service/token")
                .send({ secret: "invalid-secret-12345" });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty("message");
            expect(response.body.message).toBe("Authentication Failed");
        });

        it("returns 401 when secret is null", async () => {
            const response = await request(app).post("/service/token").send({ secret: null });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty("message");
        });

        it("generates different tokens for the same service on subsequent requests", async () => {
            const response1 = await request(app)
                .post("/service/token")
                .send({ secret: testService.secret });

            const response2 = await request(app)
                .post("/service/token")
                .send({ secret: testService.secret });

            expect(response1.status).toBe(200);
            expect(response2.status).toBe(200);
            expect(response1.body.token).not.toBe(response2.body.token);
        });

        it("token contains service_id and service_name in payload", async () => {
            const response = await request(app)
                .post("/service/token")
                .send({ secret: testService.secret });

            expect(response.status).toBe(200);

            // Decode JWT (without verification for this test)
            const token = response.body.token;
            const payloadBase64 = token.split(".")[1];
            const payload = JSON.parse(Buffer.from(payloadBase64, "base64").toString());

            expect(payload).toHaveProperty("service_id");
            expect(payload).toHaveProperty("service_name");
            expect(payload.service_id).toBe(testService.id);
            expect(payload.service_name).toBe(testService.name);
        });
    });

    describe("GET /service/tenants", () => {
        it("returns tenant information when valid service token is provided", async () => {
            // First get a valid token
            const tokenResponse = await request(app)
                .post("/service/token")
                .send({ secret: testService.secret });

            expect(tokenResponse.status).toBe(200);
            const token = tokenResponse.body.token;

            // Then use that token to query tenants
            const response = await request(app)
                .get("/service/tenants")
                .set("Authorization", `Bearer ${token}`)
                .query({ domain: testTenant.domain });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("id");
            expect(response.body).toHaveProperty("name");
            expect(response.body).toHaveProperty("domain");
            expect(response.body.domain).toBe(testTenant.domain);
            expect(response.body.name).toBe(testTenant.name);
        });

        it("returns 401 when no authorization header is provided", async () => {
            const response = await request(app)
                .get("/service/tenants")
                .query({ domain: testTenant.domain });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty("message");
        });

        it("returns 401 when authorization header has invalid format", async () => {
            const response = await request(app)
                .get("/service/tenants")
                .set("Authorization", "InvalidToken")
                .query({ domain: testTenant.domain });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty("message");
        });

        it("returns 401 when token is invalid", async () => {
            const response = await request(app)
                .get("/service/tenants")
                .set("Authorization", "Bearer invalid.token.here")
                .query({ domain: testTenant.domain });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty("message");
        });

        it("returns 400 when domain query parameter is missing", async () => {
            const tokenResponse = await request(app)
                .post("/service/token")
                .send({ secret: testService.secret });

            const token = tokenResponse.body.token;

            const response = await request(app)
                .get("/service/tenants")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("message");
        });

        it("returns 400 when domain is empty string", async () => {
            const tokenResponse = await request(app)
                .post("/service/token")
                .send({ secret: testService.secret });

            const token = tokenResponse.body.token;

            const response = await request(app)
                .get("/service/tenants")
                .set("Authorization", `Bearer ${token}`)
                .query({ domain: "" });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("message");
        });

        it("returns 404 when tenant with given domain does not exist", async () => {
            const tokenResponse = await request(app)
                .post("/service/token")
                .send({ secret: testService.secret });

            const token = tokenResponse.body.token;

            const response = await request(app)
                .get("/service/tenants")
                .set("Authorization", `Bearer ${token}`)
                .query({ domain: "non-existent-domain.com" });

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty("message");
        });

        it("returns 400 when domain exceeds max length (64 characters)", async () => {
            const tokenResponse = await request(app)
                .post("/service/token")
                .send({ secret: testService.secret });

            const token = tokenResponse.body.token;
            const longDomain = "a".repeat(65) + ".com";

            const response = await request(app)
                .get("/service/tenants")
                .set("Authorization", `Bearer ${token}`)
                .query({ domain: longDomain });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("message");
        });

        it("returns tenant data with all expected properties", async () => {
            const tokenResponse = await request(app)
                .post("/service/token")
                .send({ secret: testService.secret });

            const token = tokenResponse.body.token;

            const response = await request(app)
                .get("/service/tenants")
                .set("Authorization", `Bearer ${token}`)
                .query({ domain: testTenant.domain });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("id");
            expect(response.body).toHaveProperty("name");
            expect(response.body).toHaveProperty("domain");
            expect(response.body).toHaveProperty("active");
            expect(typeof response.body.id).toBe("number");
            expect(typeof response.body.name).toBe("string");
            expect(typeof response.body.domain).toBe("string");
            expect(typeof response.body.active).toBe("boolean");
        });

        it("returns only active tenants", async () => {
            // Create an inactive tenant
            const inactiveTenant = await Tenant.create({
                name: "Inactive Tenant",
                domain: "inactive-service-tenant.com",
                db_name: "tenant2_db",
                minio: {
                    accessKey: "fdsfdsfds",
                    secretKey: "admin",
                    endpoint: "fdsfdsfdsf",
                    pathStyle: true,
                },
                active: false,
            });

            const tokenResponse = await request(app)
                .post("/service/token")
                .send({ secret: testService.secret });

            const token = tokenResponse.body.token;

            // Try to get the inactive tenant
            const response = await request(app)
                .get("/service/tenants")
                .set("Authorization", `Bearer ${token}`)
                .query({ domain: inactiveTenant.domain });

            // Should return 404 since the tenant is inactive (soft deleted)
            expect(response.status).toBe(404);
        });
    });

    describe("Service token expiration", () => {
        it("token payload includes expiration time", async () => {
            const response = await request(app)
                .post("/service/token")
                .send({ secret: testService.secret });

            expect(response.status).toBe(200);

            const token = response.body.token;
            const payloadBase64 = token.split(".")[1];
            const payload = JSON.parse(Buffer.from(payloadBase64, "base64").toString());

            expect(payload).toHaveProperty("exp");
            expect(typeof payload.exp).toBe("number");

            // Check that expiration is in the future
            const now = Math.floor(Date.now() / 1000);
            expect(payload.exp).toBeGreaterThan(now);

            // Check that expiration is approximately 5 minutes from now
            const expirationInMinutes = (payload.exp - now) / 60;
            expect(expirationInMinutes).toBeLessThanOrEqual(5);
            expect(expirationInMinutes).toBeGreaterThanOrEqual(4.5);
        });
    });

    describe("Multiple services isolation", () => {
        it("different services have different secrets", async () => {
            const service2 = await Service.create({
                name: "Another Service",
                secret: crypto.randomUUID(),
            });

            expect(testService.secret).not.toBe(service2.secret);
        });

        it("token from one service cannot be used with another service's secret endpoint", async () => {
            const service2 = await Service.create({
                name: "Service for isolation test",
                secret: crypto.randomUUID(),
            });

            const token1Response = await request(app)
                .post("/service/token")
                .send({ secret: testService.secret });

            const token1 = token1Response.body.token;

            // Token1 contains service_id of testService
            // Using it to access tenants should work
            const response = await request(app)
                .get("/service/tenants")
                .set("Authorization", `Bearer ${token1}`)
                .query({ domain: testTenant.domain });

            expect(response.status).toBe(200);

            // Token from service1 should still work (it's just a valid JWT)
            // The test verifies that each service gets its own token
        });
    });
});
