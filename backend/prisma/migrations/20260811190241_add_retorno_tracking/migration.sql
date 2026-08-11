-- AlterTable
ALTER TABLE `appointment` ADD COLUMN `originAppointmentId` INTEGER NULL;

-- AlterTable
ALTER TABLE `appointment_type` ADD COLUMN `isRetorno` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `appointment_type_commission` ADD COLUMN `generatesRetorno` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `retornoValidityDays` INTEGER NULL DEFAULT 30;

-- AddForeignKey
ALTER TABLE `appointment` ADD CONSTRAINT `appointment_originAppointmentId_fkey` FOREIGN KEY (`originAppointmentId`) REFERENCES `appointment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
