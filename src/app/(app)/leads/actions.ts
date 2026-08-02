"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Channel, PipelineStage, Vertical } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canEditCrm } from "@/lib/roles";
import { logActivity, diffFields } from "@/lib/activityLog";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

const leadSchema = z.object({
  companyName: z.string().trim().min(1, "Company/client name is required"),
  contactName: z.string().trim().optional(),
  channel: z.nativeEnum(Channel),
  segment: z.preprocess(emptyToUndefined, z.nativeEnum(Vertical).optional()),
  stage: z.nativeEnum(PipelineStage),
  estValue: z.string().optional(),
  ownerId: z.string().optional(),
  dateFirstContacted: z.string().optional(),
  lastContactDate: z.string().optional(),
  nextAction: z.string().trim().optional(),
  nextActionDate: z.string().optional(),
  notes: z.string().trim().optional(),
});

function toDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toFloat(value?: string) {
  if (!value) return null;
  const n = Number.parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

async function requireCrmEditor() {
  const user = await getCurrentUser();
  if (!user || !canEditCrm(user.roles)) {
    throw new Error("Not authorized to edit the Lead Tracker.");
  }
  return user;
}

async function nextLeadCode() {
  const last = await prisma.lead.findFirst({
    orderBy: { leadCode: "desc" },
    select: { leadCode: true },
  });
  const lastNum = last ? Number.parseInt(last.leadCode.replace(/\D/g, ""), 10) || 0 : 0;
  return `L${String(lastNum + 1).padStart(4, "0")}`;
}

export async function createLeadAction(_prevState: string | undefined, formData: FormData) {
  const actor = await requireCrmEditor();

  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }
  const data = parsed.data;

  const leadCode = await nextLeadCode();

  const lead = await prisma.lead.create({
    data: {
      leadCode,
      companyName: data.companyName,
      contactName: data.contactName || null,
      channel: data.channel,
      segment: data.segment || null,
      stage: data.stage,
      estValue: toFloat(data.estValue),
      ownerId: data.ownerId || null,
      dateFirstContacted: toDate(data.dateFirstContacted),
      lastContactDate: toDate(data.lastContactDate),
      nextAction: data.nextAction || null,
      nextActionDate: toDate(data.nextActionDate),
      notes: data.notes || null,
    },
  });

  await logActivity({
    actorId: actor.id,
    actorName: actor.name,
    action: "LEAD_CREATED",
    entityType: "Lead",
    entityId: lead.id,
    entityLabel: `${lead.leadCode} — ${lead.companyName}`,
  });

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  redirect("/leads");
}

export async function updateLeadAction(
  leadId: string,
  _prevState: string | undefined,
  formData: FormData
) {
  const actor = await requireCrmEditor();

  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }
  const data = parsed.data;

  const existing = await prisma.lead.findUnique({ where: { id: leadId } });

  const ownerIds = [existing?.ownerId, data.ownerId].filter((id): id is string => !!id);
  const owners = ownerIds.length
    ? await prisma.user.findMany({ where: { id: { in: ownerIds } } })
    : [];
  const ownerNameById = new Map(owners.map((o) => [o.id, o.name]));

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      companyName: data.companyName,
      contactName: data.contactName || null,
      channel: data.channel,
      segment: data.segment || null,
      stage: data.stage,
      estValue: toFloat(data.estValue),
      ownerId: data.ownerId || null,
      dateFirstContacted: toDate(data.dateFirstContacted),
      lastContactDate: toDate(data.lastContactDate),
      nextAction: data.nextAction || null,
      nextActionDate: toDate(data.nextActionDate),
      notes: data.notes || null,
    },
  });

  if (existing) {
    const diffs = diffFields(existing, lead, [
      { key: "companyName", label: "Company" },
      { key: "contactName", label: "Contact" },
      { key: "channel", label: "Channel" },
      { key: "segment", label: "Vertical" },
      { key: "stage", label: "Stage" },
      { key: "estValue", label: "Est. Value" },
      {
        key: "ownerId",
        label: "Owner",
        format: (id) => (id ? (ownerNameById.get(id as string) ?? "Unknown") : "Unassigned"),
      },
      { key: "nextAction", label: "Next Action" },
      { key: "notes", label: "Notes" },
    ]);

    if (diffs.length > 0) {
      await logActivity({
        actorId: actor.id,
        actorName: actor.name,
        action: "LEAD_UPDATED",
        entityType: "Lead",
        entityId: lead.id,
        entityLabel: `${lead.leadCode} — ${lead.companyName}`,
        details: diffs,
      });
    }
  }

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  redirect("/leads");
}

export async function deleteLeadAction(formData: FormData) {
  const actor = await requireCrmEditor();
  const leadId = String(formData.get("leadId") ?? "");
  if (!leadId) return;

  const lead = await prisma.lead.delete({ where: { id: leadId } });

  await logActivity({
    actorId: actor.id,
    actorName: actor.name,
    action: "LEAD_DELETED",
    entityType: "Lead",
    entityId: lead.id,
    entityLabel: `${lead.leadCode} — ${lead.companyName}`,
  });

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  redirect("/leads");
}
