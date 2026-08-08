import { DataTypes, type QueryInterface } from "sequelize";

const migration = {
    async up(queryInterface: QueryInterface) {
        await queryInterface.createTable("services", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            secret: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
        });
    },
    async down(queryInterface: QueryInterface) {
        await queryInterface.dropTable("services");
    },
};

export default migration;
