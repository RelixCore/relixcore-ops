import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canEditCrm, canViewDashboard, CHANNEL_LABELS, STAGE_LABELS, VERTICAL_LABELS } from "@/lib/roles";
import { dueStatus } from "@/lib/nextActions";
import LeadForm from "@/components/LeadForm";
import StageBadge from "@/components/StageBadge";
import { deleteLeadAction, updateLeadAction, markNextActionDoneAction } from "../actions";

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [lead, user] = await Promise.all([
    prisma.lead.findUnique({ where: { id }, include: { owner: true, firstContact: true } }),
    getCurrentUser(),
  ]);

  if (!lead) notFound();

  const canEdit = user ? canEditCrm(user.roles) : false;
  const isManager = user ? canViewDashboard(user.roles) : false;
  const isOwner = user ? lead.ownerId === user.id : false;
  const canMarkDone = Boolean(lead.nextAction && !lead.nextActionDone && (isManager || isOwner));

  if (!canEdit) {
    return (
      <div>
        <h1 className="mb-1 text-2xl font-semibold text-brand-teal-dark">{lead.companyName}</h1>
        <p className="mb-6 text-sm text-foreground/50">{lead.leadCode}</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 rounded-xl border border-border bg-card p-6 text-sm sm:grid-cols-3">
          <DetailField label="Contact" value={lead.contactName ?? "—"} />
          <DetailField label="Channel" value={CHANNEL_LABELS[lead.channel]} />
          <DetailField label="Vertical" value={lead.segment ? VERTICAL_LABELS[lead.segment] : "—"} />
          <DetailField label="Stage" value={<StageBadge stage={lead.stage} />} />
          <DetailField
            label="Est. Value"
            value={lead.estValue ? `$${lead.estValue.toLocaleString()}` : "—"}
          />
          <DetailField label="First Contact" value={lead.firstContact?.name ?? "Unassigned"} />
          <DetailField label="Owner" value={lead.owner?.name ?? "Unassigned"} />
          <DetailField label="Next Action" value={lead.nextAction ?? "—"} />
          <DetailField
            label="Next Action Date"
            value={
              lead.nextActionDate ? (
                <NextActionStatus lead={lead} canMarkDone={canMarkDone} />
              ) : (
                "—"
              )
            }
          />
          <div className="col-span-full">
            <DetailField label="Notes" value={lead.notes ?? "—"} />
          </div>
        </div>
        <p className="mt-4 text-sm text-foreground/50">
          You have read-only access to the Lead Tracker. Platform owners and the Growth Lead can edit leads.
        </p>
      </div>
    );
  }

  const owners = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const boundUpdate = updateLeadAction.bind(null, lead.id);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-brand-teal-dark">{lead.companyName}</h1>
      <p className="mb-6 text-sm text-foreground/50">{lead.leadCode}</p>
      {lead.nextActionDate ? (
        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/40">
            Next Action Status
          </p>
          <div className="mt-1.5">
            <NextActionStatus lead={lead} canMarkDone={canMarkDone} />
          </div>
        </div>
      ) : null}
      <div className="rounded-xl border border-border bg-card p-6">
        <LeadForm
          action={boundUpdate}
          owners={owners}
          submitLabel="Save Changes"
          deleteAction={deleteLeadAction}
          leadId={lead.id}
          defaults={{
            companyName: lead.companyName,
            contactName: lead.contactName ?? undefined,
            channel: lead.channel,
            segment: lead.segment ?? undefined,
            stage: lead.stage,
            estValue: lead.estValue,
            ownerId: lead.ownerId,
            firstContactId: lead.firstContactId,
            dateFirstContacted: lead.dateFirstContacted?.toISOString(),
            lastContactDate: lead.lastContactDate?.toISOString(),
            nextAction: lead.nextAction ?? undefined,
            nextActionDate: lead.nextActionDate?.toISOString(),
            notes: lead.notes ?? undefined,
          }}
        />
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/40">{label}</p>
      <div className="mt-1 text-foreground/80">{value}</div>
    </div>
  );
}

function NextActionStatus({
  lead,
  canMarkDone,
}: {
  lead: { id: string; nextActionDate: Date | null; nextActionDone: boolean };
  canMarkDone: boolean;
}) {
  if (!lead.nextActionDate) return null;

  const dateLabel = lead.nextActionDate.toLocaleDateString();

  if (lead.nextActionDone) {
    return (
      <div className="flex items-center gap-2">
        <span>{dateLabel}</span>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Completed
        </span>
      </div>
    );
  }

  const { state, statusLabel } = dueStatus(lead.nextActionDate);
  const stateColors: Record<string, string> = {
    overdue: "bg-red-100 text-red-700",
    due_today: "bg-amber-100 text-amber-700",
    upcoming: "bg-zinc-100 text-zinc-600",
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span>{dateLabel}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stateColors[state]}`}>
        {statusLabel}
      </span>
      {canMarkDone ? (
        <form action={markNextActionDoneAction}>
          <input type="hidden" name="leadId" value={lead.id} />
          <button
            type="submit"
            className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground/70 hover:bg-zinc-50"
          >
            ✓ Mark done
          </button>
        </form>
      ) : null}
    </div>
  );
}
