"use client";

import { useActionState, useState, useTransition } from "react";
import ConfirmButton from "@/components/ConfirmButton";
import {
  addProjectAction,
  checkInProjectAction,
  completeProjectAction,
  deleteProjectAction,
} from "@/app/(app)/checklist/projectActions";

type ProjectUrgencyLevel = "green" | "amber" | "red";

export type ProjectItem = {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  assignedByName: string;
  checkedInToday: boolean;
  urgency: { level: ProjectUrgencyLevel; label: string };
  missedSummary: string | null;
};

const URGENCY_BADGE: Record<ProjectUrgencyLevel, string> = {
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
};

const URGENCY_DOT: Record<ProjectUrgencyLevel, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

const URGENCY_BORDER: Record<ProjectUrgencyLevel, string> = {
  green: "border-l-emerald-500",
  amber: "border-l-amber-500",
  red: "border-l-red-500",
};

export default function ProjectList({
  projects,
  isManager,
  teamMembers,
}: {
  projects: ProjectItem[];
  isManager: boolean;
  teamMembers: { id: string; name: string }[];
}) {
  const [checkedInById, setCheckedInById] = useState(
    Object.fromEntries(projects.map((p) => [p.id, p.checkedInToday]))
  );
  const [completedById, setCompletedById] = useState(
    Object.fromEntries(projects.map((p) => [p.id, p.completed]))
  );
  const [, startTransition] = useTransition();
  const [error, formAction, isPending] = useActionState(addProjectAction, undefined);

  function checkIn(projectId: string) {
    setCheckedInById((prev) => ({ ...prev, [projectId]: true }));
    startTransition(() => {
      checkInProjectAction(projectId);
    });
  }

  function toggleComplete(projectId: string) {
    const next = !completedById[projectId];
    setCompletedById((prev) => ({ ...prev, [projectId]: next }));
    startTransition(() => {
      completeProjectAction(projectId, next);
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-brand-teal-dark">Projects</h3>
        <p className="text-xs text-foreground/50">Multi-day work with a deadline — check in daily until it&apos;s done.</p>
      </div>

      {projects.length > 0 ? (
        <div className="flex flex-col gap-3">
          {projects.map((project) => {
            const checkedIn = Boolean(checkedInById[project.id]);
            const completed = Boolean(completedById[project.id]);
            return (
              <div
                key={project.id}
                className={`rounded-xl border border-border border-l-4 bg-card ${URGENCY_BORDER[project.urgency.level]}`}
              >
                <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3">
                  <div className="min-w-0">
                    <h4
                      className={`truncate text-sm font-semibold ${
                        completed ? "text-foreground/40 line-through" : "text-brand-teal-dark"
                      }`}
                    >
                      {project.title}
                    </h4>
                    <p className="mt-0.5 text-xs text-foreground/40">Assigned by {project.assignedByName}</p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${URGENCY_BADGE[project.urgency.level]}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${URGENCY_DOT[project.urgency.level]}`} aria-hidden />
                      {completed ? "Complete" : project.urgency.label}
                    </span>
                    <form action={deleteProjectAction}>
                      <input type="hidden" name="projectId" value={project.id} />
                      <ConfirmButton
                        confirmMessage={`Remove project "${project.title}"? This can't be undone.`}
                        className="flex-shrink-0 text-foreground/30 hover:text-brand-red"
                      >
                        ✕
                      </ConfirmButton>
                    </form>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <button
                    type="button"
                    onClick={() => checkIn(project.id)}
                    disabled={checkedIn || completed}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      checkedIn || completed
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-brand-teal-dark text-white hover:bg-brand-teal"
                    }`}
                  >
                    {checkedIn || completed ? "✓ Checked in today" : "Check in for today"}
                  </button>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/60">
                    <input
                      type="checkbox"
                      checked={completed}
                      onChange={() => toggleComplete(project.id)}
                      className="h-3.5 w-3.5 accent-brand-red"
                    />
                    Mark project complete
                  </label>
                </div>

                {project.missedSummary && !completed ? (
                  <p className="mx-5 mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-brand-red-dark">
                    ⚠ {project.missedSummary} — check in daily so this doesn&apos;t fall behind.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-border bg-card px-5 py-4 text-sm text-foreground/50">
          No active projects right now.
        </p>
      )}

      <form
        action={formAction}
        className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-5 py-3"
      >
        <input
          type="text"
          name="title"
          required
          placeholder={isManager ? "Project title…" : "New project for yourself…"}
          className="min-w-[200px] flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
        />
        <input
          type="date"
          name="dueDate"
          required
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
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
          {isPending ? "Adding…" : "Add Project"}
        </button>
      </form>
      {error ? <p className="mt-2 px-1 text-xs text-brand-red">{error}</p> : null}
    </div>
  );
}
