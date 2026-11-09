"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRoom } from "@/lib/chat";
import { accessToken, driveGet, syncWatch, unseal } from "@/lib/drive";
import { revalidatePath } from "next/cache";

async function admin() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("ADMIN")) throw new Error("Administrator access required.");
  return user;
}
export async function addDriveWatch(_previous: string | undefined, formData: FormData) {
  const user = await admin();
  const raw = String(formData.get("folder") ?? "").trim();
  let folderId = raw;
  if (raw.startsWith("https://")) {
    try { const url = new URL(raw); if (url.hostname !== "drive.google.com") return "Paste a Google Drive folder link."; folderId = url.pathname.match(/\/folders\/([\w-]+)/)?.[1] ?? ""; } catch { return "Invalid folder link."; }
  }
  if (!/^[\w-]{10,150}$/.test(folderId)) return "Paste a valid Google Drive folder link or ID.";
  const roomId = String(formData.get("roomId") ?? "");
  if (!await getRoom(roomId, user.id)) return "Choose a group you belong to.";
  try {
    const token = await accessToken(user.id);
    const folder = await driveGet<{ name: string; mimeType: string }>(token, `files/${folderId}`, { fields: "name,mimeType" });
    if (folder.mimeType !== "application/vnd.google-apps.folder") return "Choose a folder, not a file.";
    const existing = await prisma.driveWatch.findUnique({ where: { connectionId_roomId_folderId: { connectionId: user.id, roomId, folderId } } });
    if (existing) return "That folder is already linked to this group.";
    if (await prisma.driveWatch.count({ where: { connectionId: user.id } }) >= 10) return "You can monitor up to 10 folders per connected account.";
    await prisma.driveWatch.create({ data: { connectionId: user.id, roomId, folderId, folderName: folder.name, includeSubfolders: formData.get("includeSubfolders") === "on" } });
    revalidatePath("/integrations");
    return "Folder linked. Use Check now to capture its starting state; later changes will appear in the group.";
  } catch { return "Could not link that folder. Check your Google connection and folder access."; }
}
export async function checkDriveWatch(formData: FormData) {
  const user = await admin(), id = String(formData.get("id") ?? "");
  if (!await prisma.driveWatch.findFirst({ where: { id, connectionId: user.id } })) return;
  await syncWatch(id); revalidatePath("/integrations"); revalidatePath("/chat");
}
export async function removeDriveWatch(formData: FormData) {
  const user = await admin();
  await prisma.driveWatch.deleteMany({ where: { id: String(formData.get("id") ?? ""), connectionId: user.id } });
  revalidatePath("/integrations");
}
export async function disconnectDrive() {
  const user = await admin();
  const connection = await prisma.driveConnection.findUnique({ where: { userId: user.id } });
  await prisma.driveConnection.deleteMany({ where: { userId: user.id } });
  if (connection) {
    try { await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", body: new URLSearchParams({ token: unseal(connection.refreshToken) }), signal: AbortSignal.timeout(10000) }); } catch { /* Local credentials and watches are already removed. */ }
  }
  revalidatePath("/integrations");
}
