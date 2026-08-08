import type { Sequelize } from "sequelize";
import { Op } from "sequelize";
import bcrypt from "bcrypt";
import { AppError } from "../../middlewares/errorMiddleware.js";
import type { Models } from "../../database/models/index.js";
import type User from "../../database/models/user.js";
import type { createValidationType, updateValidationType } from "./controller.js";

class UserService {
    models?: Models;
    constructor(private sequelize: Sequelize) {}
    async index(page: number, limit: number, search: string) {
        const offset: number = (page - 1) * limit;
        const searchNumber: number = parseInt(search);
        const users = await this.models!.User.findAndCountAll({
            where: {
                [Op.or]: [
                    {
                        login_id: {
                            [Op.like]: `%${search}%`,
                        },
                    },
                    {
                        phone: {
                            [Op.like]: `%${search}%`,
                        },
                    },
                    {
                        employee_id: isNaN(searchNumber) ? -1 : searchNumber,
                    },
                ],
            },
            offset: offset,
            limit: limit,
            order: [["created_at", "DESC"]],
            attributes: {
                exclude: ["hashed_password"],
            },
        });
        return users;
    }

    async show(id: number) {
        const user = await this.models!.User.findByPk(id, {
            attributes: {
                exclude: ["hashed_password"],
            },
        });
        return user;
    }

    async create(userData: createValidationType) {
        const data = {
            login_id: userData.login_id,
            phone: userData.phone,
            employee_id: userData.employee_id,
            hashed_password: await bcrypt.hash(userData.password, 10),
            active: userData.active ?? true,
        };
        const user = await this.models!.User.create(data);
        const u = user.get({ plain: true });
        const { id, login_id, phone, employee_id, active, created_at, updated_at } = u;
        return { id, login_id, phone, employee_id, active, created_at, updated_at };
    }

    async update(id: number, userData: updateValidationType) {
        const user = await this.models!.User.findByPk(id);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const { password, ...userDatasWithoutPassword } = userData;

        const filteredUserData = Object.fromEntries(
            Object.entries(userDatasWithoutPassword).filter(([_key, value]) => {
                return value !== undefined;
            }),
        );

        await user.update({
            ...filteredUserData,
            ...(password !== undefined && {
                hashed_password: await bcrypt.hash(password, 10),
            }),
        });
        await user.reload();
        const u = user.get({ plain: true });
        const { id: uid, login_id, phone, employee_id, active, created_at, updated_at } = u;
        return { id: uid, login_id, phone, employee_id, active, created_at, updated_at };
    }

    async delete(id: number) {
        const user = await this.models!.User.findByPk(id);
        if (!user) {
            throw new AppError("User not found", 404);
        }
        await user.destroy();
        return;
    }

    async changePassword(
        userId: number,
        currentPassword: string,
        newPassword: string,
    ): Promise<void> {
        const user: User | null = await this.models!.User.findByPk(userId);
        if (!user) {
            throw new AppError("کاربر پیدا نشد", 404);
        }

        const isMatch: boolean = await bcrypt.compare(currentPassword, user.hashed_password);
        if (!isMatch) {
            throw new AppError("رمز عبور فعلی اشتباه است", 400);
        }

        const hashed_password: string = await bcrypt.hash(newPassword, 10);

        await user.update({ hashed_password: hashed_password });
    }
}

export default UserService;
