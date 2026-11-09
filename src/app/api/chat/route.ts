import { getCurrentUser } from "@/lib/auth";
import { roomList, roomSnapshot } from "@/lib/chat";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in again to continue." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const roomId = params.get("room");
  const before = params.get("before") ? Number(params.get("before")) : undefined;
  if (before !== undefined && (!Number.isSafeInteger(before) || before < 1)) return Response.json({ error: "Invalid message cursor." }, { status: 400 });
  const [rooms, snapshot] = await Promise.all([roomList(user.id), roomId ? roomSnapshot(roomId, user.id, before) : null]);
  if (roomId && !snapshot) return Response.json({ error: "You no longer have access to this group." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  return Response.json({ rooms, snapshot }, { headers: { "Cache-Control": "private, no-store" } });
}
