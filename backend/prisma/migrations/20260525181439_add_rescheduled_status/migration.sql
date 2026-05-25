-- AlterTable
ALTER TABLE `appointment` MODIFY `status` ENUM('confirmed', 'pending', 'checkin', 'blocked', 'external', 'paid', 'cancelled', 'rescheduled') NOT NULL DEFAULT 'pending';
