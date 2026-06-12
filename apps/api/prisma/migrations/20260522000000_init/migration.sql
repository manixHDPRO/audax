-- Migration initiale AUDAX
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CHEF', 'SECRETAIRE', 'OFFICIER', 'ACCUEIL', 'OBSERVATEUR');
CREATE TYPE "AudienceStatus" AS ENUM ('EN_ATTENTE', 'EN_ANALYSE', 'VALIDEE', 'REJETEE', 'PLANIFIEE', 'TERMINEE', 'ARCHIVEE');
CREATE TYPE "Priority" AS ENUM ('NORMALE', 'URGENTE', 'CRITIQUE');
CREATE TYPE "Confidentiality" AS ENUM ('STANDARD', 'RESTREINT', 'SECRET');
CREATE TYPE "AudienceCategory" AS ENUM ('DIPLOMATIQUE', 'MILITAIRE', 'CIVIL', 'INSTITUTIONNEL', 'AUTRE');
CREATE TYPE "AccessLevel" AS ENUM ('STANDARD', 'RESTREINT', 'VIP');
CREATE TYPE "RoomStatus" AS ENUM ('LIBRE', 'OCCUPEE', 'RESERVEE', 'MAINTENANCE');
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'CRITICAL');
CREATE TYPE "ValidationDecision" AS ENUM ('APPROUVE', 'REJETE', 'EN_ATTENTE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OBSERVATEUR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "visitors" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "organization" TEXT,
    "function" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "photoUrl" TEXT,
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'STANDARD',
    "badgeCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "visitors_badgeCode_key" ON "visitors"("badgeCode");

CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 10,
    "floor" TEXT,
    "status" "RoomStatus" NOT NULL DEFAULT 'LIBRE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rooms_name_key" ON "rooms"("name");

CREATE TABLE "audiences" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "motive" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterOrg" TEXT,
    "status" "AudienceStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "priority" "Priority" NOT NULL DEFAULT 'NORMALE',
    "confidentiality" "Confidentiality" NOT NULL DEFAULT 'STANDARD',
    "category" "AudienceCategory" NOT NULL DEFAULT 'AUTRE',
    "scheduledAt" TIMESTAMP(3),
    "duration" INTEGER NOT NULL DEFAULT 30,
    "roomId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "audiences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "audiences_reference_key" ON "audiences"("reference");
ALTER TABLE "audiences" ADD CONSTRAINT "audiences_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audiences" ADD CONSTRAINT "audiences_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "audience_visitors" (
    "id" TEXT NOT NULL,
    "audienceId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "audience_visitors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "audience_visitors_audienceId_visitorId_key" ON "audience_visitors"("audienceId", "visitorId");
ALTER TABLE "audience_visitors" ADD CONSTRAINT "audience_visitors_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "audiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audience_visitors" ADD CONSTRAINT "audience_visitors_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "audience_status_history" (
    "id" TEXT NOT NULL,
    "audienceId" TEXT NOT NULL,
    "fromStatus" "AudienceStatus",
    "toStatus" "AudienceStatus" NOT NULL,
    "comment" TEXT,
    "changedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audience_status_history_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "audience_status_history" ADD CONSTRAINT "audience_status_history_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "audiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "validations" (
    "id" TEXT NOT NULL,
    "audienceId" TEXT NOT NULL,
    "validatorId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "decision" "ValidationDecision" NOT NULL DEFAULT 'EN_ATTENTE',
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "validations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "validations" ADD CONSTRAINT "validations_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "audiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "validations" ADD CONSTRAINT "validations_validatorId_fkey" FOREIGN KEY ("validatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "validation_comments" (
    "id" TEXT NOT NULL,
    "audienceId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "validation_comments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "validation_comments" ADD CONSTRAINT "validation_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "audienceId" TEXT NOT NULL,
    "roomId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "appointments_audienceId_key" ON "appointments"("audienceId");
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "audiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "audienceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "filePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "documents" ADD CONSTRAINT "documents_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "audiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "audienceId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "attachments" ADD CONSTRAINT "attachments_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "audiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "ipAddress" TEXT,
    "beforeData" JSONB,
    "afterData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");
