-- ============================================
-- 退货登记管理系统 - MySQL 数据库 Schema
-- ============================================

CREATE DATABASE IF NOT EXISTS `return_register` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `return_register`;

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL COMMENT 'PHP password_hash() 生成',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 退货记录表
CREATE TABLE IF NOT EXISTS `records` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NOT NULL,
    `tracking_no` VARCHAR(50) NOT NULL COMMENT '快递单号',
    `courier` VARCHAR(50) NOT NULL COMMENT '快递公司',
    `customer_name` VARCHAR(100) DEFAULT '' COMMENT '客户名称',
    `reason` VARCHAR(500) DEFAULT '' COMMENT '退货原因',
    `record_date` DATE NOT NULL COMMENT '登记日期',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_tracking_no` (`tracking_no`),
    INDEX `idx_courier` (`courier`),
    INDEX `idx_record_date` (`record_date`),
    UNIQUE KEY `uk_user_tracking` (`user_id`, `tracking_no`) COMMENT '同一用户下快递单号唯一'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='退货记录表';

-- 会话表（Token 方式）
CREATE TABLE IF NOT EXISTS `sessions` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NOT NULL,
    `token` VARCHAR(128) NOT NULL UNIQUE,
    `expires_at` DATETIME NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_token` (`token`),
    INDEX `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会话表';