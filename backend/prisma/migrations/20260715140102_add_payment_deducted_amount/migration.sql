-- AlterTable
ALTER TABLE `payment` ADD COLUMN `deductedAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0;
