import type { Request, Response, NextFunction } from "express";

export class AppError extends Error {
    public status_code: number;
    constructor(message: string, status_code: number) {
        super(message);
        this.name = "App Error";
        this.status_code = status_code;
    }
}

const ErrorMiddleware = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const statusCode = err instanceof AppError ? err.status_code : 500;
    const isServerError = statusCode >= 500 && statusCode < 600;

    const message = isServerError
        ? "خطای سرور"
        : err instanceof AppError
          ? err.message
          : "خطای ناشناخته";

    if (isServerError) {
        req.log.error({ err });
    }

    res.status(statusCode).json({
        message,
    });
};

export default ErrorMiddleware;
