/*
Warnings:

- Added the required column `companyId` to the `appointment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `appointment` ADD COLUMN `companyId` INTEGER NULL;

-- Backfill
UPDATE `appointment` a
LEFT JOIN `doctor` d ON d.id = a.doctorId
LEFT JOIN `patient` p ON p.id = a.patientId
SET
    a.companyId = COALESCE(d.companyId, p.companyId);

-- Make required
ALTER TABLE `appointment` MODIFY COLUMN `companyId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `appointment`
ADD CONSTRAINT `appointment_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `company` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;