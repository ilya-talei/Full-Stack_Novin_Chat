import { DataTypes, type QueryInterface } from "sequelize";

/** @type {import('sequelize-cli').Migration} */
const migration = {
    async up(queryInterface: QueryInterface) {
        await queryInterface.createTable("users", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            employee_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            phone: {
                type: DataTypes.STRING(11),
                unique: true,
            },
            role_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            login_id: {
                type: DataTypes.STRING(32),
                unique: true,
                allowNull: false,
            },
            hashed_password: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            last_login_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
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
        await queryInterface.dropTable("users");
    },
};

export default migration;
