/*
  Warnings:

  - A unique constraint covering the columns `[wamid]` on the table `chat_message` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `chat_message` ADD COLUMN `wamid` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `chat_message_wamid_key` ON `chat_message`(`wamid`);
