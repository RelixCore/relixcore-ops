import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma, ActivityAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canManageTeam } from "@/lib/roles";
import { todayKey, shiftDateKey, dateKeyToRange } from "@/lib/date";
import { getTeamActivityForDate } from "@/lib/activitySummary";
import {
  ACTION_LABELS,
  CATEGORY_LABELS,
  ACTIONS_BY_CATEGORY,
  ActivityCategory,
  formatDetails,
} from "@/lib/activityLog";
import ConfirmButton from "@/components/ConfirmButton";
import { purgeActivityLogAction } from "./actions";

const PAGE_SIZE = 50;

const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  LOGIN: "bg-zinc-100 text-zinc-700",
  LEADS: "bg-sky-100 text-sky-700",
  TEAM: "bg-violet-100 text-violet-700",
  CHECKLIST: "bg-emerald-100 text-emerald-700",
  SYSTEM: "bg-amber-100 text-amber-700",
};

function categoryOf(action: ActivityAction): ActivityCategory {
  for (const [category, actions] of Object.entries(ACTIONS_BY_CATEGORY) as [ActivityCategory, ActivityAction[]][]) {
    if (actions.includes(action)) return category;
  }
  return "SYSTEM";
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getCurrentUser();
  if (!user || !canManageTeam(user.roles)) {
    redirect("/checklist");
  }

  const params = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

  const date = str(params.date) ?? todayKey();
  const userIdFilter = str(params.userId);
  const categoryFilter = str(params.category) as ActivityCategory | undefined;
  const from = str(params.from);
  const to = str(params.to);
  const page = Math.max(1, Number(str(params.page)) || 1);
  const error = str(params.error);

  const where: Prisma.ActivityLogWhereInput = {
    ...(userIdFilter ? { actorId: userIdFilter } : {}),
    ...(categoryFilter ? { action: { in: ACTIONS_BY_CATEGORY[categoryFilter] } } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: dateKeyToRange(from).start } : {}),
            ...(to ? { lt: dateKeyToRange(to).end } : {}),
          },
        }
      : {}),
  };

  const [logs, total, users, dayActivity] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.activityLog.count({ where }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getTeamActivityForDate(date),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const dayLink = (targetDate: string) => {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries({ userId: userIdFilter, category: categoryFilter, from, to })) {
      if (v) usp.set(k, v);
    }
    usp.set("date", targetDate);
    return `/activity?${usp.toString()}`;
  };

  const pageLink = (targetPage: number) => {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries({ date, userId: userIdFilter, category: categoryFilter, from, to })) {
      if (v) usp.set(k, v);
    }
    usp.set("page", String(targetPage));
    return `/activity?${usp.toString()}`;
  };

  const exportHref = (() => {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries({ userId: userIdFilter, category: categoryFilter, from, to })) {
      if (v) usp.set(k, v);
    }
    return `/activity/export?${usp.toString()}`;
  })();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-brand-teal-dark">Activity Log</h1>
      <p className="mt-1 mb-6 text-sm text-foreground/60">
        Who&rsquo;s logging in, completing daily tasks, and touching the CRM — day by day.
      </p>

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-8 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-brand-teal-dark">Team Activity — {date}</h2>
          <div className="flex items-center gap-3 text-sm font-medium">
            <Link href={dayLink(shiftDateKey(date, -1))} className="text-brand-teal hover:underline">
              ← Previous day
            </Link>
            <Link href={dayLink(todayKey())} className="text-foreground/50 hover:underline">
              Today
            </Link>
            <Link href={dayLink(shiftDateKey(date, 1))} className="text-brand-teal hover:underline">
              Next day →
            </Link>
          </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-foreground/50">
              <th className="px-5 py-2.5">Team Member</th>
              <th className="px-5 py-2.5">Logged In</th>
              <th className="px-5 py-2.5">Checklist</th>
              <th className="px-5 py-2.5">Events</th>
              <th className="px-5 py-2.5">Last Active</th>
            </tr>
          </thead>
          <tbody>
            {dayActivity.map((row) => {
              const pct = row.checklistTotal > 0 ? Math.round((row.checklistDone / row.checklistTotal) * 100) : 0;
              const isActive = row.loginCount > 0 || row.eventCount > 0;
              return (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-2.5">
                    <p className="font-medium text-foreground/80">{row.name}</p>
                    <p className="text-xs text-foreground/50">{row.roleLabel}</p>
                  </td>
                  <td className="px-5 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {row.firstLoginAt
                        ? row.firstLoginAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "Not seen"}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-foreground/70">
                    {row.checklistDone}/{row.checklistTotal} ({pct}%)
                  </td>
                  <td className="px-5 py-2.5 text-foreground/70">{row.eventCount}</td>
                  <td className="px-5 py-2.5 text-foreground/70">
                    {row.lastActivityAt
                      ? row.lastActivityAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mb-5 flex items-start justify-between gap-4">
        <form className="flex flex-wrap items-center gap-2" action="/activity">
          <input type="hidden" name="date" value={date} />
          <select
            name="userId"
            defaultValue={userIdFilter ?? ""}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="">All team members</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select
            name="category"
            defaultValue={categoryFilter ?? ""}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="">All activity</option>
            {(Object.entries(CATEGORY_LABELS) as [ActivityCategory, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          />
          <span className="text-sm text-foreground/40">to</span>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg border border-border bg-white px-3.5 py-2 text-sm font-medium text-foreground/70 hover:bg-zinc-50"
          >
            Apply
          </button>
          {userIdFilter || categoryFilter || from || to ? (
            <Link href={dayLink(date)} className="text-sm font-medium text-brand-red hover:underline">
              Clear
            </Link>
          ) : null}
        </form>
        <a
          href={exportHref}
          className="flex-shrink-0 rounded-lg bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-red-dark"
        >
          Export to Excel
        </a>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-zinc-50 text-xs font-medium uppercase tracking-wide text-foreground/50">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Team Member</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border last:border-0 hover:bg-zinc-50">
                <td className="whitespace-nowrap px-4 py-3 text-foreground/60">
                  {log.createdAt.toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                </td>
                <td className="px-4 py-3 font-medium text-foreground/80">{log.actorName}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${CATEGORY_COLORS[categoryOf(log.action)]}`}
                  >
                    {ACTION_LABELS[log.action]}
                  </span>
                </td>
                <td className="px-4 py-3 text-foreground/70">{log.entityLabel ?? "—"}</td>
                <td className="px-4 py-3 text-foreground/60">{formatDetails(log.details)}</td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-foreground/50">
                  No activity matches these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="mt-3 flex items-center justify-between text-sm text-foreground/60">
          <span>
            Page {page} of {totalPages} ({total} events)
          </span>
          <div className="flex gap-3">
            {page > 1 ? (
              <Link href={pageLink(page - 1)} className="font-medium text-brand-teal hover:underline">
                ← Newer
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link href={pageLink(page + 1)} className="font-medium text-brand-teal hover:underline">
                Older →
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-1 text-sm font-semibold text-brand-teal-dark">Data Retention</h2>
        <p className="mb-4 text-sm text-foreground/60">
          Permanently delete activity records in a date range. This cannot be undone.
        </p>
        <form action={purgeActivityLogAction} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/50">From</label>
            <input
              type="date"
              name="from"
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/50">To (inclusive)</label>
            <input type="date" name="to" className="rounded-lg border border-border bg-white px-3 py-2 text-sm" />
          </div>
          <ConfirmButton
            className="rounded-lg border border-brand-red px-3.5 py-2 text-sm font-medium text-brand-red hover:bg-red-50"
            confirmMessage="Permanently delete activity records in this date range? This cannot be undone."
          >
            Delete Records
          </ConfirmButton>
        </form>
      </div>
    </div>
  );
}
