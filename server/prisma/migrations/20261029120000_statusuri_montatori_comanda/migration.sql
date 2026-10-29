-- CreateEnum
CREATE TYPE "TipMontator" AS ENUM ('MONTATOR', 'CONSTRUCTOR');

-- CreateEnum
CREATE TYPE "StatusLogistic" AS ENUM ('COMANDAT', 'RECEPTIONAT', 'RECEPTIONAT_PARTIAL', 'LIVRAT');

-- AlterTable
ALTER TABLE "oferta" ADD COLUMN     "avansLei" DECIMAL(14,2),
ADD COLUMN     "comisionAchitat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "comisionRecomandareLei" DECIMAL(14,2),
ADD COLUMN     "montatorId" TEXT,
ADD COLUMN     "rezultatMotor" JSONB,
ADD COLUMN     "rezultatSalvatLa" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "montator" (
    "id" TEXT NOT NULL,
    "utilizatorId" TEXT NOT NULL,
    "nume" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "telefonNormalizat" TEXT NOT NULL,
    "localitate" TEXT,
    "tip" "TipMontator" NOT NULL DEFAULT 'MONTATOR',
    "activ" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "montator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comanda" (
    "id" TEXT NOT NULL,
    "ofertaId" TEXT NOT NULL,
    "firmaId" TEXT NOT NULL,
    "responsabilId" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "numar" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "clientNume" TEXT NOT NULL,
    "clientTelefon" TEXT NOT NULL,
    "clientLocalitate" TEXT,
    "montatorNume" TEXT,
    "montatorTelefon" TEXT,
    "rezumat" TEXT NOT NULL,
    "totalCuTvaEur" DECIMAL(14,2) NOT NULL,
    "totalLei" DECIMAL(14,2) NOT NULL,
    "avansLei" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "restLei" DECIMAL(14,2) NOT NULL,
    "statusLogistic" "StatusLogistic" NOT NULL DEFAULT 'COMANDAT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oferta_notita" (
    "id" TEXT NOT NULL,
    "ofertaId" TEXT NOT NULL,
    "utilizatorId" TEXT,
    "numeUtilizatorLaMoment" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "moment" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oferta_notita_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "montator_utilizatorId_nume_idx" ON "montator"("utilizatorId", "nume");

-- CreateIndex
CREATE UNIQUE INDEX "comanda_ofertaId_key" ON "comanda"("ofertaId");

-- CreateIndex
CREATE INDEX "comanda_firmaId_data_idx" ON "comanda"("firmaId", "data");

-- CreateIndex
CREATE INDEX "oferta_notita_ofertaId_moment_idx" ON "oferta_notita"("ofertaId", "moment");

-- AddForeignKey
ALTER TABLE "oferta" ADD CONSTRAINT "oferta_montatorId_fkey" FOREIGN KEY ("montatorId") REFERENCES "montator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "montator" ADD CONSTRAINT "montator_utilizatorId_fkey" FOREIGN KEY ("utilizatorId") REFERENCES "utilizator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda" ADD CONSTRAINT "comanda_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "oferta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda" ADD CONSTRAINT "comanda_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "firma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda" ADD CONSTRAINT "comanda_responsabilId_fkey" FOREIGN KEY ("responsabilId") REFERENCES "utilizator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_notita" ADD CONSTRAINT "oferta_notita_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "oferta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_notita" ADD CONSTRAINT "oferta_notita_utilizatorId_fkey" FOREIGN KEY ("utilizatorId") REFERENCES "utilizator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

