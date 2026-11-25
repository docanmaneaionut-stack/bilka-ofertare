-- Migrarea 24 (S29, aditiva; BUG-20 din docs/CERERI-BUG-S25.md): randurile adaugate cu "+ Adauga..." si lasate fara
-- cantitate. Un tabel NOU, separat de liniile ofertei, ca sa nu poata ajunge la motor sau pe documente. Doar
-- CREATE TABLE, cu indexul si cheile lui straine; niciun tabel existent nu e atins.

-- CreateTable
CREATE TABLE "oferta_rand_gol" (
    "id" TEXT NOT NULL,
    "ofertaId" TEXT NOT NULL,
    "ordine" INTEGER NOT NULL,
    "dupaLinii" INTEGER NOT NULL,
    "rubrica" TEXT NOT NULL,
    "produsId" TEXT,
    "cod" TEXT NOT NULL,
    "denumire" TEXT NOT NULL,
    "um" TEXT NOT NULL,
    "finisaj" TEXT,
    "grosime" TEXT,
    "grup" TEXT,
    "familie" TEXT,
    "optiune" TEXT,
    "sistem" TEXT,
    "invelitoareId" TEXT,
    "culoareRal" TEXT,
    "culoareFinisaj" TEXT,
    "culoareGrosime" TEXT,

    CONSTRAINT "oferta_rand_gol_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "oferta_rand_gol_ofertaId_idx" ON "oferta_rand_gol"("ofertaId");

-- AddForeignKey
ALTER TABLE "oferta_rand_gol" ADD CONSTRAINT "oferta_rand_gol_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "oferta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_rand_gol" ADD CONSTRAINT "oferta_rand_gol_invelitoareId_fkey" FOREIGN KEY ("invelitoareId") REFERENCES "oferta_invelitoare"("id") ON DELETE SET NULL ON UPDATE CASCADE;
