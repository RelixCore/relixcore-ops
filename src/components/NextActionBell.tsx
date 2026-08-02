"use client";

import { useState } from "react";
import Link from "next/link";
import { markNextActionDoneAction } from "@/app/(app)/leads/actions";

export type NextActionBellItem = {
  id: string;
  leadCode: string;
  companyName: string;
  nextAction: string;
  ownerName: string | null;
  state: "overdue" | "due_today" | "upcoming";
  statusLabel: string;
};

export default function NextActionBell({ items }: { items: NextActionBellItem[] }) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="relative border-b border-white/10 px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-white/90 transition hover:bg-white/10"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <span aria-hidden>🔔</span>
          Next Actions Due
        </span>
        <span className="animate-flash-alert flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-red px-1.5 text-xs font-bold text-white">
          {items.length}
        </span>
      </button>

      {open ? (
        <div className="absolute left-4 right-4 top-full z-20 mt-1 max-h-96 overflow-y-auto rounded-lg border border-border bg-card text-foreground shadow-xl">
          {items.map((item) => (
            <div key={item.id} className="border-b border-border p-3 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/leads/${item.id}`}
                  className="text-sm font-semibold text-brand-teal-dark hover:text-brand-red"
                  onClick={() => setOpen(false)}
                >
                  {item.companyName}
                </Link>
                <span
                  className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                    item.state === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {item.statusLabel}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-foreground/50">
                {item.leadCode}
                {item.ownerName ? ` · ${item.ownerName}` : ""}
              </p>
              <p className="mt-1 text-sm text-foreground/80">{item.nextAction}</p>
              <form action={markNextActionDoneAction} className="mt-2">
                <input type="hidden" name="leadId" value={item.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground/70 hover:bg-zinc-50"
                >
                  ✓ Mark done
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
