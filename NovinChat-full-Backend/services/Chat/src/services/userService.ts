import type { PrismaClient, User } from "../generated/prisma/client.js";
import { AppError } from "../middlewares/errorMiddleware.js";
import sharp from "sharp";
import type { Services } from "../middlewares/tenantMiddleware.js";

class UserService {
    public services?: Services;
    constructor(private prismaClient: PrismaClient) {}

    async getUserById(userId: number): Promise<User | null> {
        return await this.prismaClient.user.findUnique({
            where: {
                deleted_at: null,
                id: userId,
            },
        });
    }

    updateUserById(userId: number, data: object) {
        return this.prismaClient.user.update({
            where: {
                id: userId,
                deleted_at: null,
            },
            data: data,
        });
    }

    async createUserAvatar(userId: number, fileName: string){
        await this.prismaClient.userAvatar.create({
            data: {
                user_id: userId,
                avatar_file_name: fileName,
            },
        });
    }

    async uploadAvatar(file: Express.Multer.File, chatId: number, userId: number) {
        const user = await this.prismaClient.user.findFirst({
            where: {
                id: userId,
                deleted_at: null,
            },
        });
        if(user === undefined){
            throw new AppError('کاربر مورد نظر پیدا نشد', 404);
        }

        const sharpedImage = await sharp(file.buffer)
            .autoOrient()
            .resize({ width: 512, height: 512, fit: "cover" })
            .webp({
                quality: 80,
            })
            .toBuffer();

        const fileName = await this.services!.MinIOService.uploadUserAvatar(sharpedImage, chatId);

        await this.createUserAvatar(chatId, fileName);
    }
}

export default UserService;
