import { Router } from "express";
import ChatController, { chatAvatarUpload } from "../controllers/chatController.js";

const router: Router = Router();
const chatController = new ChatController();

router.get("/", chatController.index);
router.get("/:chatId", chatController.show);
router.post("/", chatController.create);
router.put("/:chatId", chatController.update);
router.put("/:chatId/avatar", chatAvatarUpload.single("avatar"), chatController.uploadAvatar);

export default router;
