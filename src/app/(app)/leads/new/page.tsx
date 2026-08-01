import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canEditCrm } from "@/lib/roles";
import LeadForm from "@/components/LeadForm";
import { createLeadAction } from "../actions";

export default async function NewLeadPage() {
  const user = await getCurrentUser();
  if (!user || !canEditCrm(user.roles)) {
    redirect("/leads");
  }

  const owners = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-brand-teal-dark">New Lead</h1>
      <div className="rounded-xl border border-border bg-card p-6">
        <LeadForm action={createLeadAction} owners={owners} submitLabel="Create Lead" />
      </div>
    </div>
  );
}
