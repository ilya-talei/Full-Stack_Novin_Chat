import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import type { Readable } from "stream";
import { createReadStream, existsSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../uploads/chat-media");

function safeName(name: string) {
  return String(name || "file")
    .replace(/[^\w.\-]+/g, "_")
    .slice(0, 80);
}

export async function saveLocalChatMedia(opts: {
  tenantId: number;
  chatId: number;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const dir = path.join(ROOT, String(opts.tenantId), String(opts.chatId));
  await fs.mkdir(dir, { recursive: true });
  const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}-${safeName(opts.originalName)}`;
  const full = path.join(dir, fileName);
  await fs.writeFile(full, opts.buffer);
  return { fileName, absolutePath: full, mimeType: opts.mimeType };
}

export function localChatMediaPath(tenantId: number, chatId: number, fileName: string) {
  const full = path.join(ROOT, String(tenantId), String(chatId), path.basename(fileName));
  if (!full.startsWith(ROOT) || !existsSync(full)) return null;
  return full;
}

export function openLocalChatMedia(tenantId: number, chatId: number, fileName: string): Readable | null {
  const full = localChatMediaPath(tenantId, chatId, fileName);
  if (!full) return null;
  return createReadStream(full);
}

export function guessMimeFromName(fileName: string): string {
  const lower = String(fileName || "").toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}
