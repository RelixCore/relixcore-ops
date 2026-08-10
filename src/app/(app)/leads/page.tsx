import Link from "next/link";
import { Channel, PipelineStage, Vertical, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canEditCrm, CHANNEL_LABELS, STAGE_LABELS, STAGE_ORDER, VERTICAL_LABELS } from "@/lib/roles";
import StageBadge from "@/components/StageBadge";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const canEdit = user ? canEditCrm(user) : false;

  const stageFilter = typeof params.stage === "string" ? params.stage : undefined;
  const channelFilter = typeof params.channel === "string" ? params.channel : undefined;
  const segmentFilter = typeof params.segment === "string" ? params.segment : undefined;
  const q = typeof params.q === "string" ? params.q.trim() : undefined;

  const where: Prisma.LeadWhereInput = {
    ...(stageFilter ? { stage: stageFilter as PipelineStage } : {}),
    ...(channelFilter ? { channel: channelFilter as Channel } : {}),
    ...(segmentFilter ? { segment: segmentFilter as Vertical } : {}),
    ...(q
      ? {
          OR: [
            { companyName: { contains: q } },
            { contactName: { contains: q } },
            { leadCode: { contains: q } },
          ],
        }
      : {}),
  };

  const leads = await prisma.lead.findMany({
    where,
    include: { owner: true, firstContact: true },
    orderBy: { updatedAt: "desc" },
  });

  const filterLink = (key: string, value: string | undefined) => {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries({ stage: stageFilter, channel: channelFilter, segment: segmentFilter, q })) {
      if (v && k !== key) usp.set(k, v);
    }
    if (value) usp.set(key, value);
    const qs = usp.toString();
    return qs ? `/leads?${qs}` : "/leads";
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-teal-dark">Lead Tracker (CRM)</h1>
          <p className="mt-1 text-sm text-foreground/60">
            {leads.length} lead{leads.length === 1 ? "" : "s"}
            {stageFilter || channelFilter || segmentFilter || q ? " matching filters" : " total"}
          </p>
        </div>
        {canEdit ? (
          <Link
            href="/leads/new"
            className="rounded-lg bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-red-dark"
          >
            + New Lead
          </Link>
        ) : null}
      </div>

      <form className="mb-5 flex flex-wrap items-center gap-2" action="/leads">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search company, contact, or lead code…"
          className="min-w-[220px] flex-1 rounded-lg border border-border bg-white px-3.5 py-2 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
        />
        <select
          name="stage"
          defaultValue={stageFilter ?? ""}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
        >
          <option value="">All stages</option>
          {STAGE_ORDER.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          name="channel"
          defaultValue={channelFilter ?? ""}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
        >
          <option value="">All channels</option>
          {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="segment"
          defaultValue={segmentFilter ?? ""}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
        >
          <option value="">All verticals</option>
          {Object.entries(VERTICAL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg border border-border bg-white px-3.5 py-2 text-sm font-medium text-foreground/70 hover:bg-zinc-50"
        >
          Apply
        </button>
        {stageFilter || channelFilter || segmentFilter || q ? (
          <Link href="/leads" className="text-sm font-medium text-brand-red hover:underline">
            Clear
          </Link>
        ) : null}
      </form>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-zinc-50 text-xs font-medium uppercase tracking-wide text-foreground/50">
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Vertical</th>
              <th className="px-4 py-3">
                <Link href={filterLink("stage", undefined)} className="hover:underline">
                  Stage
                </Link>
              </th>
              <th className="px-4 py-3">Est. Value</th>
              <th className="px-4 py-3">First Contact</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-medium text-brand-teal-dark hover:text-brand-red"
                  >
                    {lead.companyName}
                  </Link>
                  <div className="text-xs text-foreground/50">
                    {lead.leadCode}
                    {lead.contactName ? ` · ${lead.contactName}` : ""}
                  </div>
                </td>
                <td className="px-4 py-3 text-foreground/70">{CHANNEL_LABELS[lead.channel]}</td>
                <td className="px-4 py-3 text-foreground/70">
                  {lead.segment ? VERTICAL_LABELS[lead.segment] : "—"}
                </td>
                <td className="px-4 py-3">
                  <StageBadge stage={lead.stage} />
                </td>
                <td className="px-4 py-3 text-foreground/70">
                  {lead.estValue ? `$${lead.estValue.toLocaleString()}` : "—"}
                </td>
                <td className="px-4 py-3 text-foreground/70">
                  {lead.firstContact?.name ?? "Unassigned"}
                </td>
                <td className="px-4 py-3 text-foreground/70">{lead.owner?.name ?? "Unassigned"}</td>
                <td className="px-4 py-3 text-foreground/70">
                  {lead.nextAction ? (
                    <>
                      <div>{lead.nextAction}</div>
                      {lead.nextActionDate ? (
                        <div className="text-xs text-foreground/40">
                          {lead.nextActionDate.toLocaleDateString()}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {leads.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-foreground/50">
                  No leads match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
