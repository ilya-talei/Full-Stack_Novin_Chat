import { Router } from "express";
import ChatController, { chatAvatarUpload, chatMediaUpload } from "../controllers/chatController.js";

const router: Router = Router();
const chatController = new ChatController();

router.get("/", chatController.index);
router.post("/private", chatController.startPrivate);
router.post("/conversations/start", chatController.startPrivate);
router.get("/:chatId", chatController.show);
router.post("/", chatController.create);
router.put("/:chatId", chatController.update);
router.post("/:chatId/read", chatController.markRead);
router.put("/:chatId/avatar", chatAvatarUpload.single("avatar"), chatController.uploadAvatar);
router.post("/:chatId/media", chatMediaUpload.single("file"), chatController.uploadMedia);
router.get("/:chatId/media/:fileName", chatController.getMedia);

export default router;
