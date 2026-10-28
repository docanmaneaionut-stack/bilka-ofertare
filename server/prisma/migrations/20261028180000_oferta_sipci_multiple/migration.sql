-- DropIndex
DROP INDEX "oferta_sipca_ofertaId_key";

-- AlterTable
ALTER TABLE "oferta_sipca" ADD COLUMN     "ordine" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "oferta_sipca_ofertaId_idx" ON "oferta_sipca"("ofertaId");

