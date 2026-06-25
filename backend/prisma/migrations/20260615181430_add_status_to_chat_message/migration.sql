-- AlterTable
ALTER TABLE `chat_message` ADD COLUMN `status` ENUM('sent', 'delivered', 'read', 'failed') NULL DEFAULT 'sent';
