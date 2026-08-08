import { DataTypes, Model, type Optional } from "sequelize";
import sequelize from "../../config/db.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

interface ServiceAttributes {
    id: number;
    name: string;
    secret: string;
}

type ServiceCreationAttribtes = Optional<ServiceAttributes, "id" | "secret">;

class Service
    extends Model<ServiceAttributes, ServiceCreationAttribtes>
    implements ServiceAttributes
{
    declare id: number;
    declare name: string;
    declare secret: string;

    generateSecret() {
        this.secret = crypto.randomUUID();
        return this.secret;
    }

    generateNewJwt() {
        const jwtToken: string = jwt.sign(
            {
                service_id: this.id,
                service_name: this.name,
            },
            process.env.JWT_EC_PRIVATE_KEY!,
            { expiresIn: "5m", algorithm: "ES256" },
        );

        return jwtToken;
    }
}

Service.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        secret: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: "Service",
        tableName: "services",
        timestamps: false,
        hooks: {
            beforeCreate: (service: Service) => {
                service.generateSecret();
            },
        },
    },
);

export default Service;
