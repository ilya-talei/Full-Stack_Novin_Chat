import { Router } from "express";
import { userAvatarUpload } from "../controllers/userController.js";
import userController from "../controllers/userController.js";

const router = Router();

router.put("/:chatId/avatar", userAvatarUpload.single("avatar"), userController.uploadAvatar);

export default router;