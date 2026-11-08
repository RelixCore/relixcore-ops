"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { ANIMALS, AVATARS, isCollectionAvatar } from "@/lib/avatars";

export default function AvatarPicker({ current = "", taken = [], disabled = false }: {
  current?: string; taken?: string[]; disabled?: boolean;
}) {
  const id = useId();
  const [selected, setSelected] = useState(current);
  const [style, setStyle] = useState("All");
  const [animal, setAnimal] = useState("All");
  const unavailable = new Set(taken);
  const chosen = AVATARS.find((avatar) => avatar.url === selected);
  const visible = AVATARS.filter((avatar) => (style === "All" || avatar.style === style) && (animal === "All" || avatar.animal === animal));

  return (
    <fieldset disabled={disabled} className="min-w-0 rounded-xl border border-border overflow-hidden">
      <legend className="ml-4 px-2 text-sm font-semibold text-brand-teal-dark">Choose a character</legend>
      <input type="hidden" name="avatarUrl" value={selected} />
      <div className="flex items-center gap-4 bg-[#192a2c] p-5 text-[#f4e5c9]">
        {selected ? <Image unoptimized src={selected} alt={chosen?.name ?? "Current avatar"} width={88} height={88} className="rounded-full" /> : <span className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full border border-white/20 text-3xl">?</span>}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#d7b574]">The Relix Family · 60 characters</p>
          <p className="mt-1 text-lg font-semibold">{chosen?.name ?? (selected ? "Current photo" : "Find your alter ego")}</p>
          <p className="mt-1 text-xs text-white/70">One character. One member. Yours when you save.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3 p-4">
        <div className="flex flex-col gap-1 text-xs font-medium">
          <label htmlFor={`${id}-style`}>Style</label>
          <select id={`${id}-style`} value={style} onChange={(e) => setStyle(e.target.value)} className="input">
            {["All", "Masculine", "Feminine"].map((value) => <option key={value}>{value}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 text-xs font-medium">
          <label htmlFor={`${id}-animal`}>Animal</label>
          <select id={`${id}-animal`} value={animal} onChange={(e) => setAnimal(e.target.value)} className="input">
            {["All", ...ANIMALS].map((value) => <option key={value}>{value}</option>)}
          </select>
        </div>
        <button type="button" onClick={() => setSelected("")} className="rounded border border-border px-3 py-2 text-xs focus-visible:outline-2">Use initials</button>
        {current && !isCollectionAvatar(current) ? <button type="button" onClick={() => setSelected(current)} className="rounded border border-border px-3 py-2 text-xs">Keep current photo</button> : null}
      </div>
      <p className="px-4 pb-3 text-xs text-foreground/60" aria-live="polite">{visible.filter((avatar) => !unavailable.has(avatar.url)).length} available in this view · Taken characters are locked.</p>
      <div className="grid max-h-[480px] grid-cols-2 gap-2 overflow-y-auto px-4 pb-4 sm:grid-cols-4 lg:grid-cols-5" role="group" aria-label="Animal characters">
        {visible.map((avatar) => {
          const locked = unavailable.has(avatar.url);
          const active = selected === avatar.url;
          return <button key={avatar.id} type="button" disabled={locked} aria-pressed={active} aria-label={`${avatar.name}${locked ? ", taken" : ""}`} onClick={() => setSelected(avatar.url)}
            className={`relative flex flex-col items-center rounded-xl border-2 p-2 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal-dark ${active ? "border-[#ad8548] bg-[#f6f0e5]" : "border-transparent bg-zinc-50 hover:border-[#d7b574]"} ${locked ? "opacity-45 cursor-not-allowed" : ""}`}>
            <Image unoptimized src={avatar.url} alt="" width={104} height={104} className="h-auto w-full max-w-[104px]" />
            <span className="mt-2 text-xs font-semibold">{avatar.animal}</span>
            <span className="text-[11px] text-foreground/60">{avatar.name.split(" · ")[1]}</span>
            <span className={`mt-1 text-[10px] font-semibold uppercase tracking-wide ${active ? "text-brand-teal-dark" : "text-foreground/50"}`}>{locked ? "Taken" : active ? "Selected" : "Available"}</span>
          </button>;
        })}
      </div>
    </fieldset>
  );
}
