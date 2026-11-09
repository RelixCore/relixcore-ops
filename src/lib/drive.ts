import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { prisma } from "./prisma";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.metadata.readonly";
export function driveConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.APP_URL && process.env.DRIVE_TOKEN_KEY);
}
export function appUrl() {
  const url = new URL(process.env.APP_URL!);
  if (url.protocol !== "https:" && url.hostname !== "localhost") throw new Error("APP_URL must use HTTPS.");
  return url.origin;
}
export function driveCallback() { return `${appUrl()}/api/integrations/google/callback`; }
function key() {
  const value = Buffer.from(process.env.DRIVE_TOKEN_KEY ?? "", "base64");
  if (value.length !== 32) throw new Error("Configure DRIVE_TOKEN_KEY with 32 random bytes encoded as base64.");
  return value;
}
export function seal(value: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}
export function unseal(value: string) {
  const data = Buffer.from(value, "base64url"), decipher = createDecipheriv("aes-256-gcm", key(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8");
}
export async function googleToken(values: Record<string, string>) {
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ ...values, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET! }), signal: AbortSignal.timeout(15000), cache: "no-store" });
  if (!response.ok) throw new Error("Google authorization failed. Reconnect your account.");
  return await response.json() as { access_token: string; refresh_token?: string; scope?: string };
}
export async function driveGet<T>(accessToken: string, resource: string, params: Record<string, string> = {}): Promise<T> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/${resource}?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15000), cache: "no-store" });
  if (!response.ok) throw new Error(response.status === 401 ? "Reconnect your Google account." : "Google Drive could not be read. Check access and try again.");
  return await response.json() as T;
}
export async function accessToken(userId: string) {
  const connection = await prisma.driveConnection.findUnique({ where: { userId } });
  if (!connection) throw new Error("Connect Google Drive first.");
  const result = await googleToken({ grant_type: "refresh_token", refresh_token: unseal(connection.refreshToken) });
  return result.access_token;
}

export type DriveFile = { id: string; name: string; mimeType: string; modifiedTime: string; parents?: string[] };
type Inventory = Record<string, DriveFile>;

export async function scanFolder(token: string, folderId: string, descendants: boolean) {
  const root = await driveGet<DriveFile & { trashed: boolean }>(token, `files/${encodeURIComponent(folderId)}`, { fields: "id,name,mimeType,trashed", supportsAllDrives: "true" });
  if (root.trashed || root.mimeType !== "application/vnd.google-apps.folder") throw new Error("The selected folder is no longer available.");
  const result: Inventory = {}, queue = [folderId], seen = new Set<string>();
  const deadline = Date.now() + 45_000;
  while (queue.length) {
    const folder = queue.shift()!;
    if (seen.has(folder)) continue;
    seen.add(folder);
    let pageToken: string | undefined;
    do {
      if (Date.now() > deadline || seen.size > 100 || Object.keys(result).length > 2000) throw new Error("This folder is too large for one check. Monitor smaller folders separately.");
      const page: { files: DriveFile[]; nextPageToken?: string; incompleteSearch?: boolean } = await driveGet(token, "files", { q: `'${folder.replace(/'/g, "\\'")}' in parents and trashed = false`, fields: "nextPageToken,incompleteSearch,files(id,name,mimeType,modifiedTime,parents)", pageSize: "1000", ...(pageToken ? { pageToken } : {}), supportsAllDrives: "true", includeItemsFromAllDrives: "true" });
      if (page.incompleteSearch) throw new Error("Google returned an incomplete folder listing. Try again later.");
      for (const file of page.files) {
        result[file.id] = file;
        if (descendants && file.mimeType === "application/vnd.google-apps.folder") queue.push(file.id);
      }
      pageToken = page.nextPageToken;
    } while (pageToken);
  }
  if (Object.keys(result).length > 2000) throw new Error("Monitor smaller folders separately (up to 2,000 items per watch).");
  return result;
}

export async function syncWatch(id: string) {
  const leaseToken = randomUUID();
  const leased = await prisma.driveWatch.updateMany({ where: { id, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, data: { leaseToken, lastAttemptAt: new Date(), leaseUntil: new Date(Date.now() + 120_000) } });
  if (!leased.count) return;
  try {
    const watch = await prisma.driveWatch.findUniqueOrThrow({ where: { id }, include: { connection: { include: { user: { include: { secondaryRoles: true } } } }, room: true } });
    const owner = watch.connection.user;
    if (owner.role !== "ADMIN" && !owner.secondaryRoles.some((role) => role.role === "ADMIN")) throw new Error("Monitoring paused: the connected account owner is no longer an administrator.");
    if (!watch.room.isGeneral && !await prisma.chatMember.findUnique({ where: { roomId_userId: { roomId: watch.roomId, userId: owner.id } } })) throw new Error("Monitoring paused: the connected account owner is no longer a group member.");
    const token = await accessToken(watch.connectionId);
    const next = await scanFolder(token, watch.folderId, watch.includeSubfolders);
    const previous = watch.snapshot as Inventory | null;
    const events: string[] = [];
    if (previous) {
      for (const file of Object.values(next)) {
        const old = previous[file.id];
        if (!old) events.push(`Added: ${file.name}`);
        else if (old.name !== file.name) events.push(`Renamed: ${old.name} → ${file.name}`);
        else if (JSON.stringify(old.parents) !== JSON.stringify(file.parents)) events.push(`Moved: ${file.name}`);
        else if (old.modifiedTime !== file.modifiedTime) events.push(`Updated: ${file.name}`);
      }
      for (const file of Object.values(previous)) if (!next[file.id]) events.push(`No longer in folder or accessible: ${file.name}`);
    }
    // The inventory and notification commit together; retries cannot duplicate a batch.
    await prisma.$transaction(async (tx) => {
      const updated = await tx.driveWatch.updateMany({ where: { id, leaseToken }, data: { snapshot: next, lastCheckedAt: new Date(), lastError: null, leaseUntil: null, leaseToken: null } });
      if (!updated.count) return;
      if (events.length) await tx.chatMessage.create({ data: { roomId: watch.roomId, authorName: "Google Drive", body: `${watch.folderName}\n${events.slice(0, 30).join("\n").slice(0, 3500)}${events.length > 30 ? `\n…and ${events.length - 30} more changes.` : ""}`, driveUrl: `https://drive.google.com/drive/folders/${watch.folderId}` } });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to check this folder.";
    await prisma.driveWatch.updateMany({ where: { id, leaseToken }, data: { lastError: message, leaseUntil: null, leaseToken: null } });
  }
}
