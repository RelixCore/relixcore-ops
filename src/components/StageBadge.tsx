import { STAGE_LABELS } from "@/lib/roles";

const STAGE_COLORS: Record<string, string> = {
  LEAD: "bg-zinc-100 text-zinc-700",
  QUALIFIED: "bg-sky-100 text-sky-700",
  DISCOVERY_CALL: "bg-indigo-100 text-indigo-700",
  PROPOSAL: "bg-amber-100 text-amber-700",
  NEGOTIATION: "bg-orange-100 text-orange-700",
  WON: "bg-emerald-100 text-emerald-700",
  ONBOARDING: "bg-teal-100 text-teal-700",
  DELIVERY: "bg-blue-100 text-blue-700",
  UPSELL: "bg-violet-100 text-violet-700",
  REFERRAL: "bg-pink-100 text-pink-700",
  CASE_STUDY: "bg-fuchsia-100 text-fuchsia-700",
  LOST: "bg-red-100 text-red-700",
};

export default function StageBadge({ stage }: { stage: string }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
        STAGE_COLORS[stage] ?? "bg-zinc-100 text-zinc-700"
      }`}
    >
      {STAGE_LABELS[stage] ?? stage}
    </span>
  );
}
