import { Router } from "express";
import ProfileController from "./controller.js";
import { controllerErrorHandler } from "../../middlewares/errorMiddleware.js";

const router: Router = Router();

router.post("/logout", controllerErrorHandler(ProfileController.logout));

export default router;
