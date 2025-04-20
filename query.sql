ALTER TABLE `users` 
ADD COLUMN `telegram` TINYINT NOT NULL DEFAULT 0 AFTER `notes`,
ADD COLUMN `telegram_chat_id` VARCHAR(45) NULL AFTER `telegram`;