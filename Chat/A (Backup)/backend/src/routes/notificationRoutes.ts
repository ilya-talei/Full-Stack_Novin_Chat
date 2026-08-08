import { Router } from "express";
import notificationController from "../controllers/notificationController.js";

const router = Router();

router.get("/", notificationController.list);
router.post("/read-all", notificationController.markAllRead);
router.delete("/", notificationController.removeAll);
router.post("/:id/read", notificationController.markRead);
router.delete("/:id", notificationController.remove);

export default router;
