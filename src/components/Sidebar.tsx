"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import ChatUnreadBadge from "./ChatUnreadBadge";
import { logoutAction } from "@/app/actions";
import NextActionBell, { type NextActionBellItem } from "@/components/NextActionBell";

type NavItem = { href: string; label: string };

export default function Sidebar({
  navItems,
  userName,
  userRoleLabel,
  avatarUrl,
  dueNextActions,
}: {
  navItems: NavItem[];
  userName: string;
  userRoleLabel: string;
  avatarUrl?: string | null;
  dueNextActions: NextActionBellItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b border-border bg-brand-teal-dark px-4 py-3 text-white lg:hidden">
        <div className="flex items-center gap-2.5">
          <Image src="/images/logo.png" alt="RelixCore" width={28} height={28} className="flex-shrink-0" />
          <p className="text-sm font-semibold leading-tight">RelixCore Ops</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-64 max-w-[85vw] flex-shrink-0 flex-col bg-brand-teal-dark text-white transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-64 lg:max-w-none lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-3">
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
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <NextActionBell items={dueNextActions} />

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-brand-red text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
                {item.href === "/chat" ? <ChatUnreadBadge /> : null}
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
    </>
  );
}
