const bcrypt = require("bcrypt");

module.exports = {
    async up(queryInterface) {
        const hashedPassword = await bcrypt.hash("amir1234", 10);

        await queryInterface.bulkInsert("users", [
            {
                id: 44,
                employee_id: 4,
                phone: "09158925214",
                login_id: "amirh",
                hashed_password: hashedPassword,
                last_login_at: new Date(),
                created_at: new Date(),
                updated_at: new Date(),
            },
        ]);
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete("users", { login_id: "amirh" });
    },
};
