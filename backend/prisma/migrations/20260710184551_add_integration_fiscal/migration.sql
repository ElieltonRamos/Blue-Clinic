-- AlterTable
ALTER TABLE `appointment_type_commission` ADD COLUMN `nfDeductionType` ENUM('percentage', 'fixed') NULL,
    ADD COLUMN `nfDeductionValue` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `payment` ADD COLUMN `invoiceIssued` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `invoicePdfUrl` VARCHAR(191) NULL,
    ADD COLUMN `invoiceXmlUrl` VARCHAR(191) NULL;
