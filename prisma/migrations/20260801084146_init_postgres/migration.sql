-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'GROWTH_LEAD', 'UPWORK_OWNER', 'FIVERR_OWNER', 'LINKEDIN_OWNER', 'COLD_EMAIL_OWNER', 'SENIOR_EDITOR', 'JUNIOR_EDITOR', 'WEB_DEVELOPER', 'GRAPHIC_DESIGNER');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('UPWORK', 'FIVERR', 'LINKEDIN_OUTBOUND', 'LINKEDIN_INBOUND', 'COLD_EMAIL', 'DREAM_100', 'REFERRAL', 'PARTNER_AGENCY', 'COMMUNITY', 'OTHER');

-- CreateEnum
CREATE TYPE "Vertical" AS ENUM ('YOUTUBE_DOCUMENTARY', 'SHORT_FORM', 'SAAS_TECH', 'REAL_ESTATE', 'PODCAST_PRODUCTION', 'PERSONAL_BRAND', 'ONLINE_COURSE');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('LEAD', 'QUALIFIED', 'DISCOVERY_CALL', 'PROPOSAL', 'NEGOTIATION', 'WON', 'ONBOARDING', 'DELIVERY', 'UPSELL', 'REFERRAL', 'CASE_STUDY', 'LOST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "title" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "leadCode" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT,
    "channel" "Channel" NOT NULL,
    "segment" "Vertical",
    "stage" "PipelineStage" NOT NULL DEFAULT 'LEAD',
    "estValue" DOUBLE PRECISION,
    "ownerId" TEXT,
    "dateFirstContacted" TIMESTAMP(3),
    "lastContactDate" TIMESTAMP(3),
    "nextAction" TEXT,
    "nextActionDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_role_key" ON "UserRole"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_leadCode_key" ON "Lead"("leadCode");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistEntry_userId_date_itemKey_key" ON "ChecklistEntry"("userId", "date", "itemKey");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistEntry" ADD CONSTRAINT "ChecklistEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
