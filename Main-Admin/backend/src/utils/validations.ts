import z from "zod";

export const indexValidationSchema = z.object({
    page: z.string().trim().optional(),
    limit: z.string().trim().optional(),
    search: z.string().trim().max(64, "جستجو نمیتواند بیشتر از ۶۴ کاراکتر باشد").optional(),
});
