-- ============================================================
-- Fixly — MySQL Relational Database Schema & Initial Seeds
-- Suitable for phpMyAdmin SQL import and automatic backend boot
-- ============================================================

CREATE DATABASE IF NOT EXISTS `fixly` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `fixly`;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL DEFAULT 'Fixly User',
  `role` ENUM('ADMIN', 'OPERATOR', 'READ_ONLY') NOT NULL DEFAULT 'OPERATOR',
  `api_token` VARCHAR(255),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. MONITORED SERVERS TABLE
CREATE TABLE IF NOT EXISTS `monitored_servers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `host` VARCHAR(255) NOT NULL,
  `port` INT NOT NULL DEFAULT 22,
  `ssh_user` VARCHAR(100) NOT NULL DEFAULT 'ubuntu',
  `ssh_key_path` VARCHAR(255),
  `log_file_path` VARCHAR(255) DEFAULT '/var/log/app.log',
  `status` ENUM('CONNECTED', 'DISCONNECTED', 'ERROR') NOT NULL DEFAULT 'DISCONNECTED',
  `last_ping_at` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. INCIDENTS TABLE (Stores AI Diagnosis & Fix Proposals in MySQL JSON columns)
CREATE TABLE IF NOT EXISTS `incidents` (
  `id` VARCHAR(64) PRIMARY KEY,
  `fingerprint` VARCHAR(64) NOT NULL UNIQUE,
  `title` VARCHAR(255) NOT NULL,
  `error_type` VARCHAR(100) NOT NULL,
  `normalized_message` TEXT,
  `raw_stack_trace` TEXT,
  `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'IGNORED') NOT NULL DEFAULT 'OPEN',
  `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  `occurrence_count` INT NOT NULL DEFAULT 1,
  `target_file` VARCHAR(255),
  `first_seen_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `last_seen_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` DATETIME NULL,
  `resolved_by_type` ENUM('AI', 'HUMAN') NULL,
  `resolved_by_user_id` INT NULL,
  `resolution_notes` TEXT NULL,
  `ai_diagnosis` JSON NULL,
  `code_fix_proposal` JSON NULL,
  FOREIGN KEY (`resolved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. INCIDENT OCCURRENCES TABLE
CREATE TABLE IF NOT EXISTS `incident_occurrences` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `incident_id` VARCHAR(64) NOT NULL,
  `server_id` INT NULL,
  `raw_log_line` TEXT NOT NULL,
  `server_vitals_snapshot` JSON NULL,
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`server_id`) REFERENCES `monitored_servers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. SERVER VITALS TABLE
CREATE TABLE IF NOT EXISTS `server_vitals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `server_id` INT NULL,
  `cpu_usage_percent` DECIMAL(5,2) NOT NULL,
  `memory_usage_percent` DECIMAL(5,2) NOT NULL,
  `disk_usage_percent` DECIMAL(5,2) NOT NULL,
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`server_id`) REFERENCES `monitored_servers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. APP SETTINGS TABLE
CREATE TABLE IF NOT EXISTS `app_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `value_encrypted` TEXT,
  `masked_value` VARCHAR(255),
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `action` VARCHAR(100) NOT NULL,
  `details` JSON NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEED DEFAULT DATA
-- ============================================================

-- Seed Default Admin User (Password: admin123)
INSERT IGNORE INTO `users` (`id`, `email`, `password_hash`, `full_name`, `role`, `api_token`) VALUES
(1, 'alex.mercer@fixly.local', '$2a$10$wE96MvO76Gk0W9e4WkL29u5c84d.pGjLgB1Y9Qz1O4J5K6L7M8N9O', 'Alex Mercer', 'ADMIN', 'fixly_pat_9981273981273918237');

-- Seed Default Monitored Target Server
INSERT IGNORE INTO `monitored_servers` (`id`, `name`, `host`, `port`, `ssh_user`, `status`) VALUES
(1, 'prod-api-01', '192.168.1.42', 22, 'ubuntu', 'CONNECTED');

-- Seed Default App Settings
INSERT IGNORE INTO `app_settings` (`setting_key`, `value_encrypted`, `masked_value`) VALUES
('GIT_ACCESS_TOKEN', 'ghp_encrypted_default_token', 'ghp_****1234'),
('TARGET_GIT_REPO', 'https://github.com/organization/target-service.git', 'https://github.com/organization/target-service.git'),
('AI_PROVIDER', 'GROQ', 'Groq Llama 3.3 (llama-3.3-70b-versatile)');
