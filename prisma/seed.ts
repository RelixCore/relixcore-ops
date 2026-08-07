import { PrismaClient, Role, Channel, Vertical, PipelineStage } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "relixcore2026";

const USERS: {
  name: string;
  email: string;
  role: Role;
  title: string;
  avatarUrl?: string;
  secondaryRoles?: Role[];
}[] = [
  { name: "System Admin", email: "admin@relixcore.local", role: "ADMIN", title: "Administrator" },
  { name: "Morgan Blake", email: "growth@relixcore.local", role: "GROWTH_LEAD", title: "Growth Lead", avatarUrl: "/images/headshot-1.jpg" },
  { name: "Priya Nair", email: "upwork@relixcore.local", role: "UPWORK_OWNER", title: "Upwork Platform Owner", avatarUrl: "/images/headshot-2.jpg", secondaryRoles: ["JUNIOR_EDITOR"] },
  { name: "Jordan Cole", email: "fiverr@relixcore.local", role: "FIVERR_OWNER", title: "Fiverr Platform Owner", avatarUrl: "/images/headshot-3.jpg" },
  { name: "Casey Adeyemi", email: "linkedin@relixcore.local", role: "LINKEDIN_OWNER", title: "LinkedIn Platform Owner", avatarUrl: "/images/headshot-4.jpg", secondaryRoles: ["SENIOR_EDITOR"] },
  { name: "Sam Okafor", email: "email@relixcore.local", role: "COLD_EMAIL_OWNER", title: "Cold Email Platform Owner", avatarUrl: "/images/headshot-5.jpg" },
  { name: "Taylor Reyes", email: "senior.editor@relixcore.local", role: "SENIOR_EDITOR", title: "Senior Editor", avatarUrl: "/images/headshot-6.jpg" },
  { name: "Riley Chen", email: "junior.editor@relixcore.local", role: "JUNIOR_EDITOR", title: "Junior Editor" },
  { name: "Drew Whitman", email: "webdev@relixcore.local", role: "WEB_DEVELOPER", title: "Web Developer" },
  { name: "Avery Sloan", email: "designer@relixcore.local", role: "GRAPHIC_DESIGNER", title: "Senior Graphic Designer — Case Study/Portfolio Owner" },
];

