import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { combinedRoleLabel, canViewDashboard, canManageTeam } from "@/lib/roles";
import { getDueNextActions } from "@/lib/nextActions";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const dueNextActions = await getDueNextActions(user);

  const navItems = [
    ...(canViewDashboard(user.roles) ? [{ href: "/dashboard", label: "Dashboard" }] : []),
    { href: "/leads", label: "Lead Tracker (CRM)" },
    { href: "/checklist", label: "Daily Checklist" },
    { href: "/team", label: "Team" },
    { href: `/team/${user.id}`, label: "My Profile" },
    ...(canManageTeam(user.roles) ? [{ href: "/activity", label: "Activity Log" }] : []),
  ];

  return (
    <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
      <Sidebar
        navItems={navItems}
        userName={user.name}
        userRoleLabel={combinedRoleLabel(
          user.role,
          user.secondaryRoles.map((r) => r.role)
        )}
        avatarUrl={user.avatarUrl}
        dueNextActions={dueNextActions}
      />
      <main className="flex-1 overflow-y-auto bg-background px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
