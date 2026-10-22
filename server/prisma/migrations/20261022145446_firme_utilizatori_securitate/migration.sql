-- AlterEnum
ALTER TYPE "RezultatAutentificare" ADD VALUE 'BLOCAT';

-- AlterTable
ALTER TABLE "firma" ADD COLUMN     "banca" TEXT,
ADD COLUMN     "judet" TEXT,
ADD COLUMN     "localitate" TEXT,
ADD COLUMN     "observatii" TEXT,
ADD COLUMN     "platitorTva" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "utilizator" ADD COLUMN     "blocatPanaLa" TIMESTAMP(3),
ADD COLUMN     "incercariEsuate" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "parolaTrebuieSchimbata" BOOLEAN NOT NULL DEFAULT false;

