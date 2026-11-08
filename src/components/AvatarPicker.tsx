"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { AVATARS } from "@/lib/avatars";

export default function AvatarPicker({ current = "", taken = [], disabled = false }: {
  current?: string; taken?: string[]; disabled?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(current);
  const [warning, setWarning] = useState("");
  const unavailable = new Set(taken);

  function choose(url: string) {
    if (disabled) return;
    if (unavailable.has(url)) {
      setWarning("This avatar is already in use. Please choose another.");
      return;
    }
    setSelected(url);
    setWarning("");
    dialog.current?.close();
  }

  return (
    <div>
      <input type="hidden" name="avatarUrl" value={selected} />
      <div className="relative w-fit">
        {selected ? (
          <Image unoptimized src={selected} alt="Selected avatar" width={72} height={72} className="rounded-full" />
        ) : (
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-brand-teal-dark text-white" aria-label="Default avatar">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 22v-2a8 8 0 0 1 16 0v2" /></svg>
          </span>
        )}
        <button type="button" disabled={disabled} aria-label="Edit avatar"
          onClick={() => { setWarning(""); dialog.current?.showModal(); }}
          className="absolute -bottom-1 -right-3 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium shadow-sm hover:bg-zinc-100 focus-visible:outline-2 disabled:opacity-50">
          Edit
        </button>
      </div>
      <dialog ref={dialog} aria-label="Choose an avatar"
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md max-h-[75dvh] overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-xl backdrop:bg-black/40"
        onClose={() => setWarning("")}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.currentTarget.close();
        }}>
        <div className="mb-2 flex justify-end">
          <button type="button" autoFocus aria-label="Close avatar picker" onClick={() => dialog.current?.close()}
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/60 hover:bg-zinc-100 focus-visible:outline-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
        {warning ? <p role="alert" className="sticky top-0 z-10 mb-3 rounded-lg bg-red-50 p-3 text-sm text-brand-red-dark">{warning}</p> : null}
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {AVATARS.map((avatar) => (
            <button key={avatar.id} type="button" disabled={disabled} aria-label={avatar.name} aria-pressed={selected === avatar.url}
              onClick={() => choose(avatar.url)}
              className={`rounded-full border-2 p-0.5 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal-dark ${selected === avatar.url ? "border-brand-red" : "border-transparent hover:border-brand-red/40"}`}>
              <Image unoptimized src={avatar.url} alt="" width={72} height={72} className="h-auto w-full rounded-full" />
            </button>
          ))}
        </div>
      </dialog>
    </div>
  );
}
