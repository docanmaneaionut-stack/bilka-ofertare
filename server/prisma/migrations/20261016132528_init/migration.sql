-- CreateEnum
CREATE TYPE "RolUtilizator" AS ENUM ('ADMIN_GENERAL', 'ADMINISTRATOR', 'AGENT', 'COLABORATOR', 'CONTABILITATE', 'GESTIUNE');

-- CreateEnum
CREATE TYPE "RezultatAutentificare" AS ENUM ('SUCCES', 'ESEC');

-- CreateEnum
CREATE TYPE "TipCompartiment" AS ENUM ('FURNIZOR', 'STOC_PROPRIU');

-- CreateEnum
CREATE TYPE "ModPret" AS ENUM ('LISTA_ACHIZITIE', 'CATALOG_DISCOUNT');

-- CreateEnum
CREATE TYPE "StatusListaPret" AS ENUM ('SCHITA', 'ACTIVA', 'ARHIVATA');

-- CreateTable
CREATE TABLE "session" (
    "sid" VARCHAR NOT NULL,
    "sess" JSONB NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "firma" (
    "id" TEXT NOT NULL,
    "denumire" TEXT NOT NULL,
    "cui" TEXT NOT NULL,
    "nrRegCom" TEXT NOT NULL,
    "adresa" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contBancar" TEXT,
    "logo" TEXT,
    "activ" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "firma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilizator" (
    "id" TEXT NOT NULL,
    "nume" TEXT NOT NULL,
    "telefon" TEXT,
    "email" TEXT NOT NULL,
    "parolaHash" TEXT NOT NULL,
    "rol" "RolUtilizator" NOT NULL,
    "firmaId" TEXT,
    "administratorId" TEXT,
    "serieOferta" TEXT,
    "adaosProcent" DECIMAL(6,3),
    "accesGeneralFirme" BOOLEAN NOT NULL DEFAULT false,
    "activ" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utilizator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilizator_firma" (
    "id" TEXT NOT NULL,
    "utilizatorId" TEXT NOT NULL,
    "firmaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utilizator_firma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jurnal_intrare" (
    "id" TEXT NOT NULL,
    "utilizatorId" TEXT,
    "numeUtilizatorLaMoment" TEXT NOT NULL,
    "moment" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entitate" TEXT NOT NULL,
    "entitateId" TEXT NOT NULL,
    "actiune" TEXT NOT NULL,
    "camp" TEXT,
    "valoareInainte" TEXT,
    "valoareDupa" TEXT,

    CONSTRAINT "jurnal_intrare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jurnal_autentificare" (
    "id" TEXT NOT NULL,
    "utilizatorId" TEXT,
    "emailIncercat" TEXT NOT NULL,
    "moment" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rezultat" "RezultatAutentificare" NOT NULL,
    "dispozitiv" TEXT,
    "sursa" TEXT,

    CONSTRAINT "jurnal_autentificare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compartiment" (
    "id" TEXT NOT NULL,
    "denumire" TEXT NOT NULL,
    "tip" "TipCompartiment" NOT NULL,
    "moneda" TEXT NOT NULL,
    "modPret" "ModPret" NOT NULL,
    "formatImport" TEXT,
    "contactFurnizorNume" TEXT,
    "contactFurnizorTelefon" TEXT,
    "contactFurnizorEmail" TEXT,
    "contactDirectorZonal" TEXT,
    "activ" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compartiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorie_oferta" (
    "id" TEXT NOT NULL,
    "denumire" TEXT NOT NULL,
    "zona" TEXT NOT NULL,
    "ordine" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categorie_oferta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grup" (
    "id" TEXT NOT NULL,
    "compartimentId" TEXT NOT NULL,
    "denumire" TEXT NOT NULL,
    "ordine" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "grup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "familie" (
    "id" TEXT NOT NULL,
    "grupId" TEXT NOT NULL,
    "denumire" TEXT NOT NULL,
    "ordine" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "familie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produs" (
    "id" TEXT NOT NULL,
    "compartimentId" TEXT NOT NULL,
    "grupId" TEXT NOT NULL,
    "familieId" TEXT,
    "codIntern" TEXT NOT NULL,
    "codFurnizor" TEXT,
    "varianta" TEXT,
    "finisaj" TEXT,
    "grosime" TEXT,
    "optiune" TEXT,
    "denumire" TEXT NOT NULL,
    "um" TEXT NOT NULL,
    "moneda" TEXT NOT NULL,
    "categorieOfertaId" TEXT,
    "categorieBilka" TEXT,
    "latimeTotalaM" DECIMAL(8,4),
    "latimeTotalaMm" DECIMAL(8,2),
    "modulCm" DECIMAL(6,2),
    "sistem" TEXT,
    "treapta" TEXT,
    "desfasurata" TEXT,
    "culoriDisponibile" TEXT,
    "sursa" TEXT,
    "observatii" TEXT,
    "activ" BOOLEAN NOT NULL DEFAULT true,
    "ordine" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lista_pret" (
    "id" TEXT NOT NULL,
    "compartimentId" TEXT NOT NULL,
    "denumire" TEXT NOT NULL,
    "valabilaDeLa" TIMESTAMP(3) NOT NULL,
    "sursa" TEXT,
    "status" "StatusListaPret" NOT NULL DEFAULT 'SCHITA',
    "creataDeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lista_pret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pret_lista_produs" (
    "id" TEXT NOT NULL,
    "listaPretId" TEXT NOT NULL,
    "produsId" TEXT NOT NULL,
    "pret" DECIMAL(12,4) NOT NULL,
    "observatie" TEXT,

    CONSTRAINT "pret_lista_produs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IDX_session_expire" ON "session"("expire");

-- CreateIndex
CREATE UNIQUE INDEX "utilizator_email_key" ON "utilizator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "utilizator_serieOferta_key" ON "utilizator"("serieOferta");

-- CreateIndex
CREATE UNIQUE INDEX "utilizator_firma_utilizatorId_firmaId_key" ON "utilizator_firma"("utilizatorId", "firmaId");

-- CreateIndex
CREATE INDEX "jurnal_intrare_entitate_entitateId_idx" ON "jurnal_intrare"("entitate", "entitateId");

-- CreateIndex
CREATE UNIQUE INDEX "compartiment_denumire_key" ON "compartiment"("denumire");

-- CreateIndex
CREATE UNIQUE INDEX "categorie_oferta_denumire_key" ON "categorie_oferta"("denumire");

-- CreateIndex
CREATE UNIQUE INDEX "grup_compartimentId_denumire_key" ON "grup"("compartimentId", "denumire");

-- CreateIndex
CREATE UNIQUE INDEX "familie_grupId_denumire_key" ON "familie"("grupId", "denumire");

-- CreateIndex
CREATE UNIQUE INDEX "produs_codIntern_key" ON "produs"("codIntern");

-- CreateIndex
CREATE INDEX "produs_compartimentId_idx" ON "produs"("compartimentId");

-- CreateIndex
CREATE INDEX "produs_codFurnizor_idx" ON "produs"("codFurnizor");

-- CreateIndex
CREATE UNIQUE INDEX "pret_lista_produs_listaPretId_produsId_key" ON "pret_lista_produs"("listaPretId", "produsId");

-- AddForeignKey
ALTER TABLE "utilizator" ADD CONSTRAINT "utilizator_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "firma"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilizator" ADD CONSTRAINT "utilizator_administratorId_fkey" FOREIGN KEY ("administratorId") REFERENCES "utilizator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilizator_firma" ADD CONSTRAINT "utilizator_firma_utilizatorId_fkey" FOREIGN KEY ("utilizatorId") REFERENCES "utilizator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilizator_firma" ADD CONSTRAINT "utilizator_firma_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "firma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jurnal_intrare" ADD CONSTRAINT "jurnal_intrare_utilizatorId_fkey" FOREIGN KEY ("utilizatorId") REFERENCES "utilizator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jurnal_autentificare" ADD CONSTRAINT "jurnal_autentificare_utilizatorId_fkey" FOREIGN KEY ("utilizatorId") REFERENCES "utilizator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grup" ADD CONSTRAINT "grup_compartimentId_fkey" FOREIGN KEY ("compartimentId") REFERENCES "compartiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "familie" ADD CONSTRAINT "familie_grupId_fkey" FOREIGN KEY ("grupId") REFERENCES "grup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produs" ADD CONSTRAINT "produs_compartimentId_fkey" FOREIGN KEY ("compartimentId") REFERENCES "compartiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produs" ADD CONSTRAINT "produs_grupId_fkey" FOREIGN KEY ("grupId") REFERENCES "grup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produs" ADD CONSTRAINT "produs_familieId_fkey" FOREIGN KEY ("familieId") REFERENCES "familie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produs" ADD CONSTRAINT "produs_categorieOfertaId_fkey" FOREIGN KEY ("categorieOfertaId") REFERENCES "categorie_oferta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lista_pret" ADD CONSTRAINT "lista_pret_compartimentId_fkey" FOREIGN KEY ("compartimentId") REFERENCES "compartiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lista_pret" ADD CONSTRAINT "lista_pret_creataDeId_fkey" FOREIGN KEY ("creataDeId") REFERENCES "utilizator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pret_lista_produs" ADD CONSTRAINT "pret_lista_produs_listaPretId_fkey" FOREIGN KEY ("listaPretId") REFERENCES "lista_pret"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pret_lista_produs" ADD CONSTRAINT "pret_lista_produs_produsId_fkey" FOREIGN KEY ("produsId") REFERENCES "produs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex (manual, adaugat dupa generarea Prisma)
-- Fisa CATALOG-PRETURI regula 6: o singura lista de pret ACTIVA per compartiment.
-- Index unic partial - Prisma Migrate nu poate exprima clauza WHERE in schema.prisma.
CREATE UNIQUE INDEX "lista_pret_activa_unica_per_compartiment" ON "lista_pret"("compartimentId") WHERE "status" = 'ACTIVA';
