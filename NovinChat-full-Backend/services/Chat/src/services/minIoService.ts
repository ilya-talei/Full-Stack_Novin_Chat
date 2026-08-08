import * as minio from "minio";
import type { Tenant } from "../middlewares/tenantMiddleware.js";

export interface MinIOClientOptions {
    endpoint: string;
    port: number,
    accessKey: string;
    secretKey: string;
    pathStyle: boolean;
}

class MinIOService {
    private static clients: Map<string, minio.Client> = new Map();
    constructor(
        private minioClient: minio.Client,
        private tenant: Tenant,
    ) {}

    private static getKey(options: MinIOClientOptions): string {
        return [options.endpoint, options.port, options.accessKey, options.secretKey, options.pathStyle].join(
            "|",
        );
    }

    public static get(clientOptions: MinIOClientOptions, tenantId: number) {
        const clientKey = this.getKey(clientOptions);
        const client = this.clients.get(clientKey);
        if (client) {
            return client;
        }

        return this.makeClient(clientOptions, clientKey, tenantId);
    }

    public static async createIfNotExists(minioClient: minio.Client, bucketName: string){
        const bucketExists = await minioClient.bucketExists(bucketName);
        if(!bucketExists){
            await minioClient.makeBucket(bucketName);
        }
    }

    public static async makeClient(
        clientOptions: MinIOClientOptions,
        clientKey: string,
        tenantId: number,
    ) {
        const minioClient = new minio.Client({
            endPoint: clientOptions.endpoint,
            port: clientOptions.port ?? 9000,
            useSSL: false,
            accessKey: clientOptions.accessKey,
            secretKey: clientOptions.secretKey,
            pathStyle: clientOptions.pathStyle,
        });

        const avatarBucketName = `tenant-${tenantId}.chat_avatars`;
        await this.createIfNotExists(minioClient, avatarBucketName);

        const userAvatarBucketName = `tenant-${tenantId}.user_avatars`
        await this.createIfNotExists(minioClient, userAvatarBucketName);

        this.clients.set(clientKey, minioClient);

        return minioClient;
    }

    public async uploadChatAvatar(fileBuffer: Buffer<ArrayBufferLike>, chatId: number) {
        const fileName = `${chatId}-${new Date().getTime()}.webp`;
        await this.minioClient.putObject(
            `tenant-${this.tenant.data.id}.chat_avatars`,
            fileName,
            fileBuffer,
            fileBuffer.length,
            {
                "Content-Type": "image/webp",
            },
        );

        return fileName;
    }

    public async uploadUserAvatar(fileBuffer: Buffer<ArrayBufferLike>, userId: number) {
        const fileName = `${userId}-${new Date().getTime()}.webp`;
        await this.minioClient.putObject(
            `tenant-${this.tenant.data.id}.user_avatars`,
            fileName,
            fileBuffer,
            fileBuffer.length,
            {
                "Content-Type": "image/webp",
            },
        );

        return fileName;
    }
}

export default MinIOService;
