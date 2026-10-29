-- CreateEnum
CREATE TYPE "TipDocument" AS ENUM ('OFERTA', 'REZUMAT', 'DETALIATA', 'TABEL_FACTURARE');

-- CreateEnum
CREATE TYPE "CanalTransmitere" AS ENUM ('WHATSAPP', 'EMAIL', 'PRINT');

-- CreateTable
CREATE TABLE "oferta_document" (
    "id" TEXT NOT NULL,
    "ofertaId" TEXT NOT NULL,
    "tip" "TipDocument" NOT NULL,
    "versiune" INTEGER NOT NULL,
    "nume" TEXT NOT NULL,
    "fisier" TEXT NOT NULL,
    "marime" INTEGER NOT NULL,
    "pagini" INTEGER,
    "generatDeId" TEXT,
    "generatLa" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transmisLa" TIMESTAMP(3),
    "canal" "CanalTransmitere",

    CONSTRAINT "oferta_document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "oferta_document_ofertaId_generatLa_idx" ON "oferta_document"("ofertaId", "generatLa");

-- AddForeignKey
ALTER TABLE "oferta_document" ADD CONSTRAINT "oferta_document_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "oferta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_document" ADD CONSTRAINT "oferta_document_generatDeId_fkey" FOREIGN KEY ("generatDeId") REFERENCES "utilizator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

