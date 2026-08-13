-- DropForeignKey
ALTER TABLE `appointment` DROP FOREIGN KEY `appointment_doctorId_fkey`;

-- DropForeignKey
ALTER TABLE `appointment` DROP FOREIGN KEY `appointment_patientId_fkey`;

-- DropForeignKey
ALTER TABLE `appointment_type_commission` DROP FOREIGN KEY `appointment_type_commission_appointmentTypeId_fkey`;

-- DropForeignKey
ALTER TABLE `appointment_type_commission` DROP FOREIGN KEY `appointment_type_commission_doctorId_fkey`;

-- DropForeignKey
ALTER TABLE `consultation` DROP FOREIGN KEY `consultation_appointmentId_fkey`;

-- DropForeignKey
ALTER TABLE `doctor_schedule` DROP FOREIGN KEY `doctor_schedule_doctorId_fkey`;

-- DropForeignKey
ALTER TABLE `expense` DROP FOREIGN KEY `expense_registeredById_fkey`;

-- DropForeignKey
ALTER TABLE `payment` DROP FOREIGN KEY `payment_appointmentId_fkey`;

-- DropForeignKey
ALTER TABLE `payment` DROP FOREIGN KEY `payment_registeredById_fkey`;

-- DropIndex
DROP INDEX `appointment_doctorId_fkey` ON `appointment`;

-- DropIndex
DROP INDEX `appointment_patientId_fkey` ON `appointment`;

-- DropIndex
DROP INDEX `appointment_type_commission_appointmentTypeId_fkey` ON `appointment_type_commission`;

-- DropIndex
DROP INDEX `expense_registeredById_fkey` ON `expense`;

-- DropIndex
DROP INDEX `payment_appointmentId_fkey` ON `payment`;

-- DropIndex
DROP INDEX `payment_registeredById_fkey` ON `payment`;

-- AlterTable
ALTER TABLE `appointment` ADD COLUMN `doctorName` VARCHAR(191) NULL,
    ADD COLUMN `patientName` VARCHAR(191) NULL,
    MODIFY `doctorId` INTEGER NULL,
    MODIFY `patientId` INTEGER NULL;

-- AlterTable
ALTER TABLE `expense` ADD COLUMN `registeredByName` VARCHAR(191) NULL,
    MODIFY `registeredById` INTEGER NULL;

-- AlterTable
ALTER TABLE `payment` ADD COLUMN `registeredByName` VARCHAR(191) NULL,
    MODIFY `registeredById` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `doctor_schedule` ADD CONSTRAINT `doctor_schedule_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `doctor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointment_type_commission` ADD CONSTRAINT `appointment_type_commission_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `doctor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointment_type_commission` ADD CONSTRAINT `appointment_type_commission_appointmentTypeId_fkey` FOREIGN KEY (`appointmentTypeId`) REFERENCES `appointment_type`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointment` ADD CONSTRAINT `appointment_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `doctor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointment` ADD CONSTRAINT `appointment_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consultation` ADD CONSTRAINT `consultation_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `appointment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment` ADD CONSTRAINT `payment_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `appointment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment` ADD CONSTRAINT `payment_registeredById_fkey` FOREIGN KEY (`registeredById`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expense` ADD CONSTRAINT `expense_registeredById_fkey` FOREIGN KEY (`registeredById`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
