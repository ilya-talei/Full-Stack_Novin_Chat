module.exports = {
    async up(queryInterface) {
        await queryInterface.bulkInsert("tenants", [
            {
                name: "localhost",
                domain: "localhost",
                db_name: "hello_db",
                minio: JSON.stringify({
                    endpoint: "127.0.0.1",
                    accessKey: "admin",
                    secretKey: "supersecret123",
                    pathStyle: true,
                }),
                creator_id: 44,
                created_at: new Date(),
                updated_at: new Date(),
                deleted_at: null,
            },
        ]);
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete("tenants", {
            name: "localhost",
        });
    },
};
