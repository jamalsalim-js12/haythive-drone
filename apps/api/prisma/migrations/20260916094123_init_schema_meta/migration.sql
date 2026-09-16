-- CreateTable
CREATE TABLE "SchemaMeta" (
    "id" TEXT NOT NULL DEFAULT 'haythive-dock',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchemaMeta_pkey" PRIMARY KEY ("id")
);
