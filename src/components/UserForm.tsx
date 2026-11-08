"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Role } from "@prisma/client";
import { ROLE_LABELS } from "@/lib/roles";
import ConfirmButton from "./ConfirmButton";
import AvatarPicker from "./AvatarPicker";

type UserDefaults = {
  name?: string;
  email?: string;
  title?: string;
  role?: Role;
  secondaryRoles?: Role[];
  avatarUrl?: string;
  crmAccessOverride?: boolean;
};

export default function UserForm({
  action,
  mode,
  defaults,
  submitLabel,
  deleteAction,
  userId,
  isAdmin,
  takenAvatars = [],
}: {
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  mode: "create" | "edit";
  defaults?: UserDefaults;
  submitLabel: string;
  deleteAction?: (formData: FormData) => Promise<void>;
  userId?: string;
  isAdmin?: boolean;
  takenAvatars?: string[];
}) {
  const [error, formAction, pending] = useActionState(action, undefined);
  const secondaryDefaults = new Set(defaults?.secondaryRoles ?? []);

  return (
    <div className="flex flex-col gap-5">
      <form id="user-form" action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Full Name" required>
          <input name="name" required defaultValue={defaults?.name} className="input" />
        </Field>
        <Field label="Email" required>
          <input
            name="email"
            type="email"
            required
            defaultValue={defaults?.email}
            className="input"
          />
        </Field>

        <Field label="Title">
          <input
            name="title"
            defaultValue={defaults?.title}
            placeholder="Defaults to the primary role's label"
            className="input"
          />
        </Field>

        <Field label="Primary Role" required>
          <select name="role" required defaultValue={defaults?.role ?? ""} className="input">
            <option value="" disabled>
              Select a role
            </option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={mode === "create" ? "Temporary Password" : "Reset Password"} required={mode === "create"}>
          <input
            name="password"
            type="password"
            required={mode === "create"}
            placeholder={mode === "create" ? "relixcore2026" : "Leave blank to keep current password"}
            className="input"
          />
        </Field>
      </div>

      <AvatarPicker current={defaults?.avatarUrl} taken={takenAvatars} disabled={pending} />

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-brand-teal-dark">
          Secondary Roles <span className="font-normal text-foreground/50">(double duty — e.g. a Platform Owner who also edits)</span>
        </legend>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border p-4 sm:grid-cols-3">
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm text-foreground/80">
              <input
                type="checkbox"
                name="secondaryRoles"
                value={value}
                defaultChecked={secondaryDefaults.has(value as Role)}
                className="h-4 w-4 accent-brand-red"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {isAdmin ? (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-brand-teal-dark">
            CRM Access <span className="font-normal text-foreground/50">(Admin only)</span>
          </legend>
          <label className="flex items-center gap-2 rounded-lg border border-border p-4 text-sm text-foreground/80">
            <input
              type="checkbox"
              name="crmAccessOverride"
              defaultChecked={defaults?.crmAccessOverride ?? false}
              className="h-4 w-4 accent-brand-red"
            />
            Grant CRM edit access, independent of role
          </label>
        </fieldset>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-brand-red-dark">{error}</p>
      ) : null}
      </form>

      <div className="flex items-center justify-between border-t border-border pt-5">
        <div className="flex gap-3">
          <button
            type="submit"
            form="user-form"
            disabled={pending}
            className="rounded-lg bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-red-dark disabled:opacity-60"
          >
            {pending ? "Saving…" : submitLabel}
          </button>
          <Link
            href="/team"
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground/70 hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
        {deleteAction ? (
          <form action={deleteAction}>
            <input type="hidden" name="userId" value={userId} />
            <ConfirmButton
              confirmMessage="Remove this team member? This can't be undone."
              className="text-sm font-medium text-brand-red hover:underline"
            >
              Remove team member
            </ConfirmButton>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-brand-teal-dark">
        {label}
        {required ? <span className="text-brand-red"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
