-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pencaId" TEXT;

-- CreateTable
CREATE TABLE "Penca" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Penca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Penca_code_key" ON "Penca"("code");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_pencaId_fkey" FOREIGN KEY ("pencaId") REFERENCES "Penca"("id") ON DELETE SET NULL ON UPDATE CASCADE;
