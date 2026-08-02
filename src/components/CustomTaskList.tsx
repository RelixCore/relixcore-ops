"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addCustomTaskAction,
  toggleCustomTaskAction,
  deleteCustomTaskAction,
} from "@/app/(app)/checklist/actions";

export type CustomTask = {
  id: string;
  text: string;
  completed: boolean;
  assignedByName: string;
};

export default function CustomTaskList({
  tasks,
  isManager,
  teamMembers,
}: {
  tasks: CustomTask[];
  isManager: boolean;
  teamMembers: { id: string; name: string }[];
}) {
  const [completedById, setCompletedById] = useState(
    Object.fromEntries(tasks.map((t) => [t.id, t.completed]))
  );
  const [, startTransition] = useTransition();
  const [error, formAction, isPending] = useActionState(addCustomTaskAction, undefined);

  function toggle(taskId: string) {
    const next = !completedById[taskId];
    setCompletedById((prev) => ({ ...prev, [taskId]: next }));
    startTransition(() => {
      toggleCustomTaskAction(taskId, next);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold text-brand-teal-dark">Assigned Tasks</h3>
      </div>

      {tasks.length > 0 ? (
        <ul className="divide-y divide-border">
          {tasks.map((task) => {
            const checked = Boolean(completedById[task.id]);
            return (
              <li key={task.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                <label className="flex flex-1 cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(task.id)}
                    className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand-red"
                  />
                  <span>
                    <span className={checked ? "text-foreground/40 line-through" : "text-foreground/80"}>
                      {task.text}
                    </span>
                    <span className="block text-xs text-foreground/40">
                      Assigned by {task.assignedByName}
                    </span>
                  </span>
                </label>
                <form action={deleteCustomTaskAction}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <button
                    type="submit"
                    aria-label="Remove task"
                    className="flex-shrink-0 text-foreground/30 hover:text-brand-red"
                  >
                    ✕
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-5 py-4 text-sm text-foreground/50">No extra tasks assigned for today.</p>
      )}

      <form action={formAction} className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
        <input
          type="text"
          name="text"
          required
          placeholder={isManager ? "Add a task…" : "Add a task for yourself…"}
          className="min-w-[200px] flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
        />
        {isManager ? (
          <select
            name="assigneeId"
            defaultValue="self"
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="self">Just me</option>
            <option value="everyone">Everyone</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        ) : null}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-brand-red px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-red-dark disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add Task"}
        </button>
      </form>
      {error ? <p className="px-5 pb-3 text-xs text-brand-red">{error}</p> : null}
    </div>
  );
}
