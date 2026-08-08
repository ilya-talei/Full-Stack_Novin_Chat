import Redis from "ioredis";

const redisClient = new Redis.Redis({
    host: "localhost",
    port: 6379,
    password: "amir1234",
});
redisClient.on("error", (err) => {
    throw new Error(`Redis Client Error ${err}`);
});

export default redisClient;
