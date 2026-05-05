-- AlterTable
ALTER TABLE "Project" ADD COLUMN "description" TEXT;
ALTER TABLE "Project" ADD COLUMN "budgetDetails" JSONB;
ALTER TABLE "Project" ADD COLUMN "attachmentPath" TEXT;

-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN "projectId" TEXT;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
