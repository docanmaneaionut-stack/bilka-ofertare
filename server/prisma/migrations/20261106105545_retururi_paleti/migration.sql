-- S22 (migrarea 18, aditiva): retururile (comanda_retur, comanda_retur_linie), nota de retur in enumul documentelor, nota si statusul paletului pe comanda
-- CreateEnum
CREATE TYPE "StareRetur" AS ENUM ('ACTIV', 'ANULAT');

-- AlterEnum
ALTER TYPE "TipDocument" ADD VALUE 'NOTA_RETUR';

-- AlterTable
ALTER TABLE "comanda" ADD COLUMN     "notaPalet" TEXT,
ADD COLUMN     "notaPaletLa" TIMESTAMP(3),
ADD COLUMN     "notaPaletNume" TEXT,
ADD COLUMN     "paletRecuperat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paletRecuperatDeNume" TEXT,
ADD COLUMN     "paletRecuperatLa" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "comanda_retur" (
    "id" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "numar" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "stare" "StareRetur" NOT NULL DEFAULT 'ACTIV',
    "sumaFaraTvaEur" DECIMAL(14,2) NOT NULL,
    "tvaEur" DECIMAL(14,2) NOT NULL,
    "sumaCuTvaEur" DECIMAL(14,2) NOT NULL,
    "sumaCuTvaLei" DECIMAL(14,2) NOT NULL,
    "achizitieLei" DECIMAL(14,2) NOT NULL,
    "cursBnr" DECIMAL(10,4) NOT NULL,
    "cursAchizitie" DECIMAL(10,4) NOT NULL,
    "tvaPct" DECIMAL(5,2) NOT NULL,
    "observatii" TEXT,
    "notatDeId" TEXT,
    "numeNotatLaMoment" TEXT NOT NULL,
    "moment" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anulatLa" TIMESTAMP(3),
    "anulatDeNume" TEXT,
    "motivAnulare" TEXT,
    "deRegularizat" BOOLEAN NOT NULL DEFAULT false,
    "regularizatLa" TIMESTAMP(3),
    "regularizatDeNume" TEXT,
    "documentId" TEXT,

    CONSTRAINT "comanda_retur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comanda_retur_linie" (
    "id" TEXT NOT NULL,
    "returId" TEXT NOT NULL,
    "linieId" TEXT NOT NULL,
    "cod" TEXT NOT NULL,
    "denumire" TEXT NOT NULL,
    "um" TEXT NOT NULL,
    "cantitate" DECIMAL(14,3) NOT NULL,
    "pretDocumentEur" DECIMAL(14,4) NOT NULL,
    "valoareEur" DECIMAL(14,2) NOT NULL,
    "achizitieRealaEur" DECIMAL(14,4) NOT NULL,
    "achizitieLei" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "comanda_retur_linie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comanda_retur_comandaId_numar_idx" ON "comanda_retur"("comandaId", "numar");

-- CreateIndex
CREATE INDEX "comanda_retur_linie_returId_idx" ON "comanda_retur_linie"("returId");

-- AddForeignKey
ALTER TABLE "comanda_retur" ADD CONSTRAINT "comanda_retur_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comanda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_retur" ADD CONSTRAINT "comanda_retur_notatDeId_fkey" FOREIGN KEY ("notatDeId") REFERENCES "utilizator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_retur_linie" ADD CONSTRAINT "comanda_retur_linie_returId_fkey" FOREIGN KEY ("returId") REFERENCES "comanda_retur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
