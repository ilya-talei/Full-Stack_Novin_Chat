import { Router } from "express";
import ChatController, {
    chatAvatarUpload,
    chatMediaUpload,
} from "../controllers/chatController.js";
import ChatManagementController from "../controllers/chatManagementController.js";

const router: Router = Router();
const chatController = new ChatController();
const managementController = new ChatManagementController();

router.get("/", chatController.index);
router.get("/manage", managementController.managedChats);
router.post("/private", chatController.startPrivate);
router.post("/conversations/start", chatController.startPrivate);
router.get("/:chatId/management", managementController.management);
router.put("/:chatId/settings", managementController.updateSettings);
router.get("/:chatId/members", managementController.members);
router.post("/:chatId/members", managementController.addMembers);
router.put("/:chatId/members/:userId", managementController.updateMember);
router.delete("/:chatId/members/:userId", managementController.removeMember);
router.get("/:chatId", chatController.show);
router.post("/", chatController.create);
router.put("/:chatId", chatController.update);
router.post("/:chatId/read", chatController.markRead);
router.put("/:chatId/avatar", chatAvatarUpload.single("avatar"), chatController.uploadAvatar);
router.post("/:chatId/media", chatMediaUpload.single("file"), chatController.uploadMedia);
router.get("/:chatId/media/:fileName", chatController.getMedia);

export default router;
