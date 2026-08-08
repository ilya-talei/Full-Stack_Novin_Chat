module.exports = {
    async up(queryInterface) {
        await queryInterface.bulkInsert("services", [
            {
                name: "tenant-core",
                secret: "tenant-core-1234567890",
            },
        ]);
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete("services", {
            name: "tenant-core",
        });
    },
};
