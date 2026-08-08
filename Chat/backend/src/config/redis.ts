import Redis from "ioredis";

const host = process.env.REDIS_HOST ?? "127.0.0.1";
const port = Number(process.env.REDIS_PORT ?? 6379);
const password = process.env.REDIS_PASSWORD;
const localMode = process.env.LOCAL_MODE === "true";

/** Minimal in-memory Redis subset used by SocketService / controllers in LOCAL_MODE. */
class MemoryRedis {
    private sets = new Map<string, Set<string>>();
    private scripts = new Map<string, string>();
    private scriptCounter = 0;
    status = "ready";

    on(_event: string, _handler: (...args: unknown[]) => void) {
        return this;
    }

    private getSet(key: string) {
        let set = this.sets.get(key);
        if (!set) {
            set = new Set();
            this.sets.set(key, set);
        }
        return set;
    }

    async sadd(key: string, ...members: (string | number)[]) {
        const set = this.getSet(key);
        let added = 0;
        for (const member of members) {
            const value = String(member);
            if (!set.has(value)) {
                set.add(value);
                added += 1;
            }
        }
        return added;
    }

    async srem(key: string, ...members: (string | number)[]) {
        const set = this.sets.get(key);
        if (!set) return 0;
        let removed = 0;
        for (const member of members) {
            if (set.delete(String(member))) removed += 1;
        }
        if (set.size === 0) this.sets.delete(key);
        return removed;
    }

    async scard(key: string) {
        return this.sets.get(key)?.size ?? 0;
    }

    async smembers(key: string) {
        return [...(this.sets.get(key) ?? [])];
    }

    async script(subcommand: string, scriptBody?: string) {
        if (subcommand === "LOAD" && scriptBody) {
            const sha = `mem-${++this.scriptCounter}`;
            this.scripts.set(sha, scriptBody);
            return sha;
        }
        throw new Error(`Unsupported MEMORY redis SCRIPT ${subcommand}`);
    }

    async evalsha(sha: string, numKeys: number, ...args: (string | number)[]) {
        const body = this.scripts.get(sha);
        if (!body) throw new Error(`Unknown script sha ${sha}`);

        const keys = args.slice(0, numKeys).map(String);
        const argv = args.slice(numKeys).map(String);

        // Match the two Lua scripts used by SocketService.
        if (body.includes("sadd") && body.includes("ARGV[2]") && !body.includes("srem")) {
            await this.sadd(keys[0]!, argv[0]!);
            await this.sadd(keys[1]!, argv[1]!);
            return 1;
        }

        if (body.includes("srem") && body.includes("scard")) {
            await this.srem(keys[0]!, argv[0]!);
            const remaining = await this.scard(keys[0]!);
            if (remaining === 0) {
                await this.srem(keys[1]!, argv[1]!);
            }
            return remaining;
        }

        throw new Error("Unsupported MEMORY redis EVALSHA script");
    }

    async ping() {
        return "PONG";
    }

    async quit() {
        return "OK";
    }

    disconnect() {
        this.sets.clear();
    }
}

export type RedisLike = Redis | MemoryRedis;

export function getRedisUrl(): string {
    if (password) {
        return `redis://:${encodeURIComponent(password)}@${host}:${port}`;
    }
    return `redis://${host}:${port}`;
}

async function createRedisClient(): Promise<RedisLike> {
    const client = new Redis.Redis({
        host,
        port,
        ...(password ? { password } : {}),
        maxRetriesPerRequest: null,
        lazyConnect: true,
        enableOfflineQueue: false,
        retryStrategy: localMode ? () => null : undefined,
    });

    client.on("error", (err) => {
        if (!localMode) {
            console.error(`Redis Client Error: ${err.message}`);
        }
    });

    try {
        await Promise.race([
            client.connect().then(() => client.ping()),
            new Promise((_, reject) => {
                setTimeout(() => reject(new Error("Redis connect timeout")), localMode ? 1500 : 8000);
            }),
        ]);
        console.log(`Redis connected at ${host}:${port}`);
        return client;
    } catch (error) {
        client.disconnect();
        if (!localMode) {
            throw error;
        }
        console.warn(
            `Redis unavailable at ${host}:${port}. LOCAL_MODE fallback: in-memory store.`,
        );
        return new MemoryRedis();
    }
}

export const redisReady: Promise<RedisLike> = createRedisClient();

const redisProxy = new Proxy({} as RedisLike, {
    get(_target, prop, receiver) {
        throw new Error(
            `Redis used before ready. Await redisReady first (accessing "${String(prop)}").`,
        );
    },
});

let redisClient: RedisLike = redisProxy;

redisReady.then((client) => {
    redisClient = client;
});

const redis = new Proxy({} as RedisLike, {
    get(_target, prop, receiver) {
        const value = Reflect.get(redisClient as object, prop, receiver);
        return typeof value === "function" ? value.bind(redisClient) : value;
    },
});

export default redis;
