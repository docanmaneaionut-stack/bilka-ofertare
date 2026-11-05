-- S19 (migrarea 15, aditiva): comanda completa - legatura cu oferta devine optionala (comenzile manuale),
-- contul alocat, livrarea, facturarea, statusul logistic cu istoric, observatiile, atasamentele
-- CreateEnum
CREATE TYPE "TipComanda" AS ENUM ('DIN_OFERTA', 'MANUALA');

-- AlterTable
ALTER TABLE "comanda" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "contAlocatId" TEXT,
ADD COLUMN     "dataLivrarii" DATE,
ADD COLUMN     "facturareAdresa" TEXT,
ADD COLUMN     "facturareCui" TEXT,
ADD COLUMN     "facturareFirma" TEXT,
ADD COLUMN     "indicatiiLivrare" TEXT,
ADD COLUMN     "indicatiiLivrareLa" TIMESTAMP(3),
ADD COLUMN     "indicatiiLivrareNume" TEXT,
ADD COLUMN     "livratLa" TIMESTAMP(3),
ADD COLUMN     "notaLipsuri" TEXT,
ADD COLUMN     "statusLogisticLa" TIMESTAMP(3),
ADD COLUMN     "tip" "TipComanda" NOT NULL DEFAULT 'DIN_OFERTA',
ALTER COLUMN "ofertaId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "comanda_istoric" (
    "id" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "moment" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utilizatorId" TEXT,
    "numeUtilizatorLaMoment" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "camp" TEXT,
    "valoareInainte" TEXT,
    "valoareDupa" TEXT,
    "mentiuni" TEXT,

    CONSTRAINT "comanda_istoric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comanda_observatie" (
    "id" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "utilizatorId" TEXT,
    "numeUtilizatorLaMoment" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "moment" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comanda_observatie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comanda_atasament" (
    "id" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "nume" TEXT NOT NULL,
    "fisier" TEXT NOT NULL,
    "tipMime" TEXT,
    "marime" INTEGER,
    "incarcatDeId" TEXT,
    "moment" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comanda_atasament_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comanda_istoric_comandaId_moment_idx" ON "comanda_istoric"("comandaId", "moment");

-- CreateIndex
CREATE INDEX "comanda_observatie_comandaId_moment_idx" ON "comanda_observatie"("comandaId", "moment");

-- CreateIndex
CREATE INDEX "comanda_atasament_comandaId_idx" ON "comanda_atasament"("comandaId");

-- CreateIndex
CREATE INDEX "comanda_contAlocatId_idx" ON "comanda"("contAlocatId");

-- AddForeignKey
ALTER TABLE "comanda" ADD CONSTRAINT "comanda_contAlocatId_fkey" FOREIGN KEY ("contAlocatId") REFERENCES "utilizator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda" ADD CONSTRAINT "comanda_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_istoric" ADD CONSTRAINT "comanda_istoric_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comanda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_istoric" ADD CONSTRAINT "comanda_istoric_utilizatorId_fkey" FOREIGN KEY ("utilizatorId") REFERENCES "utilizator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_observatie" ADD CONSTRAINT "comanda_observatie_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comanda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_observatie" ADD CONSTRAINT "comanda_observatie_utilizatorId_fkey" FOREIGN KEY ("utilizatorId") REFERENCES "utilizator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_atasament" ADD CONSTRAINT "comanda_atasament_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comanda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_atasament" ADD CONSTRAINT "comanda_atasament_incarcatDeId_fkey" FOREIGN KEY ("incarcatDeId") REFERENCES "utilizator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
