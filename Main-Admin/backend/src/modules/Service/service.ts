import Service from "../../database/models/service.js";
import { AppError } from "../../middlewares/errorMiddleware.js";

class ServiceService {
    static async generateToken(secret: string) {
        const service: Service | null = await Service.findOne({
            where: {
                secret: secret,
            },
        });

        if (!service) {
            throw new AppError("Authentication Failed", 401);
        }

        const jwtToken: string = service.generateNewJwt();

        return jwtToken;
    }
}

export default ServiceService;
