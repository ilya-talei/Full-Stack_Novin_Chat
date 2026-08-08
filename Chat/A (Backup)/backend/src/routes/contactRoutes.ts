import { Router } from "express";
import contactController from "../controllers/contactController.js";

const router = Router();

router.get("/", contactController.list);
router.post("/", contactController.add);
router.get("/search", contactController.search);
router.delete("/:id", contactController.remove);
router.post("/:id/block", contactController.block);

export default router;
