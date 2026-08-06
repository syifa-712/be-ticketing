-- CreateEnum
CREATE TYPE "Category" AS ENUM ('technical', 'billing', 'account', 'feature_request', 'other');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('new', 'in_progress', 'waiting_reply', 'escalated', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "Source" AS ENUM ('email', 'chat', 'phone', 'webform');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('comment', 'status_change', 'escalation', 'resolution', 'reopen');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('agent', 'admin');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "tier" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" UUID NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "priority" "Priority" NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'new',
    "tier" INTEGER NOT NULL DEFAULT 1,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "assignedToId" UUID,
    "source" "Source" NOT NULL,
    "resolutionNote" TEXT,
    "escalationReason" TEXT,
    "satisfactionRating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketActivity" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "type" "ActivityType" NOT NULL,
    "actor" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
