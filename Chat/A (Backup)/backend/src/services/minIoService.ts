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

        // Local mode: create a client without contacting MinIO until upload is used.
        if (process.env.LOCAL_MODE === "true") {
            const minioClient = new minio.Client({
                endPoint: clientOptions.endpoint,
                port: clientOptions.port ?? 9000,
                useSSL: false,
                accessKey: clientOptions.accessKey,
                secretKey: clientOptions.secretKey,
                pathStyle: clientOptions.pathStyle,
            });
            this.clients.set(clientKey, minioClient);
            return minioClient;
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

        const chatMediaBucketName = `tenant-${tenantId}.chat_media`;
        await this.createIfNotExists(minioClient, chatMediaBucketName);

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

    public async uploadChatMedia(
        fileBuffer: Buffer,
        opts: {
            chatId: number;
            userId: number;
            originalName: string;
            mimeType: string;
        },
    ) {
        const bucket = `tenant-${this.tenant.data.id}.chat_media`;
        await MinIOService.createIfNotExists(this.minioClient, bucket);

        const safeBase = String(opts.originalName || 'file')
            .replace(/[^\w.\-ء-یآابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی]+/gi, '_')
            .slice(0, 80);
        const ext =
            safeBase.includes('.')
                ? ''
                : mimeExt(opts.mimeType);
        const fileName = `${opts.chatId}-${opts.userId}-${Date.now()}-${safeBase}${ext}`;

        await this.minioClient.putObject(bucket, fileName, fileBuffer, fileBuffer.length, {
            'Content-Type': opts.mimeType || 'application/octet-stream',
        });

        return { fileName, bucket };
    }

    public async getChatMediaObject(fileName: string) {
        const bucket = `tenant-${this.tenant.data.id}.chat_media`;
        return this.minioClient.getObject(bucket, fileName);
    }

    public async statChatMedia(fileName: string) {
        const bucket = `tenant-${this.tenant.data.id}.chat_media`;
        return this.minioClient.statObject(bucket, fileName);
    }
}

function mimeExt(mime: string) {
    const map: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'video/mp4': '.mp4',
        'video/webm': '.webm',
        'audio/webm': '.webm',
        'audio/ogg': '.ogg',
        'audio/mpeg': '.mp3',
        'application/pdf': '.pdf',
    };
    return map[mime] || '';
}

export default MinIOService;
