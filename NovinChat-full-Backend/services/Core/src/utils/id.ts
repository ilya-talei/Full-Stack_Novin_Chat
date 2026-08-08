import type { Request } from "express";
import { AppError } from "../middlewares/errorMiddleware.js";

export function getValidatedIdParam(req: Pick<Request, "params">): number {
    const idParam = req.params.id;

    if (idParam === undefined || Array.isArray(idParam)) {
        throw new AppError("شناسه نامعتبر است", 400);
    }

    if (!/^\d+$/.test(idParam)) {
        throw new AppError("شناسه نامعتبر است", 400);
    }

    const id = Number(idParam);

    if (!Number.isInteger(id) || id < 1) {
        throw new AppError("شناسه نامعتبر است", 400);
    }

    return id;
}
