import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createReadStream, existsSync } from "fs";
import type { Readable } from "stream";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../uploads/user-avatars");

export async function saveLocalUserAvatar(opts: {
  tenantId: number;
  userId: number;
  buffer: Buffer;
}) {
  const dir = path.join(ROOT, String(opts.tenantId));
  await fs.mkdir(dir, { recursive: true });
  const fileName = `${opts.userId}-${Date.now()}.webp`;
  await fs.writeFile(path.join(dir, fileName), opts.buffer);
  return { fileName };
}

export function openLocalUserAvatar(
  tenantId: number,
  fileName: string,
): Readable | null {
  const full = path.join(ROOT, String(tenantId), path.basename(fileName));
  if (!full.startsWith(ROOT) || !existsSync(full)) return null;
  return createReadStream(full);
}
