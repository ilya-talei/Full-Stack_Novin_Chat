import type { NextFunction, Request, Response } from "express";
import z from "zod";
import { AppError } from "../middlewares/errorMiddleware.js";
import type { ChatSettingsInput, MemberUpdateInput } from "../services/chatManagementService.js";

const idSchema = z.coerce
    .number({
        error: "شناسه باید عدد باشد",
    })
    .int("شناسه باید عدد صحیح باشد")
    .positive("شناسه باید مثبت باشد");

const adminPermissionsSchema = z
    .object({
        change_info: z.boolean().optional(),
        post_messages: z.boolean().optional(),
        edit_messages: z.boolean().optional(),
        delete_messages: z.boolean().optional(),
        ban_users: z.boolean().optional(),
        invite_users: z.boolean().optional(),
        pin_messages: z.boolean().optional(),
        add_admins: z.boolean().optional(),
        manage_call: z.boolean().optional(),
        manage_topics: z.boolean().optional(),
        anonymous: z.boolean().optional(),
    })
    .strict();

const memberPermissionsSchema = z
    .object({
        send_messages: z.boolean().optional(),
        send_photos: z.boolean().optional(),
        send_videos: z.boolean().optional(),
        send_files: z.boolean().optional(),
        send_voice: z.boolean().optional(),
        send_video_messages: z.boolean().optional(),
        send_stickers: z.boolean().optional(),
        send_gifs: z.boolean().optional(),
        send_links: z.boolean().optional(),
        send_polls: z.boolean().optional(),
        add_members: z.boolean().optional(),
        change_info: z.boolean().optional(),
        pin_messages: z.boolean().optional(),
    })
    .strict();

const settingsSchema = z
    .object({
        chat_name: z
            .string()
            .trim()
            .min(2, "نام گفتگو حداقل ۲ نویسه است")
            .max(64, "نام گفتگو حداکثر ۶۴ نویسه است")
            .optional(),
        description: z.string().max(1024, "توضیحات حداکثر ۱۰۲۴ نویسه است").optional(),
        default_permissions: memberPermissionsSchema.optional(),
        slow_mode_seconds: z
            .number()
            .int("حالت آهسته باید عدد صحیح باشد")
            .min(0, "حالت آهسته نامعتبر است")
            .max(21600, "حالت آهسته حداکثر ۶ ساعت است")
            .optional(),
        is_public: z.boolean().optional(),
        public_username: z
            .string()
            .trim()
            .toLowerCase()
            .regex(/^[a-z][a-z0-9_]{4,31}$/, "نام کاربری عمومی باید ۵ تا ۳۲ نویسه لاتین باشد")
            .nullable()
            .optional(),
        history_visible: z.boolean().optional(),
        signatures_enabled: z.boolean().optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, "حداقل یک تنظیم باید ارسال شود");

const addMembersSchema = z
    .object({
        user_id: idSchema.optional(),
        user_ids: z
            .array(idSchema)
            .min(1, "حداقل یک کاربر انتخاب کنید")
            .max(100, "حداکثر ۱۰۰ کاربر مجاز است")
            .optional(),
    })
    .refine(
        (value) => value.user_id !== undefined || value.user_ids !== undefined,
        "شناسه کاربر الزامی است",
    );

const updateMemberSchema = z
    .object({
        role: z.enum(["admin", "member", "restricted"], "نقش نامعتبر است").optional(),
        custom_title: z
            .string()
            .trim()
            .max(32, "عنوان سفارشی حداکثر ۳۲ نویسه است")
            .nullable()
            .optional(),
        admin_permissions: adminPermissionsSchema.nullable().optional(),
        member_permissions: memberPermissionsSchema.nullable().optional(),
        banned_until: z.coerce.date("زمان محدودیت نامعتبر است").nullable().optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, "حداقل یک تغییر باید ارسال شود");

function parseId(value: string | string[] | undefined) {
    const parsed = idSchema.safeParse(value);
    if (!parsed.success) throw new AppError(parsed.error.issues[0]!.message, 400);
    return parsed.data;
}

function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0]!.message, 400);
    return parsed.data;
}

class ChatManagementController {
    managedChats = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await req.tenant!.services.ChatManagementService.managedChats(req.userId!);
            res.status(200).json({ data });
        } catch (error) {
            next(error);
        }
    };

    management = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await req.tenant!.services.ChatManagementService.management(
                req.userId!,
                parseId(req.params.chatId),
            );
            res.status(200).json({ data });
        } catch (error) {
            next(error);
        }
    };

    updateSettings = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await req.tenant!.services.ChatManagementService.updateSettings(
                req.userId!,
                parseId(req.params.chatId),
                parseBody(settingsSchema, req.body) as ChatSettingsInput,
            );
            res.status(200).json({ data, message: "تنظیمات گفتگو با موفقیت ذخیره شد" });
        } catch (error) {
            next(error);
        }
    };

    members = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await req.tenant!.services.ChatManagementService.members(
                req.userId!,
                parseId(req.params.chatId),
            );
            res.status(200).json({ data });
        } catch (error) {
            next(error);
        }
    };

    addMembers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const input = parseBody(addMembersSchema, req.body);
            const userIds = input.user_ids ?? [input.user_id!];
            const data = await req.tenant!.services.ChatManagementService.addMembers(
                req.userId!,
                parseId(req.params.chatId),
                userIds,
            );
            res.status(201).json({ data, message: "عضو با موفقیت اضافه شد" });
        } catch (error) {
            next(error);
        }
    };

    updateMember = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await req.tenant!.services.ChatManagementService.updateMember(
                req.userId!,
                parseId(req.params.chatId),
                parseId(req.params.userId),
                parseBody(updateMemberSchema, req.body) as MemberUpdateInput,
            );
            res.status(200).json({ data, message: "دسترسی عضو با موفقیت به‌روزرسانی شد" });
        } catch (error) {
            next(error);
        }
    };

    removeMember = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await req.tenant!.services.ChatManagementService.removeMember(
                req.userId!,
                parseId(req.params.chatId),
                parseId(req.params.userId),
            );
            res.status(200).json({ message: "عضو با موفقیت حذف شد" });
        } catch (error) {
            next(error);
        }
    };
}

export default ChatManagementController;
