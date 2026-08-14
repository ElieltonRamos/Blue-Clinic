-- CreateIndex
CREATE INDEX `conversation_companyId_phone_idx` ON `conversation`(`companyId`, `phone`);

-- CreateIndex
CREATE INDEX `patient_companyId_phone_idx` ON `patient`(`companyId`, `phone`);
