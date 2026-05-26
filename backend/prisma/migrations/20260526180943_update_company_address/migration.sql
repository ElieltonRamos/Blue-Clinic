/*
  Warnings:

  - You are about to drop the column `address` on the `company` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `company` table. All the data in the column will be lost.
  - Added the required column `corporateName` to the `company` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tradeName` to the `company` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `company` DROP COLUMN `address`,
    DROP COLUMN `name`,
    ADD COLUMN `city` VARCHAR(191) NULL,
    ADD COLUMN `cityCode` VARCHAR(191) NULL,
    ADD COLUMN `complement` VARCHAR(191) NULL,
    ADD COLUMN `corporateName` VARCHAR(191) NOT NULL,
    ADD COLUMN `neighborhood` VARCHAR(191) NULL,
    ADD COLUMN `number` VARCHAR(191) NULL,
    ADD COLUMN `state` VARCHAR(191) NULL,
    ADD COLUMN `street` VARCHAR(191) NULL,
    ADD COLUMN `tradeName` VARCHAR(191) NOT NULL;
