"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  CHANNEL_LABELS,
  STAGE_LABELS,
  STAGE_ORDER,
  VERTICAL_LABELS,
} from "@/lib/roles";
import ConfirmButton from "./ConfirmButton";

type Owner = { id: string; name: string };

type LeadDefaults = {
  companyName?: string;
  contactName?: string;
  channel?: string;
  segment?: string;
  stage?: string;
  estValue?: number | null;
  ownerId?: string | null;
  firstContactId?: string | null;
  dateFirstContacted?: string;
  lastContactDate?: string;
  nextAction?: string;
  nextActionDate?: string;
  notes?: string;
};

function toInputDate(value?: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

export default function LeadForm({
  action,
  owners,
  defaults,
  submitLabel,
  deleteAction,
  leadId,
}: {
  action: (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
  owners: Owner[];
  defaults?: LeadDefaults;
  submitLabel: string;
  deleteAction?: (formData: FormData) => Promise<void>;
  leadId?: string;
}) {
  const [error, formAction, pending] = useActionState(action, undefined);

  return (
    <div className="flex flex-col gap-5">
      <form id="lead-form" action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Company / Client Name" required>
          <input
            name="companyName"
            required
            defaultValue={defaults?.companyName}
            className="input"
          />
        </Field>
        <Field label="Contact Name">
          <input name="contactName" defaultValue={defaults?.contactName} className="input" />
        </Field>

        <Field label="Channel" required>
          <select name="channel" required defaultValue={defaults?.channel ?? ""} className="input">
            <option value="" disabled>
              Select a channel
            </option>
            {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Segment (Vertical)">
          <select name="segment" defaultValue={defaults?.segment ?? ""} className="input">
            <option value="">—</option>
            {Object.entries(VERTICAL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Pipeline Stage" required>
          <select name="stage" required defaultValue={defaults?.stage ?? "LEAD"} className="input">
            {STAGE_ORDER.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Est. Value ($)">
          <input
            name="estValue"
            type="number"
            min="0"
            step="1"
            defaultValue={defaults?.estValue ?? undefined}
            className="input"
          />
        </Field>

        <Field label="Owner">
          <select name="ownerId" defaultValue={defaults?.ownerId ?? ""} className="input">
            <option value="">Unassigned</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="First Contact">
          <select name="firstContactId" defaultValue={defaults?.firstContactId ?? ""} className="input">
            <option value="">Unassigned</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Date First Contacted">
          <input
            name="dateFirstContacted"
            type="date"
            defaultValue={toInputDate(defaults?.dateFirstContacted)}
            className="input"
          />
        </Field>
        <Field label="Last Contact Date">
          <input
            name="lastContactDate"
            type="date"
            defaultValue={toInputDate(defaults?.lastContactDate)}
            className="input"
          />
        </Field>

        <Field label="Next Action">
          <input name="nextAction" defaultValue={defaults?.nextAction} className="input" />
        </Field>
        <Field label="Next Action Date">
          <input
            name="nextActionDate"
            type="date"
            defaultValue={toInputDate(defaults?.nextActionDate)}
            className="input"
          />
        </Field>
      </div>

      <Field label="Notes">
        <textarea name="notes" rows={4} defaultValue={defaults?.notes} className="input" />
      </Field>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-brand-red-dark">{error}</p>
      ) : null}
      </form>

      <div className="flex items-center justify-between border-t border-border pt-5">
        <div className="flex gap-3">
          <button
            type="submit"
            form="lead-form"
            disabled={pending}
            className="rounded-lg bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-red-dark disabled:opacity-60"
          >
            {pending ? "Saving…" : submitLabel}
          </button>
          <Link
            href="/leads"
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground/70 hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
        {deleteAction ? (
          <form action={deleteAction}>
            <input type="hidden" name="leadId" value={leadId} />
            <ConfirmButton
              confirmMessage="Delete this lead? This can't be undone."
              className="text-sm font-medium text-brand-red hover:underline"
            >
              Delete lead
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
