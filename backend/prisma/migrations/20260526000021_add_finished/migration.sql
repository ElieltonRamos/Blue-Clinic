-- AlterTable
ALTER TABLE `appointment` MODIFY `status` ENUM('confirmed', 'pending', 'checkin', 'blocked', 'external', 'paid', 'cancelled', 'rescheduled', 'finished') NOT NULL DEFAULT 'pending';
