import { Router } from "express";
import LocalAuthController from "../controllers/localAuthController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router: Router = Router();
const authController = new LocalAuthController();

router.post("/login", authController.login);
router.post("/token", authController.token);
router.post("/refresh", authController.token);
router.get("/me", authMiddleware, authController.me);
router.post("/logout", authMiddleware, authController.logout);

export default router;
