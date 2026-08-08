import { DataTypes, Model, type Optional } from "sequelize";
import sequelize from "../../config/db.js";

interface SessionAttributes {
    id: number;
    user_id: number;
    ip_address: string;
    user_agent: string;
    active: boolean;
    created_at?: Date;
    expire_at: Date;
}

type SessionCreationAttributes = Optional<
    SessionAttributes,
    "created_at" | "active" | "expire_at" | "id"
>;

class Session
    extends Model<SessionAttributes, SessionCreationAttributes>
    implements SessionAttributes
{
    declare id: number;
    declare user_id: number;
    declare ip_address: string;
    declare user_agent: string;
    declare active: boolean;
    declare created_at: Date;
    declare expire_at: Date;
}

Session.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "users",
                key: "id",
            },
            onDelete: "CASCADE",
        },
        ip_address: {
            type: DataTypes.STRING,
        },
        user_agent: {
            type: DataTypes.STRING,
        },
        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        // created_at: {
        //     type: DataTypes.DATE,
        //     allowNull: false,
        //     defaultValue: DataTypes.NOW,
        // },
        expire_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    },
    {
        sequelize,
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
        tableName: "sessions",
    },
);

export default Session;
