-- Restaurant POS database bootstrap for MySQL 8.0+.
--
-- This script is intentionally safe to run against an existing database:
-- tables are created only when missing and seed rows are inserted only when
-- their fixed primary keys/unique values do not already exist.
--
-- Staff passwords use BCrypt. A BCrypt string contains its algorithm version,
-- cost, random salt, and derived hash, so no separate salt column is required.
-- The seeded accounts below use the password documented by the application:
-- password123. The admin1 value is copied from the existing local database.
-- Change these development credentials immediately in any shared or production
-- environment.

CREATE DATABASE IF NOT EXISTS `projectDB`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE `projectDB`;

CREATE TABLE IF NOT EXISTS `staff_user` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `active` BIT(1) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'CASHIER', 'KITCHEN', 'WAITER') NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `security_pin_hash` VARCHAR(255) DEFAULT NULL,
    `address` VARCHAR(255) DEFAULT NULL,
    `contact_number` VARCHAR(255) DEFAULT NULL,
    `email` VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_staff_user_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `restaurant_table` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `qr_token` VARCHAR(255) NOT NULL,
    `status` ENUM('AVAILABLE', 'OCCUPIED') NOT NULL,
    `table_number` VARCHAR(255) NOT NULL,
    `retired` BIT(1) DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_restaurant_table_qr_token` (`qr_token`),
    UNIQUE KEY `uk_restaurant_table_number` (`table_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `customer` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `created_at` DATETIME(6) NOT NULL,
    `phone_number` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_customer_phone_number` (`phone_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `menu_category` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `sort_order` INT NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `menu_item` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `is_available` BIT(1) NOT NULL,
    `description` VARCHAR(255) DEFAULT NULL,
    `name` VARCHAR(255) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `category_id` BIGINT NOT NULL,
    `image_url` VARCHAR(255) DEFAULT NULL,
    `allergens` VARCHAR(255) DEFAULT NULL,
    `dietary_type` ENUM('EGG', 'NON_VEG', 'VEG') DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_menu_item_category_id` (`category_id`),
    CONSTRAINT `fk_menu_item_category`
        FOREIGN KEY (`category_id`) REFERENCES `menu_category` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `customization_group` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `required` BIT(1) NOT NULL,
    `sort_order` INT NOT NULL,
    `type` ENUM('CHECKBOX', 'RADIO') NOT NULL,
    `menu_item_id` BIGINT NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_customization_group_menu_item_id` (`menu_item_id`),
    CONSTRAINT `fk_customization_group_menu_item`
        FOREIGN KEY (`menu_item_id`) REFERENCES `menu_item` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `customization_option` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `price_delta` DECIMAL(10, 2) NOT NULL,
    `sort_order` INT NOT NULL,
    `group_id` BIGINT NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_customization_option_group_id` (`group_id`),
    CONSTRAINT `fk_customization_option_group`
        FOREIGN KEY (`group_id`) REFERENCES `customization_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `table_session` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `closed_at` DATETIME(6) DEFAULT NULL,
    `opened_at` DATETIME(6) NOT NULL,
    `pin` VARCHAR(4) NOT NULL,
    `session_token` VARCHAR(255) NOT NULL,
    `status` ENUM('ACTIVE', 'CLOSED') NOT NULL,
    `created_by_customer_id` BIGINT DEFAULT NULL,
    `table_id` BIGINT NOT NULL,
    `note` VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_table_session_token` (`session_token`),
    KEY `idx_table_session_created_by_customer_id` (`created_by_customer_id`),
    KEY `idx_table_session_table_id` (`table_id`),
    CONSTRAINT `fk_table_session_customer`
        FOREIGN KEY (`created_by_customer_id`) REFERENCES `customer` (`id`),
    CONSTRAINT `fk_table_session_table`
        FOREIGN KEY (`table_id`) REFERENCES `restaurant_table` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `session_participant` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `joined_at` DATETIME(6) NOT NULL,
    `left_at` DATETIME(6) DEFAULT NULL,
    `customer_id` BIGINT NOT NULL,
    `table_session_id` BIGINT NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_session_participant_customer_id` (`customer_id`),
    KEY `idx_session_participant_table_session_id` (`table_session_id`),
    CONSTRAINT `fk_session_participant_customer`
        FOREIGN KEY (`customer_id`) REFERENCES `customer` (`id`),
    CONSTRAINT `fk_session_participant_table_session`
        FOREIGN KEY (`table_session_id`) REFERENCES `table_session` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `customer_order` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `confirmed_at` DATETIME(6) DEFAULT NULL,
    `placed_at` DATETIME(6) DEFAULT NULL,
    `status` ENUM(
        'BILL_REQUESTED', 'CANCELLED', 'CART', 'CONFIRMED', 'PAID',
        'PLACED', 'PREPARING', 'READY', 'SERVED'
    ) NOT NULL,
    `confirmed_by` BIGINT DEFAULT NULL,
    `table_session_id` BIGINT NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_customer_order_confirmed_by` (`confirmed_by`),
    KEY `idx_customer_order_table_session_id` (`table_session_id`),
    CONSTRAINT `fk_customer_order_confirmed_by`
        FOREIGN KEY (`confirmed_by`) REFERENCES `staff_user` (`id`),
    CONSTRAINT `fk_customer_order_table_session`
        FOREIGN KEY (`table_session_id`) REFERENCES `table_session` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `order_item` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `item_status` ENUM(
        'CANCELLED', 'CONFIRMED', 'PENDING', 'PREPARING', 'READY', 'SERVED'
    ) NOT NULL,
    `notes` VARCHAR(255) DEFAULT NULL,
    `quantity` INT NOT NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `menu_item_id` BIGINT NOT NULL,
    `order_id` BIGINT NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_order_item_menu_item_id` (`menu_item_id`),
    KEY `idx_order_item_order_id` (`order_id`),
    CONSTRAINT `fk_order_item_menu_item`
        FOREIGN KEY (`menu_item_id`) REFERENCES `menu_item` (`id`),
    CONSTRAINT `fk_order_item_order`
        FOREIGN KEY (`order_id`) REFERENCES `customer_order` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `order_item_selected_option` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `group_name` VARCHAR(255) NOT NULL,
    `option_name` VARCHAR(255) NOT NULL,
    `price_delta` DECIMAL(10, 2) NOT NULL,
    `order_item_id` BIGINT NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_order_item_selected_option_order_item_id` (`order_item_id`),
    CONSTRAINT `fk_order_item_selected_option_order_item`
        FOREIGN KEY (`order_item_id`) REFERENCES `order_item` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- order_id is intentionally not a foreign key because audit events outlive orders.
CREATE TABLE IF NOT EXISTS `order_status_event` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `changed_at` DATETIME(6) NOT NULL,
    `from_status` ENUM(
        'BILL_REQUESTED', 'CANCELLED', 'CART', 'CONFIRMED', 'PAID',
        'PLACED', 'PREPARING', 'READY', 'SERVED'
    ) DEFAULT NULL,
    `order_id` BIGINT NOT NULL,
    `to_status` ENUM(
        'BILL_REQUESTED', 'CANCELLED', 'CART', 'CONFIRMED', 'PAID',
        'PLACED', 'PREPARING', 'READY', 'SERVED'
    ) NOT NULL,
    `changed_by` BIGINT DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_order_status_event_changed_by` (`changed_by`),
    CONSTRAINT `fk_order_status_event_changed_by`
        FOREIGN KEY (`changed_by`) REFERENCES `staff_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `bill` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `discount` DECIMAL(10, 2) NOT NULL,
    `generated_at` DATETIME(6) NOT NULL,
    `paid_at` DATETIME(6) DEFAULT NULL,
    `payment_method` ENUM('CARD', 'CASH', 'OTHER', 'UPI') DEFAULT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `tax` DECIMAL(10, 2) NOT NULL,
    `total` DECIMAL(10, 2) NOT NULL,
    `closed_by` BIGINT DEFAULT NULL,
    `table_session_id` BIGINT NOT NULL,
    `tip` DECIMAL(10, 2) DEFAULT NULL,
    `void_reason` VARCHAR(255) DEFAULT NULL,
    `voided_at` DATETIME(6) DEFAULT NULL,
    `voided_by` BIGINT DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_bill_closed_by` (`closed_by`),
    KEY `idx_bill_table_session_id` (`table_session_id`),
    KEY `idx_bill_voided_by` (`voided_by`),
    CONSTRAINT `fk_bill_closed_by`
        FOREIGN KEY (`closed_by`) REFERENCES `staff_user` (`id`),
    CONSTRAINT `fk_bill_table_session`
        FOREIGN KEY (`table_session_id`) REFERENCES `table_session` (`id`),
    CONSTRAINT `fk_bill_voided_by`
        FOREIGN KEY (`voided_by`) REFERENCES `staff_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `bill_line_item` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `line_total` DECIMAL(10, 2) NOT NULL,
    `menu_item_name` VARCHAR(255) NOT NULL,
    `quantity` INT NOT NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `bill_id` BIGINT NOT NULL,
    `customization_summary` VARCHAR(255) DEFAULT NULL,
    `dietary_type` ENUM('EGG', 'NON_VEG', 'VEG') DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_bill_line_item_bill_id` (`bill_id`),
    CONSTRAINT `fk_bill_line_item_bill`
        FOREIGN KEY (`bill_id`) REFERENCES `bill` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `bill_line_item_option` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `option_name` VARCHAR(255) NOT NULL,
    `price_delta` DECIMAL(10, 2) NOT NULL,
    `bill_line_item_id` BIGINT NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_bill_line_item_option_bill_line_item_id` (`bill_line_item_id`),
    CONSTRAINT `fk_bill_line_item_option_bill_line_item`
        FOREIGN KEY (`bill_line_item_id`) REFERENCES `bill_line_item` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `bill_payment` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `amount` DECIMAL(10, 2) NOT NULL,
    `payment_method` ENUM('CARD', 'CASH', 'OTHER', 'UPI') NOT NULL,
    `recorded_at` DATETIME(6) NOT NULL,
    `bill_id` BIGINT NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_bill_payment_bill_id` (`bill_id`),
    CONSTRAINT `fk_bill_payment_bill`
        FOREIGN KEY (`bill_id`) REFERENCES `bill` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `revoked_customer_token` (
    `jti` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(6) NOT NULL,
    `revoked_at` DATETIME(6) NOT NULL,
    PRIMARY KEY (`jti`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- bill_id and session_id are immutable snapshots, not live foreign keys.
CREATE TABLE IF NOT EXISTS `tip_pool_entry` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `amount` DECIMAL(10, 2) NOT NULL,
    `bill_id` BIGINT NOT NULL,
    `recorded_at` DATETIME(6) NOT NULL,
    `session_id` BIGINT NOT NULL,
    `table_number` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Fixed IDs mirror DataSeeder and make relationships deterministic.
INSERT IGNORE INTO `menu_category` (`id`, `name`, `sort_order`) VALUES
    (1, 'Starters', 1),
    (2, 'Main Course', 2),
    (3, 'Beverages', 3);

INSERT IGNORE INTO `menu_item` (
    `id`, `category_id`, `name`, `description`, `price`, `image_url`,
    `is_available`, `dietary_type`, `allergens`
) VALUES
    (1, 1, 'Paneer Tikka', 'Grilled cottage cheese skewers', 220.00,
     'https://res.cloudinary.com/djw1i7vnc/image/upload/v1783418185/paneer_azoymi.jpg', b'1', NULL, NULL),
    (2, 1, 'Veg Spring Rolls', 'Crispy vegetable rolls', 180.00,
     'https://res.cloudinary.com/djw1i7vnc/image/upload/v1783418186/chole_thfufw.jpg', b'1', NULL, NULL),
    (3, 2, 'Butter Chicken', 'Creamy tomato chicken curry', 340.00,
     'https://res.cloudinary.com/djw1i7vnc/image/upload/v1783418186/biryani_bna4mp.jpg', b'1', NULL, NULL),
    (4, 2, 'Dal Makhani', 'Slow-cooked black lentils', 260.00,
     'https://res.cloudinary.com/djw1i7vnc/image/upload/v1783418185/kofta_xv19ou.jpg', b'1', NULL, NULL),
    (5, 3, 'Masala Chai', 'Spiced Indian tea', 60.00,
     'https://res.cloudinary.com/djw1i7vnc/image/upload/v1783418185/dhosa_j1jaf4.jpg', b'1', NULL, NULL),
    (6, 3, 'Fresh Lime Soda', 'Sweet or salted', 80.00,
     'https://res.cloudinary.com/djw1i7vnc/image/upload/v1783418185/fullplate_huhfwx.jpg', b'1', NULL, NULL);

INSERT IGNORE INTO `restaurant_table` (
    `id`, `table_number`, `qr_token`, `status`, `retired`
) VALUES
    (1, 'T1', UUID(), 'AVAILABLE', b'0'),
    (2, 'T2', UUID(), 'AVAILABLE', b'0'),
    (3, 'T3', UUID(), 'AVAILABLE', b'0'),
    (4, 'T4', UUID(), 'AVAILABLE', b'0'),
    (5, 'T5', UUID(), 'AVAILABLE', b'0');

INSERT IGNORE INTO `staff_user` (
    `id`, `name`, `username`, `password_hash`, `role`, `active`,
    `security_pin_hash`, `email`, `contact_number`, `address`
) VALUES
    (1, 'Waiter One', 'waiter1',
     '$2a$10$PLNlUYRo71Lo15bx8IEuLu1PIeiCrr/T7uV0cniPXxCbLPtFMW0kW',
     'WAITER', b'1', NULL, 'waiter1@restropos.example', '9800000001', '12 Staff Quarters, City'),
    (2, 'Kitchen One', 'kitchen1',
     '$2a$10$jxOtPmwdmqCDwk93Z1L.5ujzeqMdUqiGMjuSwcavjuv6y9O/R3G3S',
     'KITCHEN', b'1', NULL, 'kitchen1@restropos.example', '9800000002', '14 Staff Quarters, City'),
    (3, 'Cashier One', 'cashier1',
     '$2a$10$RvEelIj/6VsDtGAiU5RtTuhpenwd/Mwyi1/tMhrEsiKmOr7NeFPp.',
     'CASHIER', b'1', NULL, 'cashier1@restropos.example', '9800000003', '16 Staff Quarters, City'),
    (4, 'Admin One', 'admin1',
     '$2a$10$kAG6vC3FYg1O1ejR8GDWMuT1ny3T/rV4ZNj0fw.blbbG1R79PEZyu',
     'ADMIN', b'1', NULL, 'admin1@restropos.example', '9800000004', '1 Manager''s House, City');
