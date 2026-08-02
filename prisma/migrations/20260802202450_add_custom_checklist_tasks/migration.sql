-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'CHECKLIST_TASK_ASSIGNED';

-- CreateTable
CREATE TABLE "CustomChecklistTask" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "assignedById" TEXT,
    "assignedByName" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomChecklistTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomChecklistTask_assigneeId_date_idx" ON "CustomChecklistTask"("assigneeId", "date");

-- AddForeignKey
ALTER TABLE "CustomChecklistTask" ADD CONSTRAINT "CustomChecklistTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomChecklistTask" ADD CONSTRAINT "CustomChecklistTask_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
