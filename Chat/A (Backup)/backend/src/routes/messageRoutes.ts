import { Router } from "express";
import MessageController from "../controllers/messageController.js";

const router: Router = Router();
const messageController = new MessageController();

router.get("/", messageController.index);

export default router;
