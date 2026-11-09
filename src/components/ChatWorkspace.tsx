"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { roomList, roomSnapshot } from "@/lib/chat";
import { changeGroupMember, createGroup, markChatRead, removeMessage, sendMessage } from "@/app/(app)/chat/actions";

type Rooms = Awaited<ReturnType<typeof roomList>>;
type Snapshot = NonNullable<Awaited<ReturnType<typeof roomSnapshot>>>;
type Person = { id: string; name: string; avatarUrl: string | null };

export default function ChatWorkspace({ initialRooms, initialSnapshot, people, userId, isAdmin }: {
  initialRooms: Rooms; initialSnapshot: Snapshot | null; people: Person[]; userId: string; isAdmin: boolean;
}) {
  const [rooms, setRooms] = useState(initialRooms);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [roomId, setRoomId] = useState(initialSnapshot?.room.id ?? "relixcore-general");
  const [before, setBefore] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);
  const [body, setBody] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [reply, setReply] = useState<Snapshot["messages"][number] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const displayed = snapshot?.room.id === roomId ? snapshot : null;
  const canManage = displayed && !displayed.room.isGeneral && (displayed.room.ownerId === userId || isAdmin);

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      if (!document.hidden) {
        try {
          const response = await fetch(`/api/chat?room=${encodeURIComponent(roomId)}${before ? `&before=${before}` : ""}`, { cache: "no-store", signal: controller.signal });
          const data = await response.json();
          if (disposed) return;
          if (!response.ok) {
            if (response.status === 401 || response.status === 403) setSnapshot(null);
            setError(data.error ?? "Unable to refresh chat.");
          } else {
            setRooms(data.rooms); setSnapshot(data.snapshot);
            const last = data.snapshot?.messages.at(-1);
            if (!before && last) await markChatRead(roomId, last.seq);
          }
        } catch {
          if (!disposed) setError("Chat could not refresh. Check your connection; your draft is still here.");
        }
      }
      if (!disposed) timer = setTimeout(refresh, 8000);
    }
    void refresh();
    return () => { disposed = true; controller.abort(); clearTimeout(timer); };
  }, [roomId, before, revision]);

  function switchRoom(id: string) {
    if (id === roomId) return;
    if ((body || driveUrl) && !window.confirm("Discard your unsent message and switch groups?")) return;
    setRoomId(id); setBefore(null); setBody(""); setDriveUrl(""); setMentions([]); setReply(null); setError("");
  }
  async function run(work: () => Promise<void>) {
    setBusy(true); setError("");
    try { await work(); } catch { setError("That action failed. Please try again."); }
    finally { setBusy(false); }
  }
  const refresh = () => setRevision((value) => value + 1);

  return <div>
    <div className="mb-5 flex items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold text-brand-teal-dark">Team chat</h1><p className="mt-1 text-sm text-foreground/60">Your team, in one conversation. Updates every few seconds.</p></div>
      <button type="button" className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white" onClick={() => setShowCreate(!showCreate)}>New group</button>
    </div>
    {error ? <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-brand-red-dark">{error}</p> : null}
    {showCreate ? <form className="mb-5 rounded-xl border border-border bg-card p-4" onSubmit={(event) => { event.preventDefault(); void run(async () => {
      const result = await createGroup({ name: groupName, memberIds: groupMembers });
      if (result.error) { setError(result.error); return; }
      if (result.roomId) { switchRoom(result.roomId); setShowCreate(false); setGroupName(""); setGroupMembers([]); refresh(); }
    }); }}>
      <label className="block text-sm font-medium">Group name<input className="input mt-1" required maxLength={80} value={groupName} onChange={(e) => setGroupName(e.target.value)} /></label>
      <fieldset className="my-3"><legend className="mb-2 text-sm font-medium">Members</legend><div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">{people.filter((p) => p.id !== userId).map((p) => <label key={p.id} className="flex gap-2 text-sm"><input type="checkbox" checked={groupMembers.includes(p.id)} onChange={(e) => setGroupMembers(e.target.checked ? [...groupMembers, p.id] : groupMembers.filter((id) => id !== p.id))} />{p.name}</label>)}</div></fieldset>
      <p className="mb-3 text-xs text-foreground/60">Only added members can read this group. You are included automatically.</p>
      <button disabled={busy} className="rounded-lg bg-brand-teal-dark px-4 py-2 text-sm text-white disabled:opacity-50">Create group</button>
    </form> : null}
    <div className="grid overflow-hidden rounded-xl border border-border bg-card md:grid-cols-[220px_1fr]">
      <nav aria-label="Chat groups" className="flex max-h-72 gap-1 overflow-auto border-b border-border p-3 md:max-h-none md:flex-col md:border-b-0 md:border-r">{rooms.map((room) => <button key={room.id} type="button" onClick={() => switchRoom(room.id)} className={`flex shrink-0 items-center justify-between gap-2 rounded-lg p-3 text-left text-sm ${room.id === roomId ? "bg-brand-teal-dark text-white" : "hover:bg-zinc-100"}`}><span>{room.isGeneral ? "# " : ""}{room.name}</span>{room.unread > 0 ? <span className="rounded-full bg-brand-red px-2 py-0.5 text-xs text-white">{room.mentions ? "@ " : ""}{room.unread}</span> : null}</button>)}</nav>
      <section className="min-w-0">
        {displayed ? <>
          <header className="border-b border-border px-5 py-4"><h2 className="font-semibold">{displayed.room.name}</h2><p className="text-xs text-foreground/50">{displayed.members.length} members</p>
            <details className="mt-2 text-sm"><summary className="cursor-pointer">{canManage ? "Manage members" : "View members"}</summary>
              <div className="mt-3 flex max-h-52 flex-col gap-2 overflow-auto">{(canManage ? people : displayed.members).map((person) => { const included = displayed.members.some((member) => member.id === person.id); return <div key={person.id} className="flex items-center justify-between gap-2"><span>{person.name}</span>{canManage && person.id !== userId && person.id !== displayed.room.ownerId ? <button disabled={busy} type="button" className="text-xs text-brand-red" onClick={() => void run(async () => { const result = await changeGroupMember(roomId, person.id, !included); if (result.error) setError(result.error); else refresh(); })}>{included ? "Remove" : "Add"}</button> : null}</div>; })}</div>
            </details>
          </header>
          <div className="h-[48vh] min-h-64 overflow-y-auto p-4" aria-label="Messages">
            <div className="mb-3 flex justify-center gap-4 text-xs">{displayed.hasOlder ? <button type="button" className="text-brand-teal-dark underline" onClick={() => setBefore(displayed.messages[0]?.seq ?? null)}>Older messages</button> : null}{before ? <button type="button" className="text-brand-teal-dark underline" onClick={() => setBefore(null)}>Latest messages</button> : null}</div>
            {!displayed.messages.length ? <p className="py-12 text-center text-sm text-foreground/50">Start the conversation.</p> : null}
            {displayed.messages.map((message) => <article key={message.id} className={`mb-4 flex gap-3 rounded-lg p-2 ${message.mentionIds.includes(userId) ? "bg-amber-50" : ""}`}>
              {message.avatarUrl ? <Image unoptimized src={message.avatarUrl} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-full" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-teal-dark text-sm text-white">{message.authorName.slice(0, 1)}</span>}
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline gap-2"><span className="text-sm font-semibold">{message.authorName}</span><time className="text-[10px] text-foreground/50" dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString("en-GB", { timeZone: "Africa/Lagos", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></div>
                {message.replyTo ? <blockquote className="my-1 border-l-2 border-brand-teal-dark bg-zinc-50 p-2 text-xs text-foreground/60">{message.replyTo.authorName}: {message.replyTo.body}</blockquote> : null}
                <p className={`whitespace-pre-wrap break-words text-sm ${message.deleted ? "italic text-foreground/40" : ""}`}>{message.body}</p>
                {message.mentionIds.length ? <p className="mt-1 text-xs text-brand-teal-dark">{message.mentionIds.map((id) => `@${displayed.members.find((p) => p.id === id)?.name ?? "Former member"}`).join(" ")}</p> : null}
                {message.driveUrl ? <a className="mt-2 inline-block rounded-lg border border-border px-3 py-2 text-sm text-brand-teal-dark hover:underline" href={message.driveUrl} target="_blank" rel="noopener noreferrer">Open Google Drive file ↗</a> : null}
                {!message.deleted ? <div className="mt-1 flex gap-3 text-xs text-foreground/50"><button type="button" onClick={() => setReply(message)}>Reply</button>{message.authorId === userId || isAdmin ? <button type="button" disabled={busy} onClick={() => { if (window.confirm("Remove this message?")) void run(async () => { const result = await removeMessage(message.id); if (result.error) setError(result.error); else refresh(); }); }}>Remove</button> : null}</div> : null}
              </div>
            </article>)}<div ref={messagesEnd} />
          </div>
          <form className="border-t border-border p-4" onSubmit={(event) => { event.preventDefault(); void run(async () => {
            const result = await sendMessage({ roomId, body, driveUrl, mentionIds: mentions, replyToId: reply?.id ?? null });
            if (result.error) { setError(result.error); return; }
            setBody(""); setDriveUrl(""); setMentions([]); setReply(null); setBefore(null); refresh();
          }); }}>
            {reply ? <div className="mb-2 flex justify-between gap-2 rounded bg-zinc-50 p-2 text-xs"><span>Replying to {reply.authorName}: {reply.body.slice(0, 100)}</span><button type="button" aria-label="Cancel reply" onClick={() => setReply(null)}>×</button></div> : null}
            <label className="sr-only" htmlFor="chat-message">Message</label><textarea id="chat-message" disabled={busy} maxLength={4000} rows={3} className="input resize-y" placeholder="Write a message…" value={body} onChange={(e) => setBody(e.target.value)} />
            <details className="my-2 text-xs"><summary className="cursor-pointer">Attach a Drive link or mention someone</summary><label className="mt-3 block">Google Drive link<input type="url" className="input mt-1" placeholder="https://drive.google.com/…" value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} /></label><p className="mt-1 text-foreground/50">Recipients still need permission to open the file in Drive.</p><div className="mt-3 flex max-h-24 flex-wrap gap-3 overflow-auto">{displayed.members.filter((p) => p.id !== userId).map((person) => <label key={person.id} className="flex gap-1"><input type="checkbox" checked={mentions.includes(person.id)} onChange={(e) => setMentions(e.target.checked ? [...mentions, person.id] : mentions.filter((id) => id !== person.id))} />@{person.name}</label>)}</div></details>
            <button disabled={busy || (!body.trim() && !driveUrl.trim())} className="rounded-lg bg-brand-red px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Working…" : "Send"}</button>
          </form>
        </> : <p className="p-8 text-sm text-foreground/60">Choose an available group.</p>}
      </section>
    </div>
  </div>;
}
