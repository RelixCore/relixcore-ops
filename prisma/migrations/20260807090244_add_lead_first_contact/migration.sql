-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "firstContactId" TEXT;

-- Backfill: for existing leads we don't know who actually made first
-- contact, so default it to the current owner. Editable per-lead from here.
UPDATE "Lead" SET "firstContactId" = "ownerId" WHERE "ownerId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_firstContactId_fkey" FOREIGN KEY ("firstContactId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
