import type { Request, Response, NextFunction } from "express";

export class AppError extends Error {
    public status_code: number;
    constructor(message: string, status_code: number) {
        super(message);
        this.status_code = status_code;
    }
}

function isDatabaseUnreachable(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    const anyErr = err as {
        code?: string;
        name?: string;
        message?: string;
        meta?: { driverAdapterError?: { cause?: { kind?: string } } };
    };
    const kind = anyErr.meta?.driverAdapterError?.cause?.kind;
    if (kind === "DatabaseNotReachable") return true;
    if (anyErr.name === "PrismaClientInitializationError") return true;
    if (typeof anyErr.message === "string" && /Can't reach database server/i.test(anyErr.message)) {
        return true;
    }
    return false;
}

const ErrorMiddleware = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (isDatabaseUnreachable(err)) {
        req.log.error({ err }, "database unreachable");
        res.status(503).json({
            message:
                "دیتابیس در دسترس نیست. Docker Desktop را روشن کنید و در backend دستور npm run docker:up را بزنید.",
        });
        return;
    }

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
