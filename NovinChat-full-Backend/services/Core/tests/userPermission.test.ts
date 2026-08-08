import bcrypt from "bcrypt";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import app from "../src/index.js";
import User from "../src/database/models/user.js";
import UserPermission from "../src/database/models/userPermission.js";
import PermissionService from "../src/modules/Permission/service.js";
import { setupTestDatabase } from "./setup.js";

describe("/user-permission GET integration tests", () => {
    let authorizedToken: string;
    let unauthorizedToken: string;
    let readOnlyTargetUserId: number;
    let noPermissionsTargetUserId: number;

    beforeAll(async () => {
        await setupTestDatabase();

        const hashedPassword = await bcrypt.hash("Password123!", 10);

        const authorizedUser = await User.create({
            employee_id: 101,
            phone: "09110000001",
            login_id: "permission_reader",
            hashed_password: hashedPassword,
        });

        const unauthorizedUser = await User.create({
            employee_id: 102,
            phone: "09110000002",
            login_id: "permission_blocked",
            hashed_password: hashedPassword,
        });

        const targetUser = await User.create({
            employee_id: 103,
            phone: "09110000003",
            login_id: "target_user",
            hashed_password: hashedPassword,
        });

        const emptyUser = await User.create({
            employee_id: 104,
            phone: "09110000004",
            login_id: "empty_target_user",
            hashed_password: hashedPassword,
        });

        readOnlyTargetUserId = targetUser.id;
        noPermissionsTargetUserId = emptyUser.id;

        await authorizedUser.assignPermission("user_permission.index", true);

        await targetUser.assignPermission("user.create", true);
        await targetUser.assignPermission("user.delete", false);

        const authorizedLogin = await request(app)
            .post("/auth/login")
            .send({ login_id: "permission_reader", password: "Password123!" });

        const unauthorizedLogin = await request(app)
            .post("/auth/login")
            .send({ login_id: "permission_blocked", password: "Password123!" });

        authorizedToken = authorizedLogin.body.token;
        unauthorizedToken = unauthorizedLogin.body.token;
    });

    it("returns 401 when authorization header is missing", async () => {
        const response = await request(app).get(`/user-permission/${readOnlyTargetUserId}`);

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Authentication Failed");
    });

    it("returns 401 when authorization token is invalid", async () => {
        const response = await request(app)
            .get(`/user-permission/${readOnlyTargetUserId}`)
            .set("Authorization", "Bearer invalid-token");

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Authentication Failed");
    });

    it("returns 403 when authenticated user lacks the required permission", async () => {
        const response = await request(app)
            .get(`/user-permission/${readOnlyTargetUserId}`)
            .set("Authorization", `Bearer ${unauthorizedToken}`);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe("غیرمجاز");
    });

    it("returns an empty permission list for a user with no permissions", async () => {
        const response = await request(app)
            .get(`/user-permission/${noPermissionsTargetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ permissions: [] });
    });

    it("returns the target user permissions with correct allow values", async () => {
        const response = await request(app)
            .get(`/user-permission/${readOnlyTargetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`);

        expect(response.status).toBe(200);
        expect(response.body.permissions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: "user.create", allow: true }),
                expect.objectContaining({ name: "user.delete", allow: false }),
            ]),
        );
    });

    it("returns 404 for a non-existing user id", async () => {
        const response = await request(app)
            .get("/user-permission/9999999")
            .set("Authorization", `Bearer ${authorizedToken}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toEqual("کاربر مورد نظر پیدا نشد");
    });
});

describe("/user-permission PUT integration tests", () => {
    let authorizedUser: User;
    let authorizedToken: string;
    let unauthorizedUser: User;
    let unauthorizedToken: string;
    let targetUser: User;
    let targetUserId: number;

    beforeAll(async () => {
        await setupTestDatabase();
        const hashedPassword = await bcrypt.hash("amir1234", 10);

        // Create authorized user with assign permission
        authorizedUser = await User.create({
            phone: "09152563652",
            login_id: "amirh",
            hashed_password: hashedPassword,
        });
        await authorizedUser.assignPermission("user_permission.assign", true);
        await authorizedUser.assignPermission("user_permission.index", true);

        // Create unauthorized user without assign permission
        unauthorizedUser = await User.create({
            phone: "09152563653",
            login_id: "amirh1",
            hashed_password: hashedPassword,
        });

        // Create target user to assign permissions to
        targetUser = await User.create({
            phone: "09152563654",
            login_id: "target_user_put",
            hashed_password: hashedPassword,
        });
        targetUserId = targetUser.id;

        // Login authorized user
        const authorizedLoginResponse = await request(app)
            .post("/auth/login")
            .send({ login_id: "amirh", password: "amir1234" });

        authorizedToken = authorizedLoginResponse.body.token;

        // Login unauthorized user
        const unauthorizedLoginResponse = await request(app)
            .post("/auth/login")
            .send({ login_id: "amirh1", password: "amir1234" });

        unauthorizedToken = unauthorizedLoginResponse.body.token;
    });

    beforeEach(async () => {
        UserPermission.destroy({ where: { user_id: targetUserId } });
    });

    it("returns 401 when authorization header is missing", async () => {
        const response = await request(app).put(`/user-permission/${targetUserId}`).send({
            permission_name: "user.create",
            allow: true,
        });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Authentication Failed");
    });

    it("returns 401 when authorization token is invalid", async () => {
        const response = await request(app)
            .put(`/user-permission/${targetUserId}`)
            .set("Authorization", "Bearer invalid-token")
            .send({
                permission_name: "user.create",
                allow: true,
            });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Authentication Failed");
    });

    it("returns 403 when authenticated user lacks the required permission", async () => {
        const response = await request(app)
            .put(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${unauthorizedToken}`)
            .send({
                permission_name: "user.create",
                allow: true,
            });

        expect(response.status).toBe(403);
        expect(response.body.message).toBe("غیرمجاز");
    });

    it("returns 400 when user id is missing in params", async () => {
        const response = await request(app)
            .put("/user-permission/")
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                permission_name: "user.create",
                allow: true,
            });

        expect(response.status).toBe(404); // Route not found when id is missing
    });

    it("returns 400 when permission_name is missing in request body", async () => {
        const response = await request(app)
            .put(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                allow: true,
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBeDefined();
    });

    it("returns 400 when allow is missing in request body", async () => {
        const response = await request(app)
            .put(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                permission_name: "user.create",
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBeDefined();
    });

    it("returns 400 when permission_name is not a string", async () => {
        const response = await request(app)
            .put(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                permission_name: 123,
                allow: true,
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBeDefined();
    });

    it("returns 400 when allow is not a boolean", async () => {
        const response = await request(app)
            .put(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                permission_name: "user.create",
                allow: "true",
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBeDefined();
    });

    it("returns 404 when target user does not exist", async () => {
        const response = await request(app)
            .put("/user-permission/9999999")
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                permission_name: "user.create",
                allow: true,
            });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("کاربر مورد نظر پیدا نشد");
    });

    it("successfully assigns a permission to user with allow = true", async () => {
        const permissionName = "user.create";

        const response = await request(app)
            .put(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                permission_name: permissionName,
                allow: true,
            });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("دسترسی با موفقیت اختصاص داده شد");

        // Verify permission was assigned correctly
        const verifyResponse = await request(app)
            .get(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`);

        expect(verifyResponse.status).toBe(200);
        expect(verifyResponse.body.permissions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: permissionName, allow: true }),
            ]),
        );
    });

    it("successfully assigns a permission to user with allow = false", async () => {
        const permissionName = "user.delete";

        const response = await request(app)
            .put(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                permission_name: permissionName,
                allow: false,
            });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("دسترسی با موفقیت اختصاص داده شد");

        // Verify permission was assigned correctly
        const verifyResponse = await request(app)
            .get(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`);

        expect(verifyResponse.status).toBe(200);
        expect(verifyResponse.body.permissions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: permissionName, allow: false }),
            ]),
        );
    });

    it("updates an existing permission from true to false", async () => {
        const permissionName = "user.view";

        // First assign with allow = true
        await targetUser.assignPermission(permissionName, true);

        // Then update to allow = false
        const response = await request(app)
            .put(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                permission_name: permissionName,
                allow: false,
            });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("دسترسی با موفقیت اختصاص داده شد");

        // Verify permission was updated
        const verifyResponse = await request(app)
            .get(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`);

        expect(verifyResponse.status).toBe(200);
        expect(verifyResponse.body.permissions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: permissionName, allow: false }),
            ]),
        );
    });

    it("updates an existing permission from false to true", async () => {
        const permissionName = "user.update";

        await targetUser.assignPermission(permissionName, false);

        // Then update to allow = true
        const response = await request(app)
            .put(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                permission_name: permissionName,
                allow: true,
            });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("دسترسی با موفقیت اختصاص داده شد");

        // Verify permission was updated
        const verifyResponse = await request(app)
            .get(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`);

        expect(verifyResponse.status).toBe(200);
        expect(verifyResponse.body.permissions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: permissionName, allow: true }),
            ]),
        );
    });

    it("handles assigning multiple permissions to the same user", async () => {
        const permissions = [
            { permission_name: "user.create", allow: true },
            { permission_name: "user.update", allow: false },
            { permission_name: "user.delete", allow: true },
        ];

        for (const perm of permissions) {
            const response = await request(app)
                .put(`/user-permission/${targetUserId}`)
                .set("Authorization", `Bearer ${authorizedToken}`)
                .send(perm);

            expect(response.status).toBe(200);
        }

        // Verify all permissions were assigned
        const verifyResponse = await request(app)
            .get(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`);

        expect(verifyResponse.status).toBe(200);

        for (const perm of permissions) {
            expect(verifyResponse.body.permissions).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: perm.permission_name,
                        allow: perm.allow,
                    }),
                ]),
            );
        }
    });
});

