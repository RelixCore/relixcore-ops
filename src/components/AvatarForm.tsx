"use client";

import { useActionState } from "react";
import AvatarPicker from "./AvatarPicker";

export default function AvatarForm({ action, current, taken }: {
  action: (previous: string | undefined, data: FormData) => Promise<string | undefined>;
  current: string; taken: string[];
}) {
  const [message, submit, pending] = useActionState(action, undefined);
  return <form action={submit} className="mt-6 flex flex-col gap-4">
    <AvatarPicker current={current} taken={taken} disabled={pending} />
    {message ? <p role="status" className="text-sm">{message}</p> : null}
    <button disabled={pending} className="self-start rounded-lg bg-brand-red px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : "Save avatar"}</button>
  </form>;
}
