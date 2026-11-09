import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appUrl, driveCallback, driveGet, googleToken, seal, unseal, DRIVE_SCOPE } from "@/lib/drive";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("ADMIN")) return new Response("Not authorized", { status: 403 });
  const params = new URL(request.url).searchParams, cookieStore = await cookies();
  const nonce = cookieStore.get("drive_oauth_nonce")?.value;
  cookieStore.delete("drive_oauth_nonce");
  try {
    const state = JSON.parse(unseal(params.get("state") ?? ""));
    if (!nonce || state.nonce !== nonce || state.userId !== user.id || typeof state.expires !== "number" || state.expires < Date.now() || !params.get("code")) throw new Error("Invalid connection request.");
    const tokens = await googleToken({ grant_type: "authorization_code", code: params.get("code")!, redirect_uri: driveCallback(), code_verifier: state.verifier });
    if (!tokens.refresh_token || !tokens.scope?.split(" ").includes(DRIVE_SCOPE)) throw new Error("Google permission was not granted.");
    const about = await driveGet<{ user: { emailAddress: string } }>(tokens.access_token, "about", { fields: "user(emailAddress)" });
    await prisma.$transaction(async (tx) => {
      const old = await tx.driveConnection.findUnique({ where: { userId: user.id } });
      if (old && old.email !== about.user.emailAddress) await tx.driveWatch.deleteMany({ where: { connectionId: user.id } });
      await tx.driveConnection.upsert({ where: { userId: user.id }, create: { userId: user.id, email: about.user.emailAddress, refreshToken: seal(tokens.refresh_token!) }, update: { email: about.user.emailAddress, refreshToken: seal(tokens.refresh_token!) } });
    });
    return Response.redirect(`${appUrl()}/integrations?google=connected`);
  } catch {
    return Response.redirect(`${appUrl()}/integrations?google=failed`);
  }
}
