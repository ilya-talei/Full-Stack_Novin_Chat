import { Router } from "express";
import chatRoutes from "./chatRoutes.js";
import messageRoutes from "./messageRoutes.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router: Router = Router();

router.use("/chats", authMiddleware, chatRoutes);
router.use("/messages", authMiddleware, messageRoutes);

export default router;
