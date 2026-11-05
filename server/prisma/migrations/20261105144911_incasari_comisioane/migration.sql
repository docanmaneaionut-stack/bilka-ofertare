-- S20 (migrarea 16, aditiva): incasarile comenzii (cu stari si anulare cu motiv) si comisionul montatorului / recomandarii pe comanda
-- CreateEnum
CREATE TYPE "StareIncasare" AS ENUM ('PROPUSA', 'CONFIRMATA', 'ANULATA');

-- AlterTable
ALTER TABLE "comanda" ADD COLUMN     "comisionAchitat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "comisionAchitatDeNume" TEXT,
ADD COLUMN     "comisionAchitatLa" TIMESTAMP(3),
ADD COLUMN     "comisionLei" DECIMAL(14,2);

-- CreateTable
CREATE TABLE "comanda_incasare" (
    "id" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "sumaLei" DECIMAL(14,2) NOT NULL,
    "data" DATE NOT NULL,
    "ceReprezinta" TEXT NOT NULL,
    "stare" "StareIncasare" NOT NULL DEFAULT 'CONFIRMATA',
    "notatDeId" TEXT,
    "numeNotatLaMoment" TEXT NOT NULL,
    "moment" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmatLa" TIMESTAMP(3),
    "confirmatDeNume" TEXT,
    "anulatLa" TIMESTAMP(3),
    "anulatDeNume" TEXT,
    "motivAnulare" TEXT,

    CONSTRAINT "comanda_incasare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comanda_incasare_comandaId_data_idx" ON "comanda_incasare"("comandaId", "data");

-- AddForeignKey
ALTER TABLE "comanda_incasare" ADD CONSTRAINT "comanda_incasare_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comanda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_incasare" ADD CONSTRAINT "comanda_incasare_notatDeId_fkey" FOREIGN KEY ("notatDeId") REFERENCES "utilizator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
