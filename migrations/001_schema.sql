-- ============== MySQL 8.0 DDL for ReelPilot ==============

CREATE DATABASE IF NOT EXISTS `reelpilot`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `reelpilot`;

-- Users
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Facebook Pages
CREATE TABLE IF NOT EXISTS `facebook_pages` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `fb_page_id` VARCHAR(100) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `avatar_url` VARCHAR(1024) DEFAULT NULL,
  `access_token_enc` TEXT NOT NULL,
  `permissions` JSON DEFAULT NULL,
  `token_expires_at` DATETIME DEFAULT NULL,
  `connected_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_fb_pages_user_fbid` (`user_id`, `fb_page_id`),
  CONSTRAINT `fk_fb_pages_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reels
CREATE TABLE IF NOT EXISTS `reels` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `page_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `caption` TEXT DEFAULT NULL,
  `hashtags` JSON DEFAULT NULL,
  `video_source` ENUM('url','upload') NOT NULL,
  `video_url` VARCHAR(2048) DEFAULT NULL,
  `video_file_path` VARCHAR(1024) DEFAULT NULL,
  `thumbnail_url` VARCHAR(1024) DEFAULT NULL,
  `status` ENUM('draft','scheduled','uploading','publishing','published','failed') NOT NULL DEFAULT 'draft',
  `scheduled_at` DATETIME DEFAULT NULL,
  `published_at` DATETIME DEFAULT NULL,
  `facebook_post_id` VARCHAR(255) DEFAULT NULL,
  `error_message` TEXT DEFAULT NULL,
  `retry_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_reels_user_id` (`user_id`),
  KEY `ix_reels_page_id` (`page_id`),
  KEY `ix_reels_status_scheduled` (`status`, `scheduled_at`),
  KEY `ix_reels_user_status` (`user_id`, `status`),
  CONSTRAINT `fk_reels_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reels_page` FOREIGN KEY (`page_id`) REFERENCES `facebook_pages`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Publish Logs
CREATE TABLE IF NOT EXISTS `publish_logs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reel_id` INT UNSIGNED NOT NULL,
  `attempt` INT UNSIGNED NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `response_code` INT DEFAULT NULL,
  `error` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_logs_reel_id` (`reel_id`),
  CONSTRAINT `fk_logs_reel` FOREIGN KEY (`reel_id`) REFERENCES `reels`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
