-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `state_code` VARCHAR(64) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` VARCHAR(32) NOT NULL,
    `cds_group_id` VARCHAR(64) NULL,
    `created_at` BIGINT NOT NULL,
    `updated_at` BIGINT NOT NULL,
    `is_blocked` BOOLEAN NULL DEFAULT false,
    `blocked_at` BIGINT NULL,
    `blocked_reason` VARCHAR(512) NULL,
    `allowed_device_fingerprint` VARCHAR(255) NULL,

    INDEX `User_email_idx`(`email`),
    INDEX `User_state_code_idx`(`state_code`),
    INDEX `User_role_idx`(`role`),
    INDEX `User_cds_group_id_idx`(`cds_group_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CdsGroup` (
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `meeting_days` JSON NOT NULL,
    `meeting_time` VARCHAR(16) NOT NULL,
    `meeting_duration` INTEGER NOT NULL,
    `venue_name` VARCHAR(255) NOT NULL,
    `admin_ids` JSON NOT NULL,
    `created_at` BIGINT NOT NULL,
    `updated_at` BIGINT NOT NULL,

    INDEX `CdsGroup_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminGroupAssignment` (
    `id` VARCHAR(64) NOT NULL,
    `admin_id` VARCHAR(64) NOT NULL,
    `cds_group_id` VARCHAR(64) NOT NULL,
    `created_at` BIGINT NOT NULL,

    INDEX `AdminGroupAssignment_admin_id_idx`(`admin_id`),
    INDEX `AdminGroupAssignment_cds_group_id_idx`(`cds_group_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Meeting` (
    `id` VARCHAR(64) NOT NULL,
    `meeting_date` VARCHAR(16) NOT NULL,
    `cds_group_ids` JSON NULL,
    `cds_group_id` VARCHAR(64) NULL,
    `session_id` VARCHAR(64) NULL,
    `is_active` BOOLEAN NOT NULL,
    `activated_by_admin_id` VARCHAR(64) NULL,
    `activated_at` BIGINT NULL,
    `deactivated_at` BIGINT NULL,
    `session_secret` VARCHAR(128) NULL,
    `rotation_interval_sec` INTEGER NULL,
    `token_algorithm` VARCHAR(64) NULL,

    INDEX `Meeting_meeting_date_idx`(`meeting_date`),
    INDEX `Meeting_cds_group_id_meeting_date_idx`(`cds_group_id`, `meeting_date`),
    INDEX `Meeting_is_active_idx`(`is_active`),
    INDEX `Meeting_session_id_idx`(`session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QrToken` (
    `id` VARCHAR(64) NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `meeting_date` VARCHAR(16) NOT NULL,
    `meeting_id` VARCHAR(64) NULL,
    `cds_group_id` VARCHAR(64) NULL,
    `generated_by_admin_id` VARCHAR(64) NOT NULL,
    `generated_at` BIGINT NOT NULL,
    `expires_at` BIGINT NOT NULL,
    `rotation_sequence` INTEGER NOT NULL,
    `is_consumed` BOOLEAN NOT NULL,

    INDEX `QrToken_token_idx`(`token`),
    INDEX `QrToken_meeting_date_idx`(`meeting_date`),
    INDEX `QrToken_meeting_id_idx`(`meeting_id`),
    INDEX `QrToken_cds_group_id_meeting_date_idx`(`cds_group_id`, `meeting_date`),
    INDEX `QrToken_meeting_id_rotation_sequence_idx`(`meeting_id`, `rotation_sequence`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attendance` (
    `id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) NOT NULL,
    `cds_group_id` VARCHAR(64) NOT NULL,
    `meeting_date` VARCHAR(16) NOT NULL,
    `scanned_at` BIGINT NOT NULL,
    `qr_token_id` VARCHAR(64) NOT NULL,
    `status` VARCHAR(16) NOT NULL,

    INDEX `Attendance_user_id_meeting_date_idx`(`user_id`, `meeting_date`),
    INDEX `Attendance_cds_group_id_meeting_date_idx`(`cds_group_id`, `meeting_date`),
    INDEX `Attendance_meeting_date_idx`(`meeting_date`),
    INDEX `Attendance_scanned_at_idx`(`scanned_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserCdsAssignmentHistory` (
    `id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) NOT NULL,
    `cds_group_id` VARCHAR(64) NOT NULL,
    `start_date` VARCHAR(16) NOT NULL,
    `end_date` VARCHAR(16) NULL,
    `changed_by_admin_id` VARCHAR(64) NOT NULL,
    `reason` VARCHAR(512) NULL,

    INDEX `UserCdsAssignmentHistory_user_id_idx`(`user_id`),
    INDEX `UserCdsAssignmentHistory_cds_group_id_idx`(`cds_group_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) NOT NULL,
    `session_token` VARCHAR(255) NOT NULL,
    `created_at` BIGINT NOT NULL,
    `last_active_at` BIGINT NOT NULL,
    `expires_at` BIGINT NOT NULL,
    `device_fingerprint` VARCHAR(255) NULL,

    UNIQUE INDEX `Session_session_token_key`(`session_token`),
    INDEX `Session_session_token_idx`(`session_token`),
    INDEX `Session_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(64) NOT NULL,
    `actor_user_id` VARCHAR(64) NOT NULL,
    `action` VARCHAR(255) NOT NULL,
    `details` TEXT NULL,
    `created_at` BIGINT NOT NULL,

    INDEX `AuditLog_actor_user_id_idx`(`actor_user_id`),
    INDEX `AuditLog_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentationLink` (
    `id` VARCHAR(64) NOT NULL,
    `token` VARCHAR(64) NOT NULL,
    `type` VARCHAR(32) NOT NULL,
    `status` VARCHAR(16) NOT NULL,
    `created_by_admin_id` VARCHAR(64) NOT NULL,
    `created_at` BIGINT NOT NULL,
    `uses_count` INTEGER NOT NULL,
    `deactivated_at` BIGINT NULL,

    INDEX `DocumentationLink_token_idx`(`token`),
    INDEX `DocumentationLink_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CorpMemberDoc` (
    `id` VARCHAR(64) NOT NULL,
    `link_id` VARCHAR(64) NOT NULL,
    `link_token` VARCHAR(64) NOT NULL,
    `created_at` BIGINT NOT NULL,
    `updated_at` BIGINT NOT NULL,
    `created_by_admin_id` VARCHAR(64) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL,
    `deleted_at` BIGINT NULL,
    `full_name` VARCHAR(255) NOT NULL,
    `state_code` VARCHAR(64) NOT NULL,
    `phone_number` VARCHAR(64) NOT NULL,
    `residential_address` TEXT NOT NULL,
    `next_of_kin` VARCHAR(255) NOT NULL,
    `next_of_kin_phone` VARCHAR(64) NOT NULL,
    `gender` VARCHAR(32) NOT NULL,
    `ppa` VARCHAR(255) NOT NULL,
    `course_of_study` VARCHAR(255) NOT NULL,
    `call_up_number` VARCHAR(64) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `nysc_account_number` VARCHAR(64) NOT NULL,
    `bank_name` VARCHAR(255) NOT NULL,
    `nin` VARCHAR(64) NOT NULL,
    `cds` VARCHAR(255) NULL,
    `medical_history` BOOLEAN NOT NULL,
    `medical_files` JSON NOT NULL,
    `personal_skill` VARCHAR(255) NULL,
    `saed_camp_skill` VARCHAR(255) NULL,
    `proposed_post_camp_saed_skill` VARCHAR(255) NULL,
    `selected_trainer_name` VARCHAR(255) NULL,
    `selected_trainer_business` VARCHAR(255) NULL,
    `selected_trainer_phone` VARCHAR(64) NULL,
    `selected_trainer_email` VARCHAR(255) NULL,

    INDEX `CorpMemberDoc_link_token_idx`(`link_token`),
    INDEX `CorpMemberDoc_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmployerDoc` (
    `id` VARCHAR(64) NOT NULL,
    `link_id` VARCHAR(64) NOT NULL,
    `link_token` VARCHAR(64) NOT NULL,
    `created_at` BIGINT NOT NULL,
    `updated_at` BIGINT NOT NULL,
    `created_by_admin_id` VARCHAR(64) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL,
    `deleted_at` BIGINT NULL,
    `organization_name` VARCHAR(255) NOT NULL,
    `organization_address` TEXT NOT NULL,
    `organization_phone` VARCHAR(64) NOT NULL,
    `contact_person_name` VARCHAR(255) NOT NULL,
    `contact_person_phone` VARCHAR(64) NOT NULL,
    `cms_required_per_year` INTEGER NOT NULL,
    `accommodation` BOOLEAN NOT NULL,
    `accommodation_type` VARCHAR(64) NULL,
    `monthly_stipend` INTEGER NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `nearest_landmark` VARCHAR(255) NOT NULL,

    INDEX `EmployerDoc_link_token_idx`(`link_token`),
    INDEX `EmployerDoc_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RejectedRepostingDoc` (
    `id` VARCHAR(64) NOT NULL,
    `link_id` VARCHAR(64) NOT NULL,
    `link_token` VARCHAR(64) NOT NULL,
    `created_at` BIGINT NOT NULL,
    `updated_at` BIGINT NOT NULL,
    `created_by_admin_id` VARCHAR(64) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL,
    `deleted_at` BIGINT NULL,
    `name` VARCHAR(255) NOT NULL,
    `state_code` VARCHAR(64) NOT NULL,
    `sex` VARCHAR(32) NOT NULL,
    `discipline` VARCHAR(255) NOT NULL,
    `previous_ppa` VARCHAR(255) NOT NULL,
    `new_ppa` VARCHAR(255) NULL,
    `recommendation` TEXT NULL,

    INDEX `RejectedRepostingDoc_link_token_idx`(`link_token`),
    INDEX `RejectedRepostingDoc_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CorpMemberRequest` (
    `id` VARCHAR(64) NOT NULL,
    `link_id` VARCHAR(64) NOT NULL,
    `link_token` VARCHAR(64) NOT NULL,
    `created_at` BIGINT NOT NULL,
    `updated_at` BIGINT NOT NULL,
    `created_by_admin_id` VARCHAR(64) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL,
    `deleted_at` BIGINT NULL,
    `ppa_name` VARCHAR(255) NOT NULL,
    `ppa_address` TEXT NOT NULL,
    `ppa_phone_number` VARCHAR(64) NOT NULL,
    `number_of_corp_members_requested` INTEGER NOT NULL,
    `discipline_needed` VARCHAR(255) NOT NULL,
    `gender_needed` VARCHAR(32) NOT NULL,
    `monthly_stipend` INTEGER NOT NULL,
    `available_accommodation` BOOLEAN NOT NULL,

    INDEX `CorpMemberRequest_link_token_idx`(`link_token`),
    INDEX `CorpMemberRequest_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Setting` (
    `id` VARCHAR(64) NOT NULL,
    `key` VARCHAR(64) NOT NULL,
    `value` TEXT NOT NULL,
    `updated_by` VARCHAR(64) NOT NULL,
    `updated_at` BIGINT NOT NULL,

    INDEX `Setting_key_idx`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordResetToken` (
    `id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `created_at` BIGINT NOT NULL,
    `expires_at` BIGINT NOT NULL,
    `used_at` BIGINT NULL,

    INDEX `PasswordResetToken_token_idx`(`token`),
    INDEX `PasswordResetToken_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_cds_group_id_fkey` FOREIGN KEY (`cds_group_id`) REFERENCES `CdsGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdminGroupAssignment` ADD CONSTRAINT `AdminGroupAssignment_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdminGroupAssignment` ADD CONSTRAINT `AdminGroupAssignment_cds_group_id_fkey` FOREIGN KEY (`cds_group_id`) REFERENCES `CdsGroup`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Meeting` ADD CONSTRAINT `Meeting_cds_group_id_fkey` FOREIGN KEY (`cds_group_id`) REFERENCES `CdsGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Meeting` ADD CONSTRAINT `Meeting_activated_by_admin_id_fkey` FOREIGN KEY (`activated_by_admin_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QrToken` ADD CONSTRAINT `QrToken_meeting_id_fkey` FOREIGN KEY (`meeting_id`) REFERENCES `Meeting`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QrToken` ADD CONSTRAINT `QrToken_cds_group_id_fkey` FOREIGN KEY (`cds_group_id`) REFERENCES `CdsGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QrToken` ADD CONSTRAINT `QrToken_generated_by_admin_id_fkey` FOREIGN KEY (`generated_by_admin_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_cds_group_id_fkey` FOREIGN KEY (`cds_group_id`) REFERENCES `CdsGroup`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_qr_token_id_fkey` FOREIGN KEY (`qr_token_id`) REFERENCES `QrToken`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserCdsAssignmentHistory` ADD CONSTRAINT `UserCdsAssignmentHistory_cds_group_id_fkey` FOREIGN KEY (`cds_group_id`) REFERENCES `CdsGroup`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentationLink` ADD CONSTRAINT `DocumentationLink_created_by_admin_id_fkey` FOREIGN KEY (`created_by_admin_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CorpMemberDoc` ADD CONSTRAINT `CorpMemberDoc_link_id_fkey` FOREIGN KEY (`link_id`) REFERENCES `DocumentationLink`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CorpMemberDoc` ADD CONSTRAINT `CorpMemberDoc_created_by_admin_id_fkey` FOREIGN KEY (`created_by_admin_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployerDoc` ADD CONSTRAINT `EmployerDoc_link_id_fkey` FOREIGN KEY (`link_id`) REFERENCES `DocumentationLink`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployerDoc` ADD CONSTRAINT `EmployerDoc_created_by_admin_id_fkey` FOREIGN KEY (`created_by_admin_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RejectedRepostingDoc` ADD CONSTRAINT `RejectedRepostingDoc_link_id_fkey` FOREIGN KEY (`link_id`) REFERENCES `DocumentationLink`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RejectedRepostingDoc` ADD CONSTRAINT `RejectedRepostingDoc_created_by_admin_id_fkey` FOREIGN KEY (`created_by_admin_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CorpMemberRequest` ADD CONSTRAINT `CorpMemberRequest_link_id_fkey` FOREIGN KEY (`link_id`) REFERENCES `DocumentationLink`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CorpMemberRequest` ADD CONSTRAINT `CorpMemberRequest_created_by_admin_id_fkey` FOREIGN KEY (`created_by_admin_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Setting` ADD CONSTRAINT `Setting_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PasswordResetToken` ADD CONSTRAINT `PasswordResetToken_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
