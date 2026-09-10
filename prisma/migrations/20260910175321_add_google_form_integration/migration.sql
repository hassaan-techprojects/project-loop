-- CreateTable
CREATE TABLE "GoogleFormIntegration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "webhookSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleFormIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleFormIntegration_workspaceId_key" ON "GoogleFormIntegration"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleFormIntegration_webhookSecret_key" ON "GoogleFormIntegration"("webhookSecret");

-- CreateIndex
CREATE INDEX "GoogleFormIntegration_workspaceId_idx" ON "GoogleFormIntegration"("workspaceId");

-- AddForeignKey
ALTER TABLE "GoogleFormIntegration" ADD CONSTRAINT "GoogleFormIntegration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
