/*
  Warnings:

  - You are about to drop the column `loserScore` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `winnerScore` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the `_Losers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_Winners` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `result` to the `Match` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MatchResult" AS ENUM ('TEAM_A_WIN', 'TEAM_B_WIN', 'DRAW');

-- DropForeignKey
ALTER TABLE "_Losers" DROP CONSTRAINT "_Losers_A_fkey";

-- DropForeignKey
ALTER TABLE "_Losers" DROP CONSTRAINT "_Losers_B_fkey";

-- DropForeignKey
ALTER TABLE "_Winners" DROP CONSTRAINT "_Winners_A_fkey";

-- DropForeignKey
ALTER TABLE "_Winners" DROP CONSTRAINT "_Winners_B_fkey";

-- AlterTable
ALTER TABLE "Match" DROP COLUMN "loserScore",
DROP COLUMN "winnerScore",
ADD COLUMN     "result" "MatchResult" NOT NULL,
ADD COLUMN     "scoreA" INTEGER,
ADD COLUMN     "scoreB" INTEGER;

-- DropTable
DROP TABLE "_Losers";

-- DropTable
DROP TABLE "_Winners";

-- CreateTable
CREATE TABLE "_TeamA" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_TeamB" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_TeamA_AB_unique" ON "_TeamA"("A", "B");

-- CreateIndex
CREATE INDEX "_TeamA_B_index" ON "_TeamA"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_TeamB_AB_unique" ON "_TeamB"("A", "B");

-- CreateIndex
CREATE INDEX "_TeamB_B_index" ON "_TeamB"("B");

-- AddForeignKey
ALTER TABLE "_TeamA" ADD CONSTRAINT "_TeamA_A_fkey" FOREIGN KEY ("A") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeamA" ADD CONSTRAINT "_TeamA_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeamB" ADD CONSTRAINT "_TeamB_A_fkey" FOREIGN KEY ("A") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeamB" ADD CONSTRAINT "_TeamB_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
