import { describe, it, expect } from "vitest";
import { getValidatedIdParam } from "../src/utils/id.js";
import { AppError } from "../src/middlewares/errorMiddleware.js";

describe("getValidatedIdParam", () => {
    it("throws an AppError when the id param is missing", () => {
        expect(() => getValidatedIdParam({ params: {} } as any)).toThrowError(AppError);
    });

    it("returns a parsed positive integer when the id param is valid", () => {
        const id = getValidatedIdParam({ params: { id: "12" } } as any);

        expect(id).toBe(12);
    });
});
