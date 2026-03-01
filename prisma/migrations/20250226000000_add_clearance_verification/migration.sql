-- CreateTable
CREATE TABLE `ClearanceVerification` (
    `id` VARCHAR(64) NOT NULL,
    `token` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) NOT NULL,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `created_at` BIGINT NOT NULL,

    UNIQUE INDEX `ClearanceVerification_token_key`(`token`),
    INDEX `ClearanceVerification_token_idx`(`token`),
    INDEX `ClearanceVerification_user_id_year_month_idx`(`user_id`, `year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
