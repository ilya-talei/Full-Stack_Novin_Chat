import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../src/index.js";
import User from "../src/database/models/user.js";
import Role from "../src/database/models/role.js";
import Permission from "../src/database/models/permission.js";
import RolePermission from "../src/database/models/rolePermissions.js";
import { setupTestDatabase } from "./setup.js";

// Helper to generate unique short names within 32 char limit
const generateShortId = () => Math.random().toString(36).substring(2, 8);

describe("Role Permission Integration Tests", () => {
    let authToken: string;
    let testRole: Role;
    let testPermission: Permission;
    let adminUser: User;
    let testUser: User;

    beforeAll(async () => {
        await setupTestDatabase();
        const hashedPassword = await bcrypt.hash("TestPass123!", 10);

        // Create test role
        testRole = await Role.create({
            name: "rp_test_" + generateShortId(),
            description: "Test role for role permission tests",
        });

        // Create test permission
        testPermission = await Permission.create({
            name: "tp_" + generateShortId(),
            description: "Test permission",
        });

        // Create admin user with permission to manage role permissions
        adminUser = await User.create({
            employee_id: 1001,
            phone: "09121111111",
            login_id: "admin_" + generateShortId(),
            hashed_password: hashedPassword,
        });

        await adminUser.assignPermission("role_permission.index", true);
        await adminUser.assignPermission("role_permission.assign", true);
        await adminUser.assignPermission("role_permission.remove", true);

        // Create regular test user
        testUser = await User.create({
            employee_id: 1002,
            phone: "09122222222",
            login_id: "user_" + generateShortId(),
            hashed_password: hashedPassword,
        });

        // Login as admin to get auth token
        const loginResponse = await request(app)
            .post("/auth/login")
            .send({ login_id: adminUser.login_id, password: "TestPass123!" });

        expect(loginResponse.status).toBe(200);
        authToken = loginResponse.body.token;
    });

    describe("GET /role-permission/:id - Index role permissions", () => {
        it("returns 400 when role ID is not provided", async () => {
            const response = await request(app)
                .get("/role-permission/")
                .set("Authorization", `Bearer ${authToken}`);

            expect(response.status).toBe(404);
        });

        it("returns 401 when authorization header is missing", async () => {
            const response = await request(app).get(`/role-permission/${testRole.id}`);

            expect(response.status).toBe(401);
            expect(response.body.message).toBe("Authentication Failed");
        });

        it("returns 401 when authorization token is invalid", async () => {
            const response = await request(app)
                .get(`/role-permission/${testRole.id}`)
                .set("Authorization", "Bearer invalid-token");

            expect(response.status).toBe(401);
            expect(response.body.message).toBe("Authentication Failed");
        });

        it("returns 404 when role does not exist", async () => {
            const response = await request(app)
                .get("/role-permission/99999")
                .set("Authorization", `Bearer ${authToken}`);

            expect(response.status).toBe(404);
            expect(response.body.message).toContain("پیدا نشد");
        });

        it("returns empty permissions array for role with no permissions assigned", async () => {
            const response = await request(app)
                .get(`/role-permission/${testRole.id}`)
                .set("Authorization", `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.permissions).toEqual([]);
        });

        it("returns all permissions assigned to a role", async () => {
            // Create another permission
            const permission1 = await Permission.create({
                name: "trd_" + generateShortId(),
                description: "Test read permission",
            });

            const permission2 = await Permission.create({
                name: "twr_" + generateShortId(),
                description: "Test write permission",
            });

            // Assign permissions to role
            await RolePermission.create({
                role_id: testRole.id,
                permission_id: permission1.id,
                allow: true,
            });

            await RolePermission.create({
                role_id: testRole.id,
                permission_id: permission2.id,
                allow: false,
            });

            const response = await request(app)
                .get(`/role-permission/${testRole.id}`)
                .set("Authorization", `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.permissions).toHaveLength(2);
            expect(response.body.permissions).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: permission1.name,
                        allow: true,
                    }),
                    expect.objectContaining({
                        name: permission2.name,
                        allow: false,
                    }),
                ]),
            );
        });
    });

    describe("PUT /role-permission/:id - Assign permission to role", () => {
        it("returns 401 when authorization header is missing", async () => {
            const response = await request(app)
                .put(`/role-permission/${testRole.id}`)
                .send({ permission_name: testPermission.name, allow: true });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe("Authentication Failed");
        });

        it("returns 401 when authorization token is invalid", async () => {
            const response = await request(app)
                .put(`/role-permission/${testRole.id}`)
                .set("Authorization", "Bearer invalid-token")
                .send({ permission_name: testPermission.name, allow: true });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe("Authentication Failed");
        });

        it("returns 400 when role ID is not provided", async () => {
            const response = await request(app)
                .put("/role-permission/")
                .set("Authorization", `Bearer ${authToken}`)
                .send({ permission_name: testPermission.name, allow: true });

            expect(response.status).toBe(404);
        });

        it("returns 404 when role does not exist", async () => {
            const response = await request(app)
                .put("/role-permission/99999")
                .set("Authorization", `Bearer ${authToken}`)
                .send({ permission_name: testPermission.name, allow: true });

            expect(response.status).toBe(404);
            expect(response.body.message).toContain("پیدا نشد");
        });

        it("returns 400 when permission_name is missing from request body", async () => {
            const response = await request(app)
                .put(`/role-permission/${testRole.id}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ allow: true });

            expect(response.status).toBe(400);
        });

        it("returns 400 when allow is missing from request body", async () => {
            const response = await request(app)
                .put(`/role-permission/${testRole.id}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ permission_name: testPermission.name });

            expect(response.status).toBe(400);
        });

        it("returns 400 when permission_name is empty string", async () => {
            const response = await request(app)
                .put(`/role-permission/${testRole.id}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ permission_name: "", allow: true });

            expect(response.status).toBe(400);
        });

        it("returns 400 when allow is not a boolean", async () => {
            const response = await request(app)
                .put(`/role-permission/${testRole.id}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ permission_name: testPermission.name, allow: "yes" });

            expect(response.status).toBe(400);
        });

        it("successfully assigns a new permission to a role with allow=true", async () => {
            const newRole = await Role.create({
                name: "asn_" + generateShortId(),
                description: "Test role for assign",
            });

            const response = await request(app)
                .put(`/role-permission/${newRole.id}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ permission_name: testPermission.name, allow: true });

            expect(response.status).toBe(200);
            expect(response.body.message).toContain("اختصاص داده شد");

            // Verify permission was assigned
            const assigned = await RolePermission.findOne({
                where: { role_id: newRole.id, permission_id: testPermission.id },
            });

            expect(assigned).toBeDefined();
            expect(assigned!.allow).toBe(true);
        });

        it("successfully assigns a new permission to a role with allow=false", async () => {
            const newRole = await Role.create({
                name: "asf_" + generateShortId(),
                description: "Test role for assign with allow false",
            });

            const response = await request(app)
                .put(`/role-permission/${newRole.id}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ permission_name: testPermission.name, allow: false });

            expect(response.status).toBe(200);
            expect(response.body.message).toContain("اختصاص داده شد");

            // Verify permission was assigned with allow=false
            const assigned = await RolePermission.findOne({
                where: { role_id: newRole.id, permission_id: testPermission.id },
            });

            expect(assigned).toBeDefined();
            expect(assigned!.allow).toBe(false);
        });

        it("updates existing permission allow value for a role", async () => {
            const newRole = await Role.create({
                name: "upd_" + generateShortId(),
                description: "Test role for update",
            });

            // First assign with allow=false
            await request(app)
                .put(`/role-permission/${newRole.id}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ permission_name: testPermission.name, allow: false });

            // Verify initial state
            let assigned = await RolePermission.findOne({
                where: { role_id: newRole.id, permission_id: testPermission.id },
            });
            expect(assigned!.allow).toBe(false);

            // Update to allow=true
            const updateResponse = await request(app)
                .put(`/role-permission/${newRole.id}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ permission_name: testPermission.name, allow: true });

            expect(updateResponse.status).toBe(200);

            // Verify update
            assigned = await RolePermission.findOne({
                where: { role_id: newRole.id, permission_id: testPermission.id },
            });
            expect(assigned!.allow).toBe(true);
        });

        it("handles whitespace trimming in permission_name", async () => {
            const newRole = await Role.create({
                name: "trm_" + generateShortId(),
                description: "Test role for trim",
            });

            const response = await request(app)
                .put(`/role-permission/${newRole.id}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ permission_name: `  ${testPermission.name}  `, allow: true });

            expect(response.status).toBe(200);

            // Verify permission was assigned
            const assigned = await RolePermission.findOne({
                where: { role_id: newRole.id, permission_id: testPermission.id },
            });

            expect(assigned).toBeDefined();
        });
    });

    describe("DELETE /role-permission/:id - Remove permission from role", () => {
        it("returns 401 when authorization header is missing", async () => {
            const response = await request(app)
                .delete(`/role-permission/${testRole.id}`)
                .send({ permission_name: testPermission.name });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe("Authentication Failed");
        });

        it("returns 401 when authorization token is invalid", async () => {
            const response = await request(app)
                .delete(`/role-permission/${testRole.id}`)
                .set("Authorization", "Bearer invalid-token")
                .send({ permission_name: testPermission.name });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe("Authentication Failed");
        });

        it("returns 400 when role ID is not provided", async () => {
            const response = await request(app)
                .delete("/role-permission/")
                .set("Authorization", `Bearer ${authToken}`)
                .send({ permission_name: testPermission.name });

            expect(response.status).toBe(404);
        });

        it("returns 404 when role does not exist", async () => {
            const response = await request(app)
                .delete("/role-permission/99999")
                .set("Authorization", `Bearer ${authToken}`)
                .send({ permission_name: testPermission.name });

            expect(response.status).toBe(404);
            expect(response.body.message).toContain("پیدا نشد");
        });

        it("returns 400 when permission_name is missing from request body", async () => {
            const response = await request(app)
                .delete(`/role-permission/${testRole.id}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({});

            expect(response.status).toBe(400);
        });

        it("returns 400 when permission_name is empty string", async () => {
            const response = await request(app)
                .delete(`/role-permission/${testRole.id}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ permission_name: "" });

            expect(response.status).toBe(400);
        });

        it("successfully removes an assigned permission from a role", async () => {
            const newRole = await Role.create({
                name: "rem_" + generateShortId(),
                description: "Test role for remove",
            });

            // First assign a permission
            await RolePermission.create({
                role_id: newRole.id,
                permission_id: testPermission.id,
                allow: true,
            });

            // Verify it's assigned
            let assigned = await RolePermission.findOne({
                where: { role_id: newRole.id, permission_id: testPermission.id },
            });
            expect(assigned).toBeDefined();

            // Remove permission
            const response = await request(app)
                .delete(`/role-permission/${newRole.id}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ permission_name: testPermission.name });

            expect(response.status).toBe(200);
            expect(response.body.message).toContain("حذف شد");

            // Verify permission was removed
            assigned = await RolePermission.findOne({
                where: { role_id: newRole.id, permission_id: testPermission.id },
            });
            expect(assigned).toBeNull();
        });

        it("returns 200 when removing a permission that is not assigned to role", async () => {
            const newRole = await Role.create({
                name: "rem_ne_" + generateShortId(),
                description: "Test role for removing non-existent permission",
            });

            const response = await request(app)
                .delete(`/role-permission/${newRole.id}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ permission_name: testPermission.name });

            // Permission Service returns silently for non-existent permissions
            expect(response.status).toBe(200);
        });

        it("successfully removes one permission while keeping others", async () => {
            const newRole = await Role.create({
                name: "rem_pt_" + generateShortId(),
                description: "Test role for partial removal",
            });

            const perm1 = await Permission.create({
                name: "tp1_" + generateShortId(),
                description: "Test permission 1",
            });

            const perm2 = await Permission.create({
                name: "tp2_" + generateShortId(),
                description: "Test permission 2",
            });

            // Assign both permissions
            await RolePermission.create({
                role_id: newRole.id,
                permission_id: perm1.id,
                allow: true,
            });

            await RolePermission.create({
                role_id: newRole.id,
                permission_id: perm2.id,
                allow: true,
            });

            // Remove first permission
            const response = await request(app)
                .delete(`/role-permission/${newRole.id}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ permission_name: perm1.name });

            expect(response.status).toBe(200);

            // Verify first is removed, second remains
            const removed = await RolePermission.findOne({
                where: { role_id: newRole.id, permission_id: perm1.id },
            });
            expect(removed).toBeNull();

            const remaining = await RolePermission.findOne({
                where: { role_id: newRole.id, permission_id: perm2.id },
            });
            expect(remaining).toBeDefined();
        });
    });

    describe("Permission middleware authorization", () => {
        it("returns 403 when user does not have role_permission.index permission", async () => {
            const hashedPassword = await bcrypt.hash("TestPass123!", 10);
            const unauthorizedUser = await User.create({
                employee_id: 1003,
                phone: "09123333333",
                login_id: "unauth1_" + generateShortId(),
                hashed_password: hashedPassword,
            });

            const loginResponse = await request(app)
                .post("/auth/login")
                .send({ login_id: unauthorizedUser.login_id, password: "TestPass123!" });

            const unauthorizedToken = loginResponse.body.token;

            const response = await request(app)
                .get(`/role-permission/${testRole.id}`)
                .set("Authorization", `Bearer ${unauthorizedToken}`);

            expect(response.status).toBe(403);
            expect(response.body.message).toContain("غیرمجاز");
        });

        it("returns 403 when user does not have role_permission.assign permission", async () => {
            const hashedPassword = await bcrypt.hash("TestPass123!", 10);
            const unauthorizedUser = await User.create({
                employee_id: 1004,
                phone: "09124444444",
                login_id: "unauth2_" + generateShortId(),
                hashed_password: hashedPassword,
            });

            // Give only index permission, not assign
            await unauthorizedUser.assignPermission("role_permission.index", true);

            const loginResponse = await request(app)
                .post("/auth/login")
                .send({ login_id: unauthorizedUser.login_id, password: "TestPass123!" });

            const unauthorizedToken = loginResponse.body.token;

            const response = await request(app)
                .put(`/role-permission/${testRole.id}`)
                .set("Authorization", `Bearer ${unauthorizedToken}`)
                .send({ permission_name: testPermission.name, allow: true });

            expect(response.status).toBe(403);
            expect(response.body.message).toContain("غیرمجاز");
        });

        it("returns 403 when user does not have role_permission.remove permission", async () => {
            const hashedPassword = await bcrypt.hash("TestPass123!", 10);
            const unauthorizedUser = await User.create({
                employee_id: 1005,
                phone: "09125555555",
                login_id: "unauth3_" + generateShortId(),
                hashed_password: hashedPassword,
            });

            // Give only index permission, not remove
            await unauthorizedUser.assignPermission("role_permission.index", true);

            const loginResponse = await request(app)
                .post("/auth/login")
                .send({ login_id: unauthorizedUser.login_id, password: "TestPass123!" });

            const unauthorizedToken = loginResponse.body.token;

            const response = await request(app)
                .delete(`/role-permission/${testRole.id}`)
                .set("Authorization", `Bearer ${unauthorizedToken}`)
                .send({ permission_name: testPermission.name });

            expect(response.status).toBe(403);
            expect(response.body.message).toContain("غیرمجاز");
        });
    });
});
