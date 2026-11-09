import { z } from "zod";

export function validDriveUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && ["drive.google.com", "docs.google.com"].includes(url.hostname);
  } catch { return false; }
}
export const messageInput = z.object({
  roomId: z.string().min(1).max(100),
  body: z.string().trim().max(4000),
  driveUrl: z.string().trim().max(2000).refine(validDriveUrl, "Use a Google Drive or Google Docs HTTPS link."),
  mentionIds: z.array(z.string().max(100)).max(50),
  replyToId: z.string().max(100).nullable(),
}).refine((data) => data.body.length > 0 || data.driveUrl.length > 0, "Write a message or attach a Drive link.");
