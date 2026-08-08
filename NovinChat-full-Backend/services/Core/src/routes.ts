import { Router } from "express";
import userRoutes from "./modules/User/routes.js";
import userPermissionRoutes from "./modules/UserPermission/routes.js";
import rolePermissionRoutes from "./modules/RolePermission/routes.js";
import tenantRoutes from "./modules/Tenant/routes.js";
import profileRoutes from "./modules/Profile/routes.js";
import subscriptionRoutes from "./modules/Subscription/routes.js";

const router: Router = Router();

router.use("/users", userRoutes);
router.use("/user-permission", userPermissionRoutes);
router.use("/role-permission", rolePermissionRoutes);
router.use("/tenants", tenantRoutes);
router.use("/profile", profileRoutes);
router.use("/subscriptions", subscriptionRoutes);

export default router;
