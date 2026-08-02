-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'PROJECT_ASSIGNED';
ALTER TYPE "ActivityAction" ADD VALUE 'PROJECT_CHECKED_IN';
ALTER TYPE "ActivityAction" ADD VALUE 'PROJECT_COMPLETED';
ALTER TYPE "ActivityAction" ADD VALUE 'PROJECT_DELETED';

-- CreateTable
CREATE TABLE "ChecklistProject" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "assignedById" TEXT,
    "assignedByName" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistProjectCheckIn" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistProjectCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistProject_assigneeId_idx" ON "ChecklistProject"("assigneeId");

-- CreateIndex
CREATE INDEX "ChecklistProject_dueDate_idx" ON "ChecklistProject"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistProjectCheckIn_projectId_date_key" ON "ChecklistProjectCheckIn"("projectId", "date");

-- AddForeignKey
ALTER TABLE "ChecklistProject" ADD CONSTRAINT "ChecklistProject_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistProject" ADD CONSTRAINT "ChecklistProject_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistProjectCheckIn" ADD CONSTRAINT "ChecklistProjectCheckIn_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ChecklistProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
