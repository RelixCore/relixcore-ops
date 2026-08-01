import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canEditCrm, CHANNEL_LABELS, STAGE_LABELS, VERTICAL_LABELS } from "@/lib/roles";
import LeadForm from "@/components/LeadForm";
import StageBadge from "@/components/StageBadge";
import { deleteLeadAction, updateLeadAction } from "../actions";

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [lead, user] = await Promise.all([
    prisma.lead.findUnique({ where: { id }, include: { owner: true } }),
    getCurrentUser(),
  ]);

  if (!lead) notFound();

  const canEdit = user ? canEditCrm(user.roles) : false;

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
          <DetailField label="Owner" value={lead.owner?.name ?? "Unassigned"} />
          <DetailField label="Next Action" value={lead.nextAction ?? "—"} />
          <DetailField
            label="Next Action Date"
            value={lead.nextActionDate ? lead.nextActionDate.toLocaleDateString() : "—"}
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
