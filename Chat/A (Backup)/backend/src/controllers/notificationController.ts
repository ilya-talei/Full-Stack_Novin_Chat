import type { Request, Response, NextFunction } from "express";
import { AppError } from "../middlewares/errorMiddleware.js";

class NotificationController {
    list = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const notifications = await req.tenant!.services.NotificationService.list(req.userId!);
            res.status(200).json({ notifications, data: notifications });
        } catch (error) {
            next(error);
        }
    };

    markRead = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = Number(req.params.id);
            if (!id) throw new AppError("شناسه نامعتبر است", 400);
            await req.tenant!.services.NotificationService.markAsRead(req.userId!, id);
            res.status(200).json({ success: true });
        } catch (error) {
            next(error);
        }
    };

    markAllRead = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await req.tenant!.services.NotificationService.markAllAsRead(req.userId!);
            res.status(200).json({ success: true });
        } catch (error) {
            next(error);
        }
    };

    remove = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = Number(req.params.id);
            if (!id) throw new AppError("شناسه نامعتبر است", 400);
            await req.tenant!.services.NotificationService.delete(req.userId!, id);
            res.status(200).json({ success: true });
        } catch (error) {
            next(error);
        }
    };

    removeAll = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await req.tenant!.services.NotificationService.deleteAll(req.userId!);
            res.status(200).json({ success: true });
        } catch (error) {
            next(error);
        }
    };
}

export default new NotificationController();
