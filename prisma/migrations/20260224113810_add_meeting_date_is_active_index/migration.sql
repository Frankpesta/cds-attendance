-- DropForeignKey
ALTER TABLE `AdminGroupAssignment` DROP FOREIGN KEY `AdminGroupAssignment_admin_id_fkey`;

-- DropForeignKey
ALTER TABLE `AdminGroupAssignment` DROP FOREIGN KEY `AdminGroupAssignment_cds_group_id_fkey`;

-- DropForeignKey
ALTER TABLE `Attendance` DROP FOREIGN KEY `Attendance_cds_group_id_fkey`;

-- DropForeignKey
ALTER TABLE `Attendance` DROP FOREIGN KEY `Attendance_qr_token_id_fkey`;

-- DropForeignKey
ALTER TABLE `Attendance` DROP FOREIGN KEY `Attendance_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `AuditLog` DROP FOREIGN KEY `AuditLog_actor_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `CorpMemberDoc` DROP FOREIGN KEY `CorpMemberDoc_created_by_admin_id_fkey`;

-- DropForeignKey
ALTER TABLE `CorpMemberDoc` DROP FOREIGN KEY `CorpMemberDoc_link_id_fkey`;

-- DropForeignKey
ALTER TABLE `CorpMemberRequest` DROP FOREIGN KEY `CorpMemberRequest_created_by_admin_id_fkey`;

-- DropForeignKey
ALTER TABLE `CorpMemberRequest` DROP FOREIGN KEY `CorpMemberRequest_link_id_fkey`;

-- DropForeignKey
ALTER TABLE `DocumentationLink` DROP FOREIGN KEY `DocumentationLink_created_by_admin_id_fkey`;

-- DropForeignKey
ALTER TABLE `EmployerDoc` DROP FOREIGN KEY `EmployerDoc_created_by_admin_id_fkey`;

-- DropForeignKey
ALTER TABLE `EmployerDoc` DROP FOREIGN KEY `EmployerDoc_link_id_fkey`;

-- DropForeignKey
ALTER TABLE `Meeting` DROP FOREIGN KEY `Meeting_activated_by_admin_id_fkey`;

-- DropForeignKey
ALTER TABLE `Meeting` DROP FOREIGN KEY `Meeting_cds_group_id_fkey`;

-- DropForeignKey
ALTER TABLE `PasswordResetToken` DROP FOREIGN KEY `PasswordResetToken_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `QrToken` DROP FOREIGN KEY `QrToken_cds_group_id_fkey`;

-- DropForeignKey
ALTER TABLE `QrToken` DROP FOREIGN KEY `QrToken_generated_by_admin_id_fkey`;

-- DropForeignKey
ALTER TABLE `QrToken` DROP FOREIGN KEY `QrToken_meeting_id_fkey`;

-- DropForeignKey
ALTER TABLE `RejectedRepostingDoc` DROP FOREIGN KEY `RejectedRepostingDoc_created_by_admin_id_fkey`;

-- DropForeignKey
ALTER TABLE `RejectedRepostingDoc` DROP FOREIGN KEY `RejectedRepostingDoc_link_id_fkey`;

-- DropForeignKey
ALTER TABLE `Session` DROP FOREIGN KEY `Session_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `Setting` DROP FOREIGN KEY `Setting_updated_by_fkey`;

-- DropForeignKey
ALTER TABLE `User` DROP FOREIGN KEY `User_cds_group_id_fkey`;

-- DropForeignKey
ALTER TABLE `UserCdsAssignmentHistory` DROP FOREIGN KEY `UserCdsAssignmentHistory_cds_group_id_fkey`;

-- DropIndex
DROP INDEX `Attendance_qr_token_id_fkey` ON `Attendance`;

-- DropIndex
DROP INDEX `CorpMemberDoc_created_by_admin_id_fkey` ON `CorpMemberDoc`;

-- DropIndex
DROP INDEX `CorpMemberDoc_link_id_fkey` ON `CorpMemberDoc`;

-- DropIndex
DROP INDEX `CorpMemberRequest_created_by_admin_id_fkey` ON `CorpMemberRequest`;

-- DropIndex
DROP INDEX `CorpMemberRequest_link_id_fkey` ON `CorpMemberRequest`;

-- DropIndex
DROP INDEX `DocumentationLink_created_by_admin_id_fkey` ON `DocumentationLink`;

-- DropIndex
DROP INDEX `EmployerDoc_created_by_admin_id_fkey` ON `EmployerDoc`;

-- DropIndex
DROP INDEX `EmployerDoc_link_id_fkey` ON `EmployerDoc`;

-- DropIndex
DROP INDEX `Meeting_activated_by_admin_id_fkey` ON `Meeting`;

-- DropIndex
DROP INDEX `QrToken_generated_by_admin_id_fkey` ON `QrToken`;

-- DropIndex
DROP INDEX `RejectedRepostingDoc_created_by_admin_id_fkey` ON `RejectedRepostingDoc`;

-- DropIndex
DROP INDEX `RejectedRepostingDoc_link_id_fkey` ON `RejectedRepostingDoc`;

-- DropIndex
DROP INDEX `Setting_updated_by_fkey` ON `Setting`;
