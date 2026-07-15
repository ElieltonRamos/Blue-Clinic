-- AlterTable
ALTER TABLE `whatsapp_config` ADD COLUMN `baileysQr` TEXT NULL,
    ADD COLUMN `baileysStatus` VARCHAR(191) NULL,
    ADD COLUMN `provider` ENUM('official', 'baileys') NOT NULL DEFAULT 'official';
