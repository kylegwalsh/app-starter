-- DropForeignKey
ALTER TABLE "member" DROP CONSTRAINT "member_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "member" DROP CONSTRAINT "member_userId_fkey";

-- DropForeignKey
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_inviterId_fkey";

-- DropForeignKey
ALTER TABLE "apikey" DROP CONSTRAINT "apikey_userId_fkey";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "banExpires",
DROP COLUMN "banReason",
DROP COLUMN "banned",
DROP COLUMN "role",

-- AlterTable
ALTER TABLE "session" DROP COLUMN "activeOrganizationId",
DROP COLUMN "impersonatedBy";

-- DropTable
DROP TABLE "organization";

-- DropTable
DROP TABLE "member";

-- DropTable
DROP TABLE "invitation";

-- DropTable
DROP TABLE "apikey";

