"use client";
import { useActionState } from "react";
import { addDriveWatch } from "@/app/(app)/integrations/actions";
export default function DriveWatchForm({ rooms }: { rooms: { id: string; name: string }[] }) {
  const [message, submit, pending] = useActionState(addDriveWatch, undefined);
  return <form action={submit} className="mt-5 flex flex-col gap-3">
    <label className="text-sm">Folder link<input name="folder" required className="input mt-1" placeholder="https://drive.google.com/drive/folders/…" /></label>
    <label className="text-sm">Post alerts to<select name="roomId" required className="input mt-1">{rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
    <label className="flex gap-2 text-sm"><input type="checkbox" name="includeSubfolders" />Include subfolders</label>
    <p className="text-xs text-foreground/60">File names and change summaries will be shared with everyone in this group. Files keep their existing Google permissions.</p>
    {message ? <p role="status" className="text-sm">{message}</p> : null}
    <button disabled={pending} className="self-start rounded-lg bg-brand-teal-dark px-4 py-2 text-sm text-white disabled:opacity-50">{pending ? "Linking…" : "Link folder"}</button>
  </form>;
}
