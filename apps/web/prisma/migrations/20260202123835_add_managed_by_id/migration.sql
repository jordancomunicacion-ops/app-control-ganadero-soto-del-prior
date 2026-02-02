-- AlterTable
ALTER TABLE "User" ADD COLUMN     "managedById" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managedById_fkey" FOREIGN KEY ("managedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
