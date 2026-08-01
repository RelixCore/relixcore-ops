import { redirect } from "next/navigation";
import { PipelineStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canViewDashboard, CHANNEL_LABELS } from "@/lib/roles";
import { todayKey } from "@/lib/date";
import { getTeamChecklistProgress } from "@/lib/checklistProgress";

const OPEN_STAGES: PipelineStage[] = ["LEAD", "QUALIFIED", "DISCOVERY_CALL", "PROPOSAL", "NEGOTIATION"];
const PROPOSAL_PLUS_STAGES: PipelineStage[] = [
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "ONBOARDING",
  "DELIVERY",
  "UPSELL",
  "REFERRAL",
  "CASE_STUDY",
];
const WON_STAGES: PipelineStage[] = ["WON", "ONBOARDING", "DELIVERY", "UPSELL", "REFERRAL", "CASE_STUDY"];
const ACTIVE_RETAINER_STAGES: PipelineStage[] = ["DELIVERY", "UPSELL"];

function money(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user || !canViewDashboard(user.roles)) {
    redirect("/checklist");
  }

  const [leads, teamProgress] = await Promise.all([
    prisma.lead.findMany(),
    getTeamChecklistProgress(todayKey()),
  ]);

  const totalLeads = leads.length;
  const wonLeads = leads.filter((l) => WON_STAGES.includes(l.stage));
  const lostLeads = leads.filter((l) => l.stage === "LOST");
  const proposalsPlus = leads.filter((l) => PROPOSAL_PLUS_STAGES.includes(l.stage));
  const openLeads = leads.filter((l) => OPEN_STAGES.includes(l.stage));

  const closeRate = proposalsPlus.length > 0 ? wonLeads.length / proposalsPlus.length : 0;
  const openPipelineValue = openLeads.reduce((sum, l) => sum + (l.estValue ?? 0), 0);
  const estMrr = leads
    .filter((l) => ACTIVE_RETAINER_STAGES.includes(l.stage))
    .reduce((sum, l) => sum + (l.estValue ?? 0), 0);
  const avgDealSize =
    wonLeads.length > 0
      ? wonLeads.reduce((sum, l) => sum + (l.estValue ?? 0), 0) / wonLeads.length
      : 0;

  const byChannel = Object.keys(CHANNEL_LABELS).map((channel) => {
    const inChannel = leads.filter((l) => l.channel === channel);
    return {
      channel,
      count: inChannel.length,
      won: inChannel.filter((l) => WON_STAGES.includes(l.stage)).length,
    };
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-brand-teal-dark">Admin Dashboard</h1>
      <p className="mt-1 mb-6 text-sm text-foreground/60">
        Live metrics computed from the Lead Tracker (CRM) — see Part 7.1 of the Operating Manual.
      </p>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Metric label="Total Leads Logged" value={totalLeads.toString()} />
        <Metric label="Leads Won" value={wonLeads.length.toString()} />
        <Metric label="Leads Lost" value={lostLeads.length.toString()} />
        <Metric label="Proposals Sent (incl. later stages)" value={proposalsPlus.length.toString()} />
        <Metric label="Close Rate" value={`${(closeRate * 100).toFixed(0)}%`} />
        <Metric label="Open Pipeline Value" value={money(openPipelineValue)} />
        <Metric label="Avg. Deal Size" value={money(avgDealSize)} />
        <Metric label="Est. MRR (active retainers)" value={money(estMrr)} accent />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-brand-teal-dark">Leads by Channel</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-foreground/50">
              <th className="px-5 py-2.5">Channel</th>
              <th className="px-5 py-2.5">Lead Count</th>
              <th className="px-5 py-2.5">Won Count</th>
            </tr>
          </thead>
          <tbody>
            {byChannel.map((row) => (
              <tr key={row.channel} className="border-b border-border last:border-0">
                <td className="px-5 py-2.5 text-foreground/80">{CHANNEL_LABELS[row.channel]}</td>
                <td className="px-5 py-2.5 text-foreground/80">{row.count}</td>
                <td className="px-5 py-2.5 text-foreground/80">{row.won}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-brand-teal-dark">Team Checklist Completion — Today</h2>
        </div>
        <ul className="divide-y divide-border">
          {teamProgress.map((t) => {
            const pct = t.total > 0 ? Math.round((t.done / t.total) * 100) : 0;
            return (
              <li key={t.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                <div className="w-40 flex-shrink-0">
                  <p className="truncate font-medium text-foreground/80">{t.name}</p>
                  <p className="truncate text-xs text-foreground/50">{t.roleLabel}</p>
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className="h-full bg-brand-red transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-16 flex-shrink-0 text-right text-sm font-medium text-foreground/60">
                  {t.done}/{t.total}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold ${accent ? "text-brand-red" : "text-brand-teal-dark"}`}>
        {value}
      </p>
    </div>
  );
}
