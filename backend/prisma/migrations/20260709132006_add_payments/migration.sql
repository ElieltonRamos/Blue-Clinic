-- AlterTable
ALTER TABLE `payment` ADD COLUMN `commissionPaid` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `commissionPaidAt` DATETIME(3) NULL,
    ADD COLUMN `commissionPaidById` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `payment` ADD CONSTRAINT `payment_commissionPaidById_fkey` FOREIGN KEY (`commissionPaidById`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
