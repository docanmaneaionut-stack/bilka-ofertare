-- S23: avizul de insotire a marfii (AVIZ in TipDocument, comanda_aviz, comanda_aviz_linie) si linkul la locatie pe comanda - doar adaugiri
-- AlterEnum
ALTER TYPE "TipDocument" ADD VALUE 'AVIZ';

-- AlterTable
ALTER TABLE "comanda" ADD COLUMN     "locatieUrl" TEXT;

-- CreateTable
CREATE TABLE "comanda_aviz" (
    "id" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "numar" INTEGER NOT NULL,
    "dataLivrarii" DATE NOT NULL,
    "partial" BOOLEAN NOT NULL DEFAULT false,
    "coli" INTEGER NOT NULL DEFAULT 0,
    "piese" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "generatDeId" TEXT,
    "numeGeneratLaMoment" TEXT NOT NULL,
    "moment" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentId" TEXT,

    CONSTRAINT "comanda_aviz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comanda_aviz_linie" (
    "id" TEXT NOT NULL,
    "avizId" TEXT NOT NULL,
    "ordine" INTEGER NOT NULL,
    "linieId" TEXT,
    "pozitieId" TEXT,
    "cod" TEXT,
    "denumire" TEXT NOT NULL,
    "um" TEXT NOT NULL,
    "cantitate" DECIMAL(14,3) NOT NULL,
    "lungimeM" DECIMAL(8,3),
    "bucati" INTEGER,

    CONSTRAINT "comanda_aviz_linie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comanda_aviz_comandaId_numar_idx" ON "comanda_aviz"("comandaId", "numar");

-- CreateIndex
CREATE INDEX "comanda_aviz_linie_avizId_idx" ON "comanda_aviz_linie"("avizId");

-- AddForeignKey
ALTER TABLE "comanda_aviz" ADD CONSTRAINT "comanda_aviz_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comanda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_aviz" ADD CONSTRAINT "comanda_aviz_generatDeId_fkey" FOREIGN KEY ("generatDeId") REFERENCES "utilizator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_aviz_linie" ADD CONSTRAINT "comanda_aviz_linie_avizId_fkey" FOREIGN KEY ("avizId") REFERENCES "comanda_aviz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
