-- Checklist entries belong to the member and must not block account removal.
ALTER TABLE "ChecklistEntry" DROP CONSTRAINT "ChecklistEntry_userId_fkey";
ALTER TABLE "ChecklistEntry" ADD CONSTRAINT "ChecklistEntry_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
