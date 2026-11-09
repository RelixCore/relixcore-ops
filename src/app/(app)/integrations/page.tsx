import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accessibleRooms } from "@/lib/chat";
import { driveConfigured } from "@/lib/drive";
import DriveWatchForm from "@/components/DriveWatchForm";
import ConfirmButton from "@/components/ConfirmButton";
import { checkDriveWatch, disconnectDrive, removeDriveWatch } from "./actions";

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("ADMIN")) redirect("/chat");
  const [params, connection, rooms, watches] = await Promise.all([
    searchParams, prisma.driveConnection.findUnique({ where: { userId: user.id }, select: { email: true } }),
    prisma.chatRoom.findMany({ where: accessibleRooms(user.id), select: { id: true, name: true } }),
    prisma.driveWatch.findMany({ where: { connectionId: user.id }, select: { id: true, folderName: true, includeSubfolders: true, lastCheckedAt: true, lastError: true, room: { select: { name: true } } } }),
  ]);
  return <div className="space-y-6">
    <h1 className="text-2xl font-semibold text-brand-teal-dark">Integrations</h1>
    {params.google === "failed" ? <p role="alert" className="rounded bg-red-50 p-3 text-sm text-brand-red-dark">Google connection failed or permission was declined. Please try connecting again.</p> : null}
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Google Drive</h2>
      <p className="mt-2 text-sm text-foreground/60">Connect your Google account to watch folders and post change summaries in your groups. This connection reads file information; it does not upload files or change sharing permissions.</p>
      {!driveConfigured() ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm">Setup required. Follow the Google Cloud instructions in docs/COMMUNICATIONS_SETUP.md, then return here to connect.</p> : <a href="/api/integrations/google/connect" className="mt-4 inline-block rounded-lg bg-brand-teal-dark px-4 py-2 text-sm text-white">{connection ? "Reconnect Google Drive" : "Connect Google Drive"}</a>}
      {connection ? <><p className="mt-4 text-sm">Connected: {connection.email}</p><form action={disconnectDrive} className="mt-2"><ConfirmButton confirmMessage="Disconnect Google Drive and stop all your folder watches?" className="text-sm text-brand-red">Disconnect</ConfirmButton></form><DriveWatchForm rooms={rooms} /></> : null}
      <p className="mt-4 text-xs text-foreground/60">Automatic checks require a scheduler. “Last checked” below shows when a folder was successfully scanned. Changes between scans may be combined; individual keystrokes are not tracked.</p>
      {watches.map((watch) => <div key={watch.id} className="mt-4 rounded-lg border border-border p-4"><h3 className="font-medium">{watch.folderName} → {watch.room.name}</h3><p className="mt-1 text-xs text-foreground/60">{watch.includeSubfolders ? "Includes subfolders. " : "Direct contents only. "}Last checked: {watch.lastCheckedAt ? watch.lastCheckedAt.toLocaleString("en-GB", { timeZone: "Africa/Lagos" }) : "Not yet checked"}</p>{watch.lastError ? <p role="alert" className="mt-2 text-sm text-brand-red">{watch.lastError}</p> : null}<div className="mt-3 flex gap-4"><form action={checkDriveWatch}><input type="hidden" name="id" value={watch.id} /><button className="text-sm text-brand-teal-dark">Check now</button></form><form action={removeDriveWatch}><input type="hidden" name="id" value={watch.id} /><ConfirmButton className="text-sm text-brand-red" confirmMessage="Stop monitoring this folder?">Remove watch</ConfirmButton></form></div></div>)}
    </section>
    <section className="rounded-xl border border-border bg-card p-6"><h2 className="text-lg font-semibold">WhatsApp client groups</h2><p className="mt-2 text-sm text-foreground/60">Not connected. Existing WhatsApp groups require a supported provider connection before messages can be sent or received here. No messages are sent to clients from this section yet.</p></section>
  </div>;
}
