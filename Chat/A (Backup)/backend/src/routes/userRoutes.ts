import { Router } from "express";
import userController, { userAvatarUpload } from "../controllers/userController.js";
import settingsController from "../controllers/settingsController.js";

const router = Router();

router.get("/profile", userController.me);
router.get("/me", userController.me);
router.put("/profile", userController.updateProfile);
router.patch("/profile", userController.updateProfile);
router.post("/change-password", userController.changePassword);
router.get("/search", userController.search);
router.get("/:id/profile", userController.publicProfile);
router.delete("/account", userController.deleteAccount);
router.put("/me/avatar", userAvatarUpload.single("avatar"), userController.uploadAvatar);
router.put("/avatar", userAvatarUpload.single("avatar"), userController.uploadAvatar);

router.get("/settings", settingsController.get);
router.put("/settings", settingsController.update);
router.patch("/settings", settingsController.update);
router.get("/sessions", settingsController.listSessions);
router.post("/sessions/terminate-others", settingsController.terminateOthers);

export default router;
