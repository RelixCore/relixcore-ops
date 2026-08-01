"use client";

import { useState, useTransition } from "react";
import type { Role } from "@prisma/client";
import type { ChecklistBlock } from "@/lib/checklists";
import { checklistItemKey } from "@/lib/checklists";
import { toggleChecklistItemAction } from "@/app/(app)/checklist/actions";

export default function ChecklistBlocks({
  role,
  blocks,
  initialCompleted,
}: {
  role: Role;
  blocks: ChecklistBlock[];
  initialCompleted: Record<string, boolean>;
}) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [, startTransition] = useTransition();

  const total = blocks.reduce((sum, b) => sum + b.items.length, 0);
  const done = Object.values(completed).filter(Boolean).length;

  function toggle(itemKey: string) {
    const next = !completed[itemKey];
    setCompleted((prev) => ({ ...prev, [itemKey]: next }));
    startTransition(() => {
      toggleChecklistItemAction(itemKey, next);
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full bg-brand-red transition-all"
            style={{ width: total > 0 ? `${(done / total) * 100}%` : "0%" }}
          />
        </div>
        <span className="whitespace-nowrap text-sm font-medium text-foreground/60">
          {done}/{total} complete
        </span>
      </div>

      <div className="flex flex-col gap-6">
        {blocks.map((block, blockIndex) => (
          <div key={blockIndex} className="rounded-xl border border-border bg-card">
            <div className="flex items-baseline justify-between border-b border-border px-5 py-3">
              <h3 className="text-sm font-semibold text-brand-teal-dark">{block.label}</h3>
              <span className="text-xs text-foreground/40">{block.time}</span>
            </div>
            <ul className="divide-y divide-border">
              {block.items.map((item, itemIndex) => {
                const itemKey = checklistItemKey(role, blockIndex, itemIndex);
                const checked = Boolean(completed[itemKey]);
                return (
                  <li key={itemKey}>
                    <label className="flex cursor-pointer items-start gap-3 px-5 py-3 text-sm hover:bg-zinc-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(itemKey)}
                        className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand-red"
                      />
                      <span className={checked ? "text-foreground/40 line-through" : "text-foreground/80"}>
                        {item}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
