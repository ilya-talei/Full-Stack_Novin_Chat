import { AppError } from "../middlewares/errorMiddleware.js";

export type PaginationOptions = {
    defaultPage?: number;
    defaultLimit?: number;
    maxLimit?: number;
};

export function validatePagination(
    query: { page?: string; limit?: string },
    opts: PaginationOptions = {},
) {
    const DEFAULT_PAGE = opts.defaultPage ?? 1;
    const DEFAULT_LIMIT = opts.defaultLimit ?? 10;
    const MAX_LIMIT = opts.maxLimit ?? 50;

    const pageParam = query?.page;
    const limitParam = query?.limit;

    let page: number;
    let limit: number;

    if (pageParam === undefined || pageParam === null || pageParam === "") {
        page = DEFAULT_PAGE;
    } else {
        const pageRaw = Number(pageParam);
        if (!Number.isFinite(pageRaw)) {
            throw new AppError("صفحه نامعتبر است", 400);
        }
        if (!Number.isInteger(pageRaw) || pageRaw < 1) {
            throw new AppError("صفحه نامعتبر است", 400);
        }
        page = pageRaw;
    }

    if (limitParam === undefined || limitParam === null || limitParam === "") {
        limit = DEFAULT_LIMIT;
    } else {
        const limitRaw = Number(limitParam);
        if (!Number.isFinite(limitRaw)) {
            throw new AppError("محدودیت نامعتبر است", 400);
        }
        if (!Number.isInteger(limitRaw) || limitRaw < 1 || limitRaw > MAX_LIMIT) {
            throw new AppError("محدودیت نامعتبر است", 400);
        }
        limit = limitRaw;
    }

    return { page, limit };
}
