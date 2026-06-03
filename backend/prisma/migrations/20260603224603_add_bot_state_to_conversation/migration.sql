-- AlterTable
ALTER TABLE `conversation` ADD COLUMN `botData` JSON NULL,
    ADD COLUMN `botStep` VARCHAR(191) NULL;
