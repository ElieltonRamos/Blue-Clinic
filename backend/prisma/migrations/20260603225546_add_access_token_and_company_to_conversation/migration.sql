/*
  Warnings:

  - You are about to drop the column `apiToken` on the `whatsapp_config` table. All the data in the column will be lost.
  - Added the required column `companyId` to the `conversation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `conversation` ADD COLUMN `companyId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `whatsapp_config` DROP COLUMN `apiToken`,
    ADD COLUMN `accessToken` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `conversation` ADD CONSTRAINT `conversation_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
