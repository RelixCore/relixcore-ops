import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_LABELS, ROLE_SUBTITLES, canEditCrm, canManageTeam } from "@/lib/roles";
import UserForm from "@/components/UserForm";
import { deleteUserAction, updateUserAction, updateMyAvatarAction } from "../actions";
import AvatarForm from "@/components/AvatarForm";
import { takenAvatars } from "@/lib/avatar-claims";

export default async function TeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [member, currentUser] = await Promise.all([
    prisma.user.findUnique({ where: { id }, include: { secondaryRoles: true } }),
    getCurrentUser(),
  ]);

  if (!member) notFound();

  const canManage = currentUser ? canManageTeam(currentUser.roles) : false;
  const isAdmin = currentUser ? currentUser.roles.includes("ADMIN") : false;
  const canChooseAvatar = canManage || currentUser?.id === member.id;
  const taken = canChooseAvatar ? await takenAvatars(member.id) : [];

  if (!canManage) {
    return (
      <div>
        <div className="mb-6 flex items-center gap-4">
          {member.avatarUrl ? (
            <Image
              src={member.avatarUrl}
              alt={member.name}
              width={72}
              height={72}
              className="h-[72px] w-[72px] rounded-full object-cover"
            />
          ) : (
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-brand-teal-dark text-2xl font-semibold text-white">
              {member.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-brand-teal-dark">{member.name}</h1>
            <p className="text-sm text-foreground/60">{member.title ?? ROLE_LABELS[member.role]}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 text-sm">
          <DetailField label="Email" value={member.email} />
          <DetailField label="Primary Role" value={ROLE_LABELS[member.role]} />
          <DetailField label="What they own" value={ROLE_SUBTITLES[member.role]} />
          {member.secondaryRoles.length > 0 ? (
            <DetailField
              label="Secondary Roles"
              value={member.secondaryRoles.map((r) => ROLE_LABELS[r.role]).join(", ")}
            />
          ) : null}
          <DetailField
            label="CRM Access"
            value={
              canEditCrm({
                roles: [member.role, ...member.secondaryRoles.map((r) => r.role)],
                crmAccessOverride: member.crmAccessOverride,
              })
                ? "Can edit"
                : "Read-only"
            }
          />
        </div>
        {currentUser?.id === member.id ? <AvatarForm action={updateMyAvatarAction} current={member.avatarUrl ?? ""} taken={taken} /> : null}
      </div>
    );
  }

  const boundUpdate = updateUserAction.bind(null, member.id);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-brand-teal-dark">{member.name}</h1>
      <p className="mb-6 text-sm text-foreground/50">{member.email}</p>
      <div className="rounded-xl border border-border bg-card p-6">
        <UserForm
          action={boundUpdate}
          mode="edit"
          submitLabel="Save Changes"
          deleteAction={deleteUserAction}
          userId={member.id}
          isAdmin={isAdmin}
          takenAvatars={taken}
          defaults={{
            name: member.name,
            email: member.email,
            title: member.title ?? undefined,
            role: member.role,
            secondaryRoles: member.secondaryRoles.map((r) => r.role),
            avatarUrl: member.avatarUrl ?? undefined,
            crmAccessOverride: member.crmAccessOverride,
          }}
        />
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border py-3 first:pt-0 last:border-0 last:pb-0">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/40">{label}</p>
      <p className="mt-1 text-foreground/80">{value}</p>
    </div>
  );
}
