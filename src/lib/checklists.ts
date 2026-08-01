import { Role } from "@prisma/client";

export type ChecklistBlock = {
  time: string;
  label: string;
  items: string[];
};

export type ChecklistTemplate = {
  blocks: ChecklistBlock[];
};

// Transcribed from RelixCore_Daily_Planner_Checklists.docx — one template per role.
// itemKey = `${blockIndex}-${itemIndex}`, stable as long as this file isn't reordered.
export const CHECKLIST_TEMPLATES: Record<Role, ChecklistTemplate> = {
  ADMIN: {
    blocks: [
      {
        time: "Anytime",
        label: "Admin",
        items: [
          "Review team checklist completion across all roles",
          "Review the KPI Dashboard for anything unusual",
        ],
      },
    ],
  },
  GROWTH_LEAD: {
    blocks: [
      {
        time: "9:00–9:30",
        label: "Arrival & Setup",
        items: [
          "Check overnight replies across all channels (Upwork, Fiverr, LinkedIn, email)",
          "Scan the KPI Dashboard for anything unusual — a channel spike or drop",
          "Review today's calendar: discovery calls, proposals due, follow-ups due",
        ],
      },
      {
        time: "9:30–1:00",
        label: "Client Project / Portfolio / Training",
        items: [
          "Review one in-progress client account for scope, quality, or timeline risk",
          "Approve any pricing exceptions raised by platform owners",
          "Review or refresh one SOP / training doc in the SOP library",
          "Mentoring touch-point: check in with one team member on a blocker",
          "Check in on any Dream 100 target currently in an active conversation",
        ],
      },
      {
        time: "2:00–5:00",
        label: "Lead & Client Acquisition",
        items: [
          "Run today's scheduled discovery calls",
          "Review and approve proposals before they're sent (pricing + scope)",
          "Check in with each platform owner on daily quotas and blockers",
          "Work any Negotiation-stage conversations toward a decision",
          "Move won/lost deals to the correct CRM stage",
        ],
      },
      {
        time: "End of day",
        label: "Wrap-up",
        items: ["Log every deal movement in the CRM"],
      },
    ],
  },
  UPWORK_OWNER: {
    blocks: [
      {
        time: "9:00–9:30",
        label: "Arrival & Quick Channel Check",
        items: [
          "Filter and review new jobs (Video & Animation, posted ≤24h, payment verified)",
          "Check Connects balance",
          "Reply to any urgent client messages on active jobs",
        ],
      },
      {
        time: "9:30–1:00",
        label: "Client Project / Portfolio / Training",
        items: [
          "Deliver assigned client work if also on the editing/design roster",
          "If not on a delivery assignment today: refresh portfolio pieces and profile summary",
        ],
      },
      {
        time: "2:00–5:00",
        label: "Lead & Client Acquisition — Upwork SOP",
        items: [
          "Submit 5–10 tailored proposals (AI first pass, hand-personalize first two lines)",
          "Attach a 30–60 sec Loom-style video proposal for jobs over $500",
          'Log every proposal in the CRM same day — channel, segment, status "Contacted"',
          "Follow up once on any day-4 unanswered proposal",
          "Message active leads / answer client questions",
        ],
      },
      {
        time: "End of day",
        label: "Wrap-up",
        items: ["Log everything in the CRM (Lead Tracker) before logging off"],
      },
    ],
  },
  FIVERR_OWNER: {
    blocks: [
      {
        time: "9:00–9:30",
        label: "Arrival & Quick Channel Check",
        items: [
          "Check Buyer Requests — first response wins a large share of Fiverr jobs",
          "Answer any overnight gig inbox messages",
        ],
      },
      {
        time: "9:30–1:00",
        label: "Client Project / Portfolio / Training",
        items: [
          "Deliver assigned client work if also on the editing/design roster",
          "If not on a delivery assignment today: refresh one gig's gallery images or video",
        ],
      },
      {
        time: "2:00–5:00",
        label: "Lead & Client Acquisition — Fiverr SOP",
        items: [
          "Check Buyer Requests again mid-afternoon and answer within the hour",
          "Answer all gig inbox messages within 1 hour",
          "Log every new order and inquiry in the CRM",
          "Confirm gig freshness — last update under 6 weeks",
          "Track review count toward the 15–20 threshold for Fiverr Pro eligibility",
        ],
      },
      {
        time: "End of day",
        label: "Wrap-up",
        items: ["Log everything in the CRM (Lead Tracker) before logging off"],
      },
    ],
  },
  LINKEDIN_OWNER: {
    blocks: [
      {
        time: "9:00–9:30",
        label: "Arrival & Quick Channel Check",
        items: [
          "Check overnight connection acceptances and DM replies",
          "Note any warm conversation that's gone quiet for the Day 5/10 follow-up",
        ],
      },
      {
        time: "9:30–1:00",
        label: "Client Project / Portfolio / Training",
        items: [
          "Deliver assigned client work if also on the editing/design roster",
          "If not on a delivery assignment today: draft/schedule this week's flywheel content",
        ],
      },
      {
        time: "2:00–5:00",
        label: "Lead & Client Acquisition — LinkedIn SOP",
        items: [
          "Publish scheduled flywheel or authority content from personal profiles (2–3x/week)",
          "Send 15–20 personalized connection requests, no pitch in message 1",
          "Follow up with 5 warm (previously accepted) connections at Day 2/5/10",
          "Escalate any stalled warm conversation to a Video Audit instead of a 4th follow-up",
          "Log every connection, message, and reply in the CRM",
        ],
      },
      {
        time: "End of day",
        label: "Wrap-up",
        items: ["Log everything in the CRM (Lead Tracker) before logging off"],
      },
    ],
  },
  COLD_EMAIL_OWNER: {
    blocks: [
      {
        time: "9:00–9:30",
        label: "Arrival & Quick Channel Check",
        items: [
          "Check overnight replies and bounces across sending inboxes",
          "Flag any reply that needs a same-day response",
        ],
      },
      {
        time: "9:30–1:00",
        label: "Client Project / Portfolio / Training",
        items: [
          "Deliver assigned client work if also on the editing/design roster",
          "If not on a delivery assignment today: verify and dedupe this week's new list additions",
        ],
      },
      {
        time: "2:00–5:00",
        label: "Lead & Client Acquisition — Cold Email SOP",
        items: [
          "Send 20–30 new first-touch emails per sending inbox",
          "Send scheduled Day 4 (proof asset) and Day 9 (breakup) follow-ups",
          "Spread volume across 2–3 sending inboxes to protect deliverability",
          "Log every send, open, and reply in the CRM",
        ],
      },
      {
        time: "End of day",
        label: "Wrap-up",
        items: ["Log everything in the CRM (Lead Tracker) before logging off"],
      },
    ],
  },
  SENIOR_EDITOR: {
    blocks: [
      {
        time: "9:00–9:30",
        label: "Arrival & Setup",
        items: [
          "Check overnight client messages and revision requests",
          "Review today's delivery priorities against project deadlines",
        ],
      },
      {
        time: "9:30–1:00",
        label: "Client Project / Portfolio / Training",
        items: [
          "Complete assigned delivery work against the Delivery QA checklist",
          "Mentor/review one junior editor's cut before it goes to final QA",
          "If assigned as a Platform Owner today, handle the channel's morning quick-check",
        ],
      },
      {
        time: "2:00–5:00",
        label: "Lead & Client Acquisition",
        items: [
          'Flag any newly "Delivered" project to the Case Study/Portfolio Owner for the flywheel',
          "Contribute one before/after clip or technique note to the content pipeline",
          "If a Dream 100 custom sample edit has been requested, work on it",
          "If assigned as a Platform Owner today, complete that channel's SOP block",
        ],
      },
      {
        time: "End of day",
        label: "Wrap-up",
        items: ["Log everything in the CRM (Lead Tracker) before logging off"],
      },
    ],
  },
  JUNIOR_EDITOR: {
    blocks: [
      {
        time: "9:00–9:30",
        label: "Arrival & Setup",
        items: [
          "Check the task queue and any overnight revision requests",
          "Confirm today's assigned cuts and deadlines",
        ],
      },
      {
        time: "9:30–1:00",
        label: "Client Project / Portfolio / Training",
        items: [
          "Complete assigned cuts against the delivery checklist for that content type",
          "Request feedback from a senior editor on at least one project this week",
        ],
      },
      {
        time: "2:00–5:00",
        label: "Lead & Client Acquisition",
        items: [
          "Log any revision requests in the project folder, not a scattered chat thread",
          "Support the Content Flywheel: cut short clips (Shorts/Reels/TikTok) from a finished project if assigned",
          "Continue/finish assigned cuts if delivery deadlines require it",
        ],
      },
      {
        time: "End of day",
        label: "Wrap-up",
        items: ["Log everything in the CRM (Lead Tracker) before logging off"],
      },
    ],
  },
  WEB_DEVELOPER: {
    blocks: [
      {
        time: "9:00–9:30",
        label: "Arrival & Setup",
        items: [
          "Check active build tickets and overnight messages",
          "Confirm today's priority: client build vs. internal site work",
        ],
      },
      {
        time: "9:30–1:00",
        label: "Client Project / Portfolio / Training",
        items: [
          "Work assigned landing page or SaaS-bundle build tasks",
          "Training block: sharpen a relevant skill (framework, animation library, page-speed) if no client build is active",
        ],
      },
      {
        time: "2:00–5:00",
        label: "Lead & Client Acquisition",
        items: [
          "Maintain the studio's own website — add portfolio updates from the Content Flywheel",
          "Support any Dream 100 custom asset build if requested",
          "Weekly: review free-asset landing pages (checklists/calculators) for needed updates",
        ],
      },
      {
        time: "End of day",
        label: "Wrap-up",
        items: ["Log everything in the CRM (Lead Tracker) before logging off"],
      },
    ],
  },
  GRAPHIC_DESIGNER: {
    blocks: [
      {
        time: "9:00–9:30",
        label: "Arrival & Setup",
        items: [
          'Check the CRM for any newly "Delivered" project to trigger the Content Flywheel',
          "Review today's in-progress design deliverables and deadlines",
        ],
      },
      {
        time: "9:30–1:00",
        label: "Client Project / Portfolio / Training",
        items: [
          "Design any in-progress case study, carousel, or gig/portfolio image",
          "Complete assigned client-facing design deliverables against Delivery QA",
        ],
      },
      {
        time: "2:00–5:00",
        label: "Lead & Client Acquisition",
        items: [
          "Draft the 1-page case study for any newly delivered project (AI-assisted, human-verified)",
          "Build the Instagram carousel and LinkedIn/X graphics from the case study",
          "Publish the week's scheduled flywheel content",
          "Weekly: refresh one Fiverr gig gallery or one vertical's demo reel",
        ],
      },
      {
        time: "End of day",
        label: "Wrap-up",
        items: ["Log everything in the CRM (Lead Tracker) before logging off"],
      },
    ],
  },
};

export function totalItemCount(roles: Role | Role[]): number {
  const list = Array.isArray(roles) ? roles : [roles];
  return list.reduce(
    (sum, role) => sum + CHECKLIST_TEMPLATES[role].blocks.reduce((s, b) => s + b.items.length, 0),
    0
  );
}

// itemKey scheme is `${role}:${blockIndex}-${itemIndex}` so a user holding
// multiple roles can complete the same block/item index in each without
// their ChecklistEntry rows colliding.
export function checklistItemKey(role: Role, blockIndex: number, itemIndex: number): string {
  return `${role}:${blockIndex}-${itemIndex}`;
}
