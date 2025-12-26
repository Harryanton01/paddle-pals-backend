/*
  Warnings:

  - You are about to drop the column `loserId` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `winnerId` on the `Match` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_loserId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_winnerId_fkey";

-- AlterTable
ALTER TABLE "Match" DROP COLUMN "loserId",
DROP COLUMN "winnerId";

-- CreateTable
CREATE TABLE "_Winners" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_Losers" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_Winners_AB_unique" ON "_Winners"("A", "B");

-- CreateIndex
CREATE INDEX "_Winners_B_index" ON "_Winners"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Losers_AB_unique" ON "_Losers"("A", "B");

-- CreateIndex
CREATE INDEX "_Losers_B_index" ON "_Losers"("B");

-- AddForeignKey
ALTER TABLE "_Winners" ADD CONSTRAINT "_Winners_A_fkey" FOREIGN KEY ("A") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Winners" ADD CONSTRAINT "_Winners_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Losers" ADD CONSTRAINT "_Losers_A_fkey" FOREIGN KEY ("A") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Losers" ADD CONSTRAINT "_Losers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