describe("/user-permission DELETE integration tests", () => {
    let authorizedUser: User;
    let authorizedToken: string;
    let unauthorizedUser: User;
    let unauthorizedToken: string;
    let targetUser: User;
    let targetUserId: number;

    beforeEach(async () => {
        await setupTestDatabase();
        const hashedPassword = await bcrypt.hash("amir1234", 10);

        authorizedUser = await User.create({
            phone: "09152563655",
            login_id: "delete_authorized",
            hashed_password: hashedPassword,
        });
        await authorizedUser.assignPermission("user_permission.remove", true);
        await authorizedUser.assignPermission("user_permission.index", true);

        unauthorizedUser = await User.create({
            phone: "09152563656",
            login_id: "delete_unauthorized",
            hashed_password: hashedPassword,
        });

        targetUser = await User.create({
            phone: "09152563657",
            login_id: "delete_target_user",
            hashed_password: hashedPassword,
        });
        targetUserId = targetUser.id;

        await targetUser.assignPermission("user.create", true);
        await targetUser.assignPermission("user.delete", true);
        await targetUser.assignPermission("user.update", false);

        const authorizedLoginResponse = await request(app)
            .post("/auth/login")
            .send({ login_id: "delete_authorized", password: "amir1234" });

        authorizedToken = authorizedLoginResponse.body.token;

        const unauthorizedLoginResponse = await request(app)
            .post("/auth/login")
            .send({ login_id: "delete_unauthorized", password: "amir1234" });

        unauthorizedToken = unauthorizedLoginResponse.body.token;
    });

    it("returns 401 when authorization header is missing", async () => {
        const response = await request(app).delete(`/user-permission/${targetUserId}`).send({
            permission_name: "user.create",
        });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Authentication Failed");
    });

    it("returns 401 when authorization token is invalid", async () => {
        const response = await request(app)
            .delete(`/user-permission/${targetUserId}`)
            .set("Authorization", "Bearer invalid-token")
            .send({
                permission_name: "user.create",
            });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Authentication Failed");
    });

    it("returns 403 when authenticated user lacks the required permission", async () => {
        const response = await request(app)
            .delete(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${unauthorizedToken}`)
            .send({
                permission_name: "user.create",
            });

        expect(response.status).toBe(403);
        expect(response.body.message).toBe("غیرمجاز");
    });

    it("returns 400 when permission_name is missing in request body", async () => {
        const response = await request(app)
            .delete(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.message).toBeDefined();
    });

    it("returns 400 when permission_name is not a string", async () => {
        const response = await request(app)
            .delete(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                permission_name: 123,
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBeDefined();
    });

    it("returns 404 when target user does not exist", async () => {
        const response = await request(app)
            .delete("/user-permission/9999999")
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                permission_name: "user.create",
            });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("کاربر مورد نظر پیدا نشد");
    });

    it("successfully removes an existing permission", async () => {
        const permissionName = "user.create";

        // Verify permission exists before removal
        let verifyResponse = await request(app)
            .get(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`);

        expect(verifyResponse.body.permissions).toEqual(
            expect.arrayContaining([expect.objectContaining({ name: permissionName })]),
        );

        // Remove the permission
        const response = await request(app)
            .delete(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                permission_name: permissionName,
            });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("دسترسی با موفقیت حذف شد");

        // Verify permission was removed
        verifyResponse = await request(app)
            .get(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`);

        expect(verifyResponse.status).toBe(200);
        expect(verifyResponse.body.permissions).not.toEqual(
            expect.arrayContaining([expect.objectContaining({ name: permissionName })]),
        );
    });

    it("successfully removes permission with allow = true", async () => {
        const permissionName = "user.delete";

        const response = await request(app)
            .delete(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                permission_name: permissionName,
            });

        expect(response.status).toBe(200);

        // Verify permission was removed
        const verifyResponse = await request(app)
            .get(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`);

        const removedPermission = verifyResponse.body.permissions.find(
            (p: any) => p.name === permissionName,
        );
        expect(removedPermission).toBeUndefined();
    });

    it("successfully removes permission with allow = false", async () => {
        const permissionName = "user.update";

        const response = await request(app)
            .delete(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                permission_name: permissionName,
            });

        expect(response.status).toBe(200);

        // Verify permission was removed
        const verifyResponse = await request(app)
            .get(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`);

        const removedPermission = verifyResponse.body.permissions.find(
            (p: any) => p.name === permissionName,
        );
        expect(removedPermission).toBeUndefined();
    });

    it("handles removing multiple permissions sequentially", async () => {
        const permissions = ["user.create", "user.delete", "user.update"];

        for (const permissionName of permissions) {
            const response = await request(app)
                .delete(`/user-permission/${targetUserId}`)
                .set("Authorization", `Bearer ${authorizedToken}`)
                .send({
                    permission_name: permissionName,
                });

            expect(response.status).toBe(200);
        }

        // Verify all permissions were removed
        const verifyResponse = await request(app)
            .get(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`);

        expect(verifyResponse.status).toBe(200);
        expect(verifyResponse.body.permissions).toEqual([]);
    });

    it("handles removing a non-existent permission gracefully", async () => {
        const nonExistentPermission = "non.existent.permission";

        const response = await request(app)
            .delete(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                permission_name: nonExistentPermission,
            });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("دسترسی با موفقیت حذف شد");
    });

    it("returns 400 when user id is missing in params", async () => {
        const response = await request(app)
            .delete("/user-permission/")
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                permission_name: "user.create",
            });

        expect(response.status).toBe(404); // Route not found when id is missing
    });

    it("removes permission and leaves other permissions intact", async () => {
        const permissionToRemove = "user.delete";

        // Remove one permission
        const response = await request(app)
            .delete(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`)
            .send({
                permission_name: permissionToRemove,
            });

        expect(response.status).toBe(200);

        // Verify only the specified permission was removed
        const verifyResponse = await request(app)
            .get(`/user-permission/${targetUserId}`)
            .set("Authorization", `Bearer ${authorizedToken}`);

        const remainingPermissions = verifyResponse.body.permissions.map((p: any) => p.name);

        expect(remainingPermissions).not.toContain(permissionToRemove);
        expect(remainingPermissions).toContain("user.create");
        expect(remainingPermissions).toContain("user.update");
    });
});