const LEADS: {
  companyName: string;
  contactName: string;
  channel: Channel;
  segment: Vertical;
  stage: PipelineStage;
  estValue: number;
  ownerEmail: string;
  daysAgoContacted: number;
  daysAgoLastContact: number;
  nextAction: string;
  nextActionInDays: number;
  notes: string;
}[] = [
  {
    companyName: "Northwind Cooking Co.",
    contactName: "Jane Doe",
    channel: "COLD_EMAIL",
    segment: "YOUTUBE_DOCUMENTARY",
    stage: "CASE_STUDY",
    estValue: 1800,
    ownerEmail: "email@relixcore.local",
    daysAgoContacted: 45,
    daysAgoLastContact: 3,
    nextAction: "Publish YouTube breakdown video",
    nextActionInDays: 5,
    notes: "Average view duration rose from 38% to 54% across 6 videos. Testimonial captured.",
  },
  {
    companyName: "Meridian Cooking Co.",
    contactName: "Ravi Kapoor",
    channel: "DREAM_100",
    segment: "YOUTUBE_DOCUMENTARY",
    stage: "DISCOVERY_CALL",
    estValue: 2200,
    ownerEmail: "growth@relixcore.local",
    daysAgoContacted: 4,
    daysAgoLastContact: 1,
    nextAction: "Send custom sample edit",
    nextActionInDays: 2,
    notes: "500K subs, retention visibly dropping mid-video, clear budget.",
  },
  {
    companyName: "Northwind SaaS Co.",
    contactName: "Jane Doe",
    channel: "COLD_EMAIL",
    segment: "SAAS_TECH",
    stage: "PROPOSAL",
    estValue: 2500,
    ownerEmail: "email@relixcore.local",
    daysAgoContacted: 12,
    daysAgoLastContact: 3,
    nextAction: "Follow up on proposal",
    nextActionInDays: 2,
    notes: "Wants a 60-sec demo video; sent case study PDF.",
  },
  {
    companyName: "Myron Creative",
    contactName: "Myron",
    channel: "UPWORK",
    segment: "SHORT_FORM",
    stage: "PROPOSAL",
    estValue: 1000,
    ownerEmail: "upwork@relixcore.local",
    daysAgoContacted: 6,
    daysAgoLastContact: 6,
    nextAction: "End lead prospecting",
    nextActionInDays: -2,
    notes: "Has not yet opened proposal on Upwork.",
  },
  {
    companyName: "Harbor Realty Group",
    contactName: "Elena Vance",
    channel: "COLD_EMAIL",
    segment: "REAL_ESTATE",
    stage: "WON",
    estValue: 1500,
    ownerEmail: "email@relixcore.local",
    daysAgoContacted: 20,
    daysAgoLastContact: 2,
    nextAction: "Send onboarding form",
    nextActionInDays: 1,
    notes: "Flat monthly retainer, up to 6 listings/month. Loved the flat-rate pitch.",
  },
  {
    companyName: "Deep Dive Podcast Network",
    contactName: "Marcus Lee",
    channel: "LINKEDIN_OUTBOUND",
    segment: "PODCAST_PRODUCTION",
    stage: "ONBOARDING",
    estValue: 2000,
    ownerEmail: "linkedin@relixcore.local",
    daysAgoContacted: 15,
    daysAgoLastContact: 1,
    nextAction: "Confirm delivery timeline and first check-in date",
    nextActionInDays: 1,
    notes: "Weekly show, full-episode retainer, direct upload access pending.",
  },
  {
    companyName: "Dr. Amara Chen — Personal Brand",
    contactName: "Amara Chen",
    channel: "LINKEDIN_INBOUND",
    segment: "PERSONAL_BRAND",
    stage: "DELIVERY",
    estValue: 2400,
    ownerEmail: "linkedin@relixcore.local",
    daysAgoContacted: 60,
    daysAgoLastContact: 4,
    nextAction: "Monthly retention check-in",
    nextActionInDays: 10,
    notes: "Personal Brand Engine bundle — cross-sell into web updates discussed.",
  },
  {
    companyName: "SkillForge Academy",
    contactName: "Ben Ortiz",
    channel: "REFERRAL",
    segment: "ONLINE_COURSE",
    stage: "UPSELL",
    estValue: 3200,
    ownerEmail: "growth@relixcore.local",
    daysAgoContacted: 90,
    daysAgoLastContact: 5,
    nextAction: "Pitch ongoing content retainer post-launch",
    nextActionInDays: 7,
    notes: "Course Launch Package delivered on time; launch converted well.",
  },
  {
    companyName: "Vantage Fitness Studio",
    contactName: "Nora Patel",
    channel: "FIVERR",
    segment: "SHORT_FORM",
    stage: "NEGOTIATION",
    estValue: 1200,
    ownerEmail: "fiverr@relixcore.local",
    daysAgoContacted: 8,
    daysAgoLastContact: 1,
    nextAction: "Address timeline pushback",
    nextActionInDays: 1,
    notes: 'Objection: "need it faster than 5 business days" — offering rush add-on.',
  },
  {
    companyName: "Clearwater Legal Partners",
    contactName: "Owen Marsh",
    channel: "PARTNER_AGENCY",
    segment: "PERSONAL_BRAND",
    stage: "QUALIFIED",
    estValue: 1800,
    ownerEmail: "growth@relixcore.local",
    daysAgoContacted: 3,
    daysAgoLastContact: 3,
    nextAction: "Book discovery call",
    nextActionInDays: 3,
    notes: "White-label referral from PR agency partner. Budget and timeline confirmed.",
  },
  {
    companyName: "Sable & Finch Realty",
    contactName: "Talia Sable",
    channel: "COLD_EMAIL",
    segment: "REAL_ESTATE",
    stage: "LEAD",
    estValue: 1200,
    ownerEmail: "email@relixcore.local",
    daysAgoContacted: 1,
    daysAgoLastContact: 1,
    nextAction: "Day 4 follow-up email",
    nextActionInDays: 3,
    notes: "Day 1 opener sent, no reply yet.",
  },
  {
    companyName: "Bright Path Coaching",
    contactName: "Devon Marsh",
    channel: "COMMUNITY",
    segment: "PERSONAL_BRAND",
    stage: "LOST",
    estValue: 900,
    ownerEmail: "linkedin@relixcore.local",
    daysAgoContacted: 30,
    daysAgoLastContact: 25,
    nextAction: "Revisit in 60 days",
    nextActionInDays: 30,
    notes: "Budget wasn't confirmed — went with a solo freelancer instead.",
  },
];

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const userIdByEmail = new Map<string, string>();
  for (const u of USERS) {
    const secondaryRoles = u.secondaryRoles ?? [];
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        title: u.title,
        avatarUrl: u.avatarUrl,
        secondaryRoles: {
          deleteMany: {},
          create: secondaryRoles.map((role) => ({ role })),
        },
      },
      create: {
        name: u.name,
        email: u.email,
        role: u.role,
        title: u.title,
        avatarUrl: u.avatarUrl,
        passwordHash,
        secondaryRoles: {
          create: secondaryRoles.map((role) => ({ role })),
        },
      },
    });
    userIdByEmail.set(u.email, user.id);
  }

  let i = 1;
  for (const lead of LEADS) {
    const leadCode = `L${String(i).padStart(4, "0")}`;
    i += 1;
    await prisma.lead.upsert({
      where: { leadCode },
      update: {},
      create: {
        leadCode,
        companyName: lead.companyName,
        contactName: lead.contactName,
        channel: lead.channel,
        segment: lead.segment,
        stage: lead.stage,
        estValue: lead.estValue,
        ownerId: userIdByEmail.get(lead.ownerEmail),
        firstContactId: userIdByEmail.get(lead.ownerEmail),
        dateFirstContacted: daysFromNow(-lead.daysAgoContacted),
        lastContactDate: daysFromNow(-lead.daysAgoLastContact),
        nextAction: lead.nextAction,
        nextActionDate: daysFromNow(lead.nextActionInDays),
        notes: lead.notes,
      },
    });
  }

  console.log(`Seeded ${USERS.length} users and ${LEADS.length} leads.`);
  console.log(`Default password for every seeded account: ${DEFAULT_PASSWORD}`);
  console.log("Login emails:");
  for (const u of USERS) console.log(`  ${u.email}  (${u.role})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
