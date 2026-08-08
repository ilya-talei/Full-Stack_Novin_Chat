import type { Request, Response, NextFunction } from "express";
import z from "zod";
import { AppError } from "../middlewares/errorMiddleware.js";
import redis from "../config/redis.js";

const addSchema = z
    .object({
        contactId: z.coerce.number().int().positive().optional(),
        contact_user_id: z.coerce.number().int().positive().optional(),
        username: z.string().min(3).max(32).optional(),
        login_id: z.string().min(3).max(32).optional(),
        name: z.string().optional(),
        phone: z.string().optional(),
    })
    .refine(
        (data) =>
            Boolean(
                data.contactId ||
                    data.contact_user_id ||
                    data.username ||
                    data.login_id,
            ),
        { message: "شناسه مخاطب الزامی است" },
    );

class ContactController {
    private async onlineSet(req: Request) {
        const onlineKey = `tenant:${req.tenant!.data.id}.online_users`;
        const online = await redis.smembers(onlineKey);
        return new Set(online.map(Number));
    }

    list = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const contacts = await req.tenant!.services.ContactService.list(
                req.userId!,
                await this.onlineSet(req),
            );
            res.status(200).json({ contacts, data: contacts });
        } catch (error) {
            next(error);
        }
    };

    add = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = addSchema.safeParse(req.body);
            if (!parsed.success) {
                throw new AppError(parsed.error.issues[0]!.message, 400);
            }

            const id = parsed.data.contactId ?? parsed.data.contact_user_id;
            const login = parsed.data.login_id ?? parsed.data.username;

            const contact = id
                ? await req.tenant!.services.ContactService.add(req.userId!, id)
                : await req.tenant!.services.ContactService.addByLoginId(req.userId!, login!);

            res.status(201).json(contact);
        } catch (error) {
            next(error);
        }
    };

    remove = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = Number(req.params.id);
            if (!id) throw new AppError("شناسه نامعتبر است", 400);
            const result = await req.tenant!.services.ContactService.remove(req.userId!, id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    block = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = Number(req.params.id);
            if (!id) throw new AppError("شناسه نامعتبر است", 400);
            const result = await req.tenant!.services.ContactService.block(req.userId!, id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    search = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const q = String(req.query.q ?? "");
            const contacts = await req.tenant!.services.ContactService.search(
                req.userId!,
                q,
                await this.onlineSet(req),
            );
            res.status(200).json({ contacts, data: contacts });
        } catch (error) {
            next(error);
        }
    };
}

export default new ContactController();
