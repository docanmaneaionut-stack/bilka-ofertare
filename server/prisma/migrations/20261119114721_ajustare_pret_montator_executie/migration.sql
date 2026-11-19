-- Migrarea 21 (S26b, aditiva; docs/MODIFICARI-S26.md): MODIFICAREA M5 - ajustarea pretului de vanzare pe
-- comanda (tabelul versiunilor, cu rezultatul complet al motorului) si intrarea motorului salvata pe oferta
-- la "Comandat"; MODIFICAREA M8 - montatorul de executie (nume, telefon) pe oferta si pe comanda, tipul
-- "colaborator" in lista de persoane. Nimic sters, nimic redenumit, nimic migrat: campul de azi
-- (montatorId / montatorNume + comisionul) ramane "Recomandarea".

-- AlterEnum
ALTER TYPE "TipMontator" ADD VALUE 'COLABORATOR';

-- AlterTable
ALTER TABLE "comanda" ADD COLUMN     "montatorExecutieNume" TEXT,
ADD COLUMN     "montatorExecutieTelefon" TEXT;

-- AlterTable
ALTER TABLE "oferta" ADD COLUMN     "intrareMotor" JSONB,
ADD COLUMN     "montatorExecutieNume" TEXT,
ADD COLUMN     "montatorExecutieTelefon" TEXT;

-- CreateTable
CREATE TABLE "comanda_ajustare_pret" (
    "id" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "versiune" INTEGER NOT NULL,
    "totalVechiLei" DECIMAL(14,2) NOT NULL,
    "totalNouLei" DECIMAL(14,2) NOT NULL,
    "totalVechiCuTvaEur" DECIMAL(14,2) NOT NULL,
    "totalNouCuTvaEur" DECIMAL(14,2) NOT NULL,
    "motiv" TEXT NOT NULL,
    "rezultatMotor" JSONB NOT NULL,
    "utilizatorId" TEXT,
    "numeUtilizatorLaMoment" TEXT NOT NULL,
    "moment" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comanda_ajustare_pret_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "comanda_ajustare_pret_comandaId_versiune_key" ON "comanda_ajustare_pret"("comandaId", "versiune");

-- AddForeignKey
ALTER TABLE "comanda_ajustare_pret" ADD CONSTRAINT "comanda_ajustare_pret_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comanda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
