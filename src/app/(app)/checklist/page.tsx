import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CHECKLIST_TEMPLATES } from "@/lib/checklists";
import { ROLE_LABELS, canViewDashboard, canManageTeam } from "@/lib/roles";
import { todayKey } from "@/lib/date";
import { getTeamChecklistProgress } from "@/lib/checklistProgress";
import { getActiveProjectsForUser, getTeamMissedCheckIns, formatMissedDates } from "@/lib/projects";
import ChecklistBlocks from "@/components/ChecklistBlocks";
import CustomTaskList from "@/components/CustomTaskList";
import ProjectList from "@/components/ProjectList";

export default async function ChecklistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const date = todayKey();
  const isManager = canManageTeam(user.roles);

  const [entries, customTasks, projects, teamMembers] = await Promise.all([
    prisma.checklistEntry.findMany({ where: { userId: user.id, date } }),
    prisma.customChecklistTask.findMany({
      where: { assigneeId: user.id, date },
      orderBy: { createdAt: "asc" },
    }),
    getActiveProjectsForUser(user.id, date),
    isManager
      ? prisma.user.findMany({
          where: { id: { not: user.id } },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);
  const initialCompleted = Object.fromEntries(entries.map((e) => [e.itemKey, e.completed]));

  let teamProgress: Awaited<ReturnType<typeof getTeamChecklistProgress>> = [];
  let teamMissedCheckIns: Awaited<ReturnType<typeof getTeamMissedCheckIns>> = [];
  if (canViewDashboard(user.roles)) {
    const all = await getTeamChecklistProgress(date);
    teamProgress = all.filter((t) => t.id !== user.id);
  }
  if (isManager) {
    teamMissedCheckIns = await getTeamMissedCheckIns(date);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-brand-teal-dark">Daily Checklist</h1>
      <p className="mt-1 mb-6 text-sm text-foreground/60">
        {user.roles.map((r) => ROLE_LABELS[r]).join(" + ")} ·{" "}
        {new Date().toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </p>

      <div className="flex flex-col gap-10">
        {user.roles.map((role) => (
          <div key={role}>
            {user.roles.length > 1 ? (
              <h2 className="mb-3 text-lg font-semibold text-brand-teal-dark">{ROLE_LABELS[role]}</h2>
            ) : null}
            <ChecklistBlocks
              role={role}
              blocks={CHECKLIST_TEMPLATES[role].blocks}
              initialCompleted={initialCompleted}
            />
          </div>
        ))}
      </div>

      <div className="mt-8">
        <ProjectList
          projects={projects.map((p) => ({
            id: p.id,
            title: p.title,
            dueDate: p.dueDate,
            completed: p.completed,
            assignedByName: p.assignedByName,
            checkedInToday: p.checkedInToday,
            urgency: p.urgency,
            missedSummary: p.missedDates.length > 0 ? formatMissedDates(p.missedDates) : null,
          }))}
          isManager={isManager}
          teamMembers={teamMembers}
        />
      </div>

      <div className="mt-8">
        <CustomTaskList
          tasks={customTasks.map((t) => ({
            id: t.id,
            text: t.text,
            completed: t.completed,
            assignedByName: t.assignedByName,
          }))}
          isManager={isManager}
          teamMembers={teamMembers}
        />
      </div>

      {isManager && teamMissedCheckIns.length > 0 ? (
        <div className="mt-8 rounded-xl border border-brand-red/30 bg-red-50/50">
          <div className="border-b border-brand-red/20 px-5 py-4">
            <h2 className="text-sm font-semibold text-brand-red-dark">⚠ Project Check-Ins Falling Behind</h2>
            <p className="mt-0.5 text-xs text-foreground/50">
              Team members with an active project they haven&apos;t checked in on for at least one day.
            </p>
          </div>
          <ul className="divide-y divide-border">
            {teamMissedCheckIns.map((m) => (
              <li key={`${m.projectId}-${m.assigneeId}`} className="px-5 py-3 text-sm">
                <p className="font-medium text-foreground/80">
                  {m.assigneeName} · <span className="font-normal text-foreground/60">{m.projectTitle}</span>
                </p>
                <p className="text-xs text-brand-red-dark">{formatMissedDates(m.missedDates)}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {teamProgress.length > 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-brand-teal-dark">Team Progress Today</h2>
          </div>
          <ul className="divide-y divide-border">
            {teamProgress.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-foreground/80">{t.name}</p>
                  <p className="text-xs text-foreground/50">{t.roleLabel}</p>
                </div>
                <span className="text-sm font-medium text-foreground/60">
                  {t.done}/{t.total}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
