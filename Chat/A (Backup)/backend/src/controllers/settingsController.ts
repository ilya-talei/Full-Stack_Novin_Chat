import type { Request, Response, NextFunction } from "express";
import { AppError } from "../middlewares/errorMiddleware.js";
import z from "zod";

class SettingsController {
    get = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const prefs = await req.tenant!.services.SettingsService.getPrefs(req.userId!);
            res.status(200).json({ prefs, data: prefs });
        } catch (error) {
            next(error);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
                throw new AppError("بدنه درخواست نامعتبر است", 400);
            }
            const prefs = await req.tenant!.services.SettingsService.updatePrefs(
                req.userId!,
                req.body as Record<string, unknown>,
            );
            res.status(200).json({ prefs, data: prefs, success: true });
        } catch (error) {
            next(error);
        }
    };

    listSessions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sessions = await req.tenant!.services.SessionService.listActiveSessions(
                req.userId!,
                req.sessionId!,
            );
            res.status(200).json({ sessions, data: sessions });
        } catch (error) {
            next(error);
        }
    };

    terminateOthers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await req.tenant!.services.SessionService.terminateOtherSessions(
                req.userId!,
                req.sessionId!,
            );
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}

export default new SettingsController();

// keep zod import for future validation expansion
void z;
