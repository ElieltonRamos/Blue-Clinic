/*
  Warnings:

  - Added the required column `price` to the `appointment_type_commission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `appointment_type_commission` ADD COLUMN `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00;
