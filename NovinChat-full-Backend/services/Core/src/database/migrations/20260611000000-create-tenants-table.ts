import { DataTypes, type QueryInterface } from "sequelize";

const migration = {
    async up(queryInterface: QueryInterface) {
        await queryInterface.createTable("tenants", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            domain: {
                type: DataTypes.STRING(64),
                unique: true,
                allowNull: false,
            },
            db_name: {
                type: DataTypes.STRING(64),
                unique: true,
                allowNull: false,
            },
            minio: {
                type: DataTypes.JSON,
                allowNull: false,
            },
            creator_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: "users",
                    key: "id",
                },
                onDelete: "SET NULL",
                onUpdate: "CASCADE",
            },
            active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
            deleted_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
        });
    },
    async down(queryInterface: QueryInterface) {
        await queryInterface.dropTable("tenants");
    },
};

export default migration;
