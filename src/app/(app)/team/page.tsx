import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_LABELS, canManageTeam } from "@/lib/roles";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, currentUser, users] = await Promise.all([
    searchParams,
    getCurrentUser(),
    prisma.user.findMany({ orderBy: { name: "asc" }, include: { secondaryRoles: true } }),
  ]);

  const canManage = currentUser ? canManageTeam(currentUser.roles) : false;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-teal-dark">Team</h1>
          <p className="mt-1 text-sm text-foreground/60">
            {users.length} team member{users.length === 1 ? "" : "s"}
          </p>
        </div>
        {canManage ? (
          <Link
            href="/team/new"
            className="rounded-lg bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-red-dark"
          >
            + Add Team Member
          </Link>
        ) : null}
      </div>

      {error ? (
        <p className="mb-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-brand-red-dark">{error}</p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {users.map((u) => (
          <div key={u.id} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
            {u.avatarUrl ? (
              <Image
                src={u.avatarUrl}
                alt={u.name}
                width={56}
                height={56}
                className="h-14 w-14 flex-shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-brand-teal-dark text-lg font-semibold text-white">
                {u.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <Link href={`/team/${u.id}`} className="truncate font-medium text-brand-teal-dark hover:underline">
                {u.name}
              </Link>
              <p className="truncate text-sm text-foreground/60">{u.title ?? ROLE_LABELS[u.role]}</p>
              <p className="truncate text-xs text-foreground/40">{u.email}</p>
              {u.secondaryRoles.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {u.secondaryRoles.map((r) => (
                    <span
                      key={r.id}
                      className="rounded-full bg-brand-teal/10 px-2 py-0.5 text-xs font-medium text-brand-teal-dark"
                    >
                      {ROLE_LABELS[r.role]}
                    </span>
                  ))}
                </div>
              ) : null}
              {canManage ? (
                <Link
                  href={`/team/${u.id}`}
                  className="mt-2 inline-block text-xs font-medium text-brand-red hover:underline"
                >
                  Edit
                </Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
