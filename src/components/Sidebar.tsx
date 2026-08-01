"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions";

type NavItem = { href: string; label: string };

export default function Sidebar({
  navItems,
  userName,
  userRoleLabel,
  avatarUrl,
}: {
  navItems: NavItem[];
  userName: string;
  userRoleLabel: string;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col bg-brand-teal-dark text-white">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <Image
          src="/images/logo.png"
          alt="RelixCore"
          width={36}
          height={36}
          className="flex-shrink-0"
        />
        <div>
          <p className="text-sm font-semibold leading-tight">RelixCore</p>
          <p className="text-xs leading-tight text-white/50">Operations</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-brand-red text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="mb-3 flex items-center gap-2.5">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={userName}
              width={32}
              height={32}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-red text-xs font-semibold">
              {userName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="truncate text-xs text-white/50">{userRoleLabel}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
