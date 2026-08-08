import type { Request, Response, NextFunction } from "express";

class ProfileController {
    logout = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await req.tenant!.services.profile.logout(req.session!);

            res.clearCookie("secret", {
                httpOnly: true,
                secure: process.env.NODE_ENV !== "development",
                sameSite: "strict",
                path: "/",
            });
            res.clearCookie("token", {
                httpOnly: true,
                secure: process.env.NODE_ENV !== "development",
                sameSite: "strict",
                path: "/",
            });

            res.json({});
        } catch (error) {
            next(error);
        }
    };
}

export default new ProfileController();
