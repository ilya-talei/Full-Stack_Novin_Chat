import type { Request, Response, NextFunction } from "express";
import ProfileService from "./service.js";

class ProfileController {
    logout = async (req: Request, res: Response, _next: NextFunction) => {
        await ProfileService.logout(req.session!);

        res.json({});
    };
}

export default new ProfileController();
