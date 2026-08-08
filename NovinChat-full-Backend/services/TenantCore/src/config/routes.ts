import { Router } from "express";
import userRoutes from "../modules/User/routes.js";
import authRoutes from "../modules/Auth/routes.js";
import userPermissionRoutes from "../modules/UserPermission/routes.js";
import rolePermissionRoutes from "../modules/RolePermission/routes.js";

const router: Router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/user-permission", userPermissionRoutes);
router.use("/role-permission", rolePermissionRoutes);

export default router;
