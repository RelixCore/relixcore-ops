import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CHECKLIST_TEMPLATES } from "@/lib/checklists";
import { ROLE_LABELS, canViewDashboard } from "@/lib/roles";
import { todayKey } from "@/lib/date";
import { getTeamChecklistProgress } from "@/lib/checklistProgress";
import ChecklistBlocks from "@/components/ChecklistBlocks";

export default async function ChecklistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const date = todayKey();

  const entries = await prisma.checklistEntry.findMany({
    where: { userId: user.id, date },
  });
  const initialCompleted = Object.fromEntries(entries.map((e) => [e.itemKey, e.completed]));

  let teamProgress: Awaited<ReturnType<typeof getTeamChecklistProgress>> = [];
  if (canViewDashboard(user.roles)) {
    const all = await getTeamChecklistProgress(date);
    teamProgress = all.filter((t) => t.id !== user.id);
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
