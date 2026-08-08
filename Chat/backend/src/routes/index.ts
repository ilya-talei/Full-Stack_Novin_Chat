import { Router } from "express";
import chatRoutes from "./chatRoutes.js";
import messageRoutes from "./messageRoutes.js";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import contactRoutes from "./contactRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router: Router = Router();

if (process.env.LOCAL_MODE === "true") {
    router.use("/auth", authRoutes);
}

router.use("/chats", authMiddleware, chatRoutes);
router.use("/chat", authMiddleware, chatRoutes);
router.use("/messages", authMiddleware, messageRoutes);
router.use("/users", authMiddleware, userRoutes);
router.use("/contacts", authMiddleware, contactRoutes);
router.use("/notifications", authMiddleware, notificationRoutes);

export default router;
