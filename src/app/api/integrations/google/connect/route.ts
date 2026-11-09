import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { appUrl, driveCallback, driveConfigured, DRIVE_SCOPE, seal } from "@/lib/drive";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("ADMIN")) return new Response("Not authorized", { status: 403 });
  if (!driveConfigured()) return new Response("Google Drive setup is not complete. See docs/COMMUNICATIONS_SETUP.md.", { status: 503 });
  const nonce = randomBytes(32).toString("base64url"), verifier = randomBytes(48).toString("base64url");
  const state = seal(JSON.stringify({ userId: user.id, nonce, verifier, expires: Date.now() + 600_000 }));
  (await cookies()).set("drive_oauth_nonce", nonce, { httpOnly: true, secure: appUrl().startsWith("https:"), sameSite: "lax", maxAge: 600, path: "/api/integrations/google" });
  const params = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: driveCallback(), response_type: "code", scope: DRIVE_SCOPE, access_type: "offline", prompt: "consent", state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" });
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
