import Product from "../../database/models/product.js";
import Subscription from "../../database/models/subscription.js";
import Tenant from "../../database/models/tenant.js";
import { AppError } from "../../middlewares/errorMiddleware.js";

class SubscriptionService {
    static async create(
        tenantId: number,
        productId: number,
        startDate: Date,
        endDate: Date,
        status: "active" | "inactive",
    ) {
        const tenant: Tenant | null = await Tenant.findByPk(tenantId);
        if (!tenant) {
            throw new AppError("مستاجر مورد نظر پیدا نشد", 404);
        }

        const product: Product | null = await Product.findByPk(productId);
        if (!product) {
            throw new AppError("محصول مورد نظر پیدا نشد", 404);
        }

        await Subscription.create({
            tenant_id: tenant.id,
            product_id: productId,
            start_date: startDate,
            end_date: endDate,
            status: status,
        });
    }

    static async update(
        subscriptionId: number,
        data: {
            productId?: number;
            endDate?: Date;
            status?: "active" | "inactive" | "expired" | "cancelled";
        },
    ) {
        const subscription: Subscription | null = await Subscription.findByPk(subscriptionId);
        if (!subscription) {
            throw new AppError("اشتراک مورد نظر پیدا نشد", 404);
        }

        await subscription.update(data);
    }
}

export default SubscriptionService;
