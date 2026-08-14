/*
  Warnings:

  - Added the required column `target` to the `reminder_rule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `reminder_rule` ADD COLUMN `target` VARCHAR(191) NOT NULL;
