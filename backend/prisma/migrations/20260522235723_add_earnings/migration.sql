-- AlterTable
ALTER TABLE `payment` ADD COLUMN `clinicEarnings` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `doctorEarnings` DECIMAL(10, 2) NOT NULL DEFAULT 0;
