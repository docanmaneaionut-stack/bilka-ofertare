-- CreateTable
CREATE TABLE "optiune_lista" (
    "id" TEXT NOT NULL,
    "lista" TEXT NOT NULL,
    "valoare" TEXT NOT NULL,
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "activ" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "optiune_lista_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "optiune_lista_lista_ordine_idx" ON "optiune_lista"("lista", "ordine");

-- CreateIndex
CREATE UNIQUE INDEX "optiune_lista_lista_valoare_key" ON "optiune_lista"("lista", "valoare");

