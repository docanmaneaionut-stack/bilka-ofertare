-- AlterEnum
ALTER TYPE "TipDocument" ADD VALUE 'FORMULAR_BILKA';

-- AlterTable
ALTER TABLE "firma" ADD COLUMN     "sablonBilka" TEXT,
ADD COLUMN     "sablonBilkaIncarcatDe" TEXT,
ADD COLUMN     "sablonBilkaIncarcatLa" TIMESTAMP(3),
ADD COLUMN     "sablonBilkaVersiune" TEXT;

-- AlterTable
ALTER TABLE "oferta_document" ADD COLUMN     "avertizari" TEXT,
ADD COLUMN     "formularNr" INTEGER;

-- AlterTable
ALTER TABLE "oferta_invelitoare" ADD COLUMN     "montaj" TEXT;

-- CreateTable
CREATE TABLE "corespondenta_formular_bilka" (
    "id" TEXT NOT NULL,
    "furnizor" TEXT NOT NULL,
    "cheie" TEXT NOT NULL,
    "cuvant" TEXT NOT NULL DEFAULT '',
    "numeFormular" TEXT NOT NULL,
    "stare" TEXT NOT NULL DEFAULT 'automat',
    "observatie" TEXT,
    "activ" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corespondenta_formular_bilka_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "corespondenta_formular_bilka_furnizor_cheie_cuvant_key" ON "corespondenta_formular_bilka"("furnizor", "cheie", "cuvant");

