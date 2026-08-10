import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canManageTeam } from "@/lib/roles";
import UserForm from "@/components/UserForm";
import { createUserAction } from "../actions";

export default async function NewTeamMemberPage() {
  const user = await getCurrentUser();
  if (!user || !canManageTeam(user.roles)) {
    redirect("/team");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-brand-teal-dark">Add Team Member</h1>
      <div className="rounded-xl border border-border bg-card p-6">
        <UserForm
          action={createUserAction}
          mode="create"
          submitLabel="Add Team Member"
          isAdmin={user.roles.includes("ADMIN")}
        />
      </div>
    </div>
  );
}
