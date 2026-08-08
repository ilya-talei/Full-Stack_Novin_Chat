import type { Request, Response, NextFunction, RequestHandler } from "express";

export class AppError extends Error {
    public status_code: number;
    constructor(message: string, status_code: number) {
        super(message);
        // this.name = "App Error";
        this.status_code = status_code;
    }
}

const ErrorMiddleware = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const status_code: number = err instanceof AppError ? err.status_code : 500;
    const message: string =
        status_code == 500 || !(err instanceof AppError)
            ? "خطای سرور"
            : err.message || "خطای ناشناخته";

    if (status_code == 500) {
        req.log.error(err);
    }

    res.status(status_code).json({
        message: message,
    });
};

export const controllerErrorHandler = (
    handler: RequestHandler,
): RequestHandler => {
    return async (req, res, next) => {
        try {
            await handler(req, res, next);
        } catch (error) {
            next(error);
        }
    };
};
export default ErrorMiddleware;
