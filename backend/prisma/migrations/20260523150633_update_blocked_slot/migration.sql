/*
  Warnings:

  - You are about to drop the column `date` on the `blocked_slot` table. All the data in the column will be lost.
  - Added the required column `startDate` to the `blocked_slot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `blocked_slot` DROP COLUMN `date`,
    ADD COLUMN `endDate` DATETIME(3) NULL,
    ADD COLUMN `startDate` DATETIME(3) NOT NULL;
