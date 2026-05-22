-- AlterTable
ALTER TABLE `appointment` ADD COLUMN `appointmentTypeId` INTEGER NULL,
    ADD COLUMN `feeOverride` DECIMAL(10, 2) NULL;

-- CreateTable
CREATE TABLE `doctor_schedule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `doctorId` INTEGER NOT NULL,
    `dayOfWeek` INTEGER NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `doctor_schedule_doctorId_dayOfWeek_key`(`doctorId`, `dayOfWeek`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointment_type` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `duration` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointment_type_commission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `doctorId` INTEGER NOT NULL,
    `appointmentTypeId` INTEGER NOT NULL,
    `doctorRateType` ENUM('percentage', 'fixed') NOT NULL,
    `doctorRate` DECIMAL(10, 2) NOT NULL,
    `clinicRateType` ENUM('percentage', 'fixed') NOT NULL,
    `clinicRate` DECIMAL(10, 2) NOT NULL,

    UNIQUE INDEX `appointment_type_commission_doctorId_appointmentTypeId_key`(`doctorId`, `appointmentTypeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `doctor_schedule` ADD CONSTRAINT `doctor_schedule_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `doctor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointment_type` ADD CONSTRAINT `appointment_type_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointment_type_commission` ADD CONSTRAINT `appointment_type_commission_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `doctor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointment_type_commission` ADD CONSTRAINT `appointment_type_commission_appointmentTypeId_fkey` FOREIGN KEY (`appointmentTypeId`) REFERENCES `appointment_type`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointment` ADD CONSTRAINT `appointment_appointmentTypeId_fkey` FOREIGN KEY (`appointmentTypeId`) REFERENCES `appointment_type`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
