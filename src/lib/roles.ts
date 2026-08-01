import { Role } from "@prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  GROWTH_LEAD: "Growth Lead",
  UPWORK_OWNER: "Upwork Platform Owner",
  FIVERR_OWNER: "Fiverr Platform Owner",
  LINKEDIN_OWNER: "LinkedIn Platform Owner",
  COLD_EMAIL_OWNER: "Cold Email Platform Owner",
  SENIOR_EDITOR: "Senior Editor",
  JUNIOR_EDITOR: "Junior Editor",
  WEB_DEVELOPER: "Web Developer",
  GRAPHIC_DESIGNER: "Senior Graphic Designer",
};

export const ROLE_SUBTITLES: Record<Role, string> = {
  ADMIN: "Full system access",
  GROWTH_LEAD: "Owns pipeline, pricing, KPIs, and the Dream 100 process",
  UPWORK_OWNER: "Wins project-based and retainer work through tailored, fast proposals",
  FIVERR_OWNER: "Converts Buyer Requests and gig traffic into orders through speed",
  LINKEDIN_OWNER: "Runs inbound content and outbound outreach together",
  COLD_EMAIL_OWNER: "Generates first-touch conversations without damaging sender reputation",
  SENIOR_EDITOR: "Leads client delivery and mentors junior editors",
  JUNIOR_EDITOR: "Executes assigned cuts and builds toward senior review",
  WEB_DEVELOPER: "Builds landing pages, SaaS-bundle assets, and maintains the studio site",
  GRAPHIC_DESIGNER: "Case Study / Portfolio Owner — triggers and produces the Content Flywheel",
};

// Roles that get the full Admin/KPI Dashboard (Part 7.1 of the Operating Manual).
export const DASHBOARD_ROLES: Role[] = ["ADMIN", "GROWTH_LEAD"];

// Roles that may create/edit/delete CRM leads (Platform Owners run outreach per
// Part 1.5 RACI; editors/web devs/designers are read-only on the CRM in v1).
export const CRM_EDIT_ROLES: Role[] = [
  "ADMIN",
  "GROWTH_LEAD",
  "UPWORK_OWNER",
  "FIVERR_OWNER",
  "LINKEDIN_OWNER",
  "COLD_EMAIL_OWNER",
];

// Roles that may add, edit, or remove team members.
export const TEAM_MANAGE_ROLES: Role[] = ["ADMIN", "GROWTH_LEAD"];

function toList(roles: Role | Role[]): Role[] {
  return Array.isArray(roles) ? roles : [roles];
}

export function canEditCrm(roles: Role | Role[]) {
  return toList(roles).some((r) => CRM_EDIT_ROLES.includes(r));
}

export function canViewDashboard(roles: Role | Role[]) {
  return toList(roles).some((r) => DASHBOARD_ROLES.includes(r));
}

export function canManageTeam(roles: Role | Role[]) {
  return toList(roles).some((r) => TEAM_MANAGE_ROLES.includes(r));
}

// The union of a user's primary role and any secondary roles, deduplicated
// with the primary role always first.
export function effectiveRoles(user: { role: Role; secondaryRoles?: { role: Role }[] }): Role[] {
  return [...new Set([user.role, ...(user.secondaryRoles?.map((r) => r.role) ?? [])])];
}

export function combinedRoleLabel(role: Role, secondaryRoles: Role[]): string {
  if (secondaryRoles.length === 0) return ROLE_LABELS[role];
  return [role, ...secondaryRoles].map((r) => ROLE_LABELS[r]).join(" + ");
}

export const CHANNEL_LABELS: Record<string, string> = {
  UPWORK: "Upwork",
  FIVERR: "Fiverr",
  LINKEDIN_OUTBOUND: "LinkedIn - Outbound",
  LINKEDIN_INBOUND: "LinkedIn - Inbound",
  COLD_EMAIL: "Cold Email",
  DREAM_100: "Dream 100",
  REFERRAL: "Referral",
  PARTNER_AGENCY: "Partner Agency",
  COMMUNITY: "Community",
  OTHER: "Other",
};

export const VERTICAL_LABELS: Record<string, string> = {
  YOUTUBE_DOCUMENTARY: "YouTube / Documentary",
  SHORT_FORM: "Short-Form / Personal Brand",
  SAAS_TECH: "SaaS / Tech",
  REAL_ESTATE: "Real Estate",
  PODCAST_PRODUCTION: "Podcast Production",
  PERSONAL_BRAND: "Personal Brands",
  ONLINE_COURSE: "Online Courses",
};

export const STAGE_LABELS: Record<string, string> = {
  LEAD: "Lead",
  QUALIFIED: "Qualified",
  DISCOVERY_CALL: "Discovery Call",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  ONBOARDING: "Onboarding",
  DELIVERY: "Delivery",
  UPSELL: "Upsell",
  REFERRAL: "Referral",
  CASE_STUDY: "Case Study",
  LOST: "Lost",
};

export const STAGE_ORDER = [
  "LEAD",
  "QUALIFIED",
  "DISCOVERY_CALL",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "ONBOARDING",
  "DELIVERY",
  "UPSELL",
  "REFERRAL",
  "CASE_STUDY",
  "LOST",
] as const;
