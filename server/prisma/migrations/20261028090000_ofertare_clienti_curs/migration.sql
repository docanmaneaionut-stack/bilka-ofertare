-- CreateEnum
CREATE TYPE "StatusOferta" AS ENUM ('IN_LUCRU', 'TRANSMISA', 'DE_REVIZIONAT', 'ACCEPTATA', 'NEACCEPTATA', 'AVANS_LUAT', 'DE_COMANDAT', 'COMANDAT');

-- CreateEnum
CREATE TYPE "ModPrezentare" AS ENUM ('SIMPLU', 'LISTA_DISCOUNT_GENERAL', 'DISCOUNT_PER_LINIE');

-- CreateEnum
CREATE TYPE "TipTinta" AS ENUM ('TOTAL_CU_TVA_LEI', 'ADAOS_PCT', 'ADAOS_PCT_PASTRAT', 'PRELUATA');

-- CreateEnum
CREATE TYPE "TipPretFix" AS ENUM ('EUR_FARA_TVA', 'ACHIZITIE_PLUS_PCT');

-- CreateEnum
CREATE TYPE "VariantaSipca" AS ENUM ('COMANDA', 'CALCUL');

-- CreateTable
CREATE TABLE "client" (
    "id" TEXT NOT NULL,
    "nume" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "telefonNormalizat" TEXT NOT NULL,
    "adresa" TEXT NOT NULL,
    "localitate" TEXT,
    "email" TEXT,
    "observatii" TEXT,
    "creatDeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curs_valutar" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'EUR',
    "curs" DECIMAL(10,4) NOT NULL,
    "sursa" TEXT NOT NULL,
    "preluatLa" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curs_valutar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contor_serie" (
    "serie" TEXT NOT NULL,
    "ultimulNumar" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contor_serie_pkey" PRIMARY KEY ("serie")
);

-- CreateTable
CREATE TABLE "oferta" (
    "id" TEXT NOT NULL,
    "firmaId" TEXT NOT NULL,
    "utilizatorId" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "numar" INTEGER NOT NULL,
    "versiune" INTEGER NOT NULL DEFAULT 1,
    "curenta" BOOLEAN NOT NULL DEFAULT true,
    "data" DATE NOT NULL,
    "status" "StatusOferta" NOT NULL DEFAULT 'IN_LUCRU',
    "statusLa" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comandatLa" TIMESTAMP(3),
    "clientId" TEXT NOT NULL,
    "sursaClient" TEXT,
    "cursBnr" DECIMAL(10,4) NOT NULL,
    "cursAchizitie" DECIMAL(10,4) NOT NULL,
    "dataCurs" DATE NOT NULL,
    "sursaCurs" TEXT NOT NULL,
    "avertizareCurs" TEXT,
    "listaPretId" TEXT,
    "tvaPct" DECIMAL(5,2) NOT NULL,
    "modPrezentare" "ModPrezentare" NOT NULL DEFAULT 'SIMPLU',
    "discountGeneralPct" DECIMAL(6,3),
    "discountImplicitPct" DECIMAL(6,3),
    "tintaTip" "TipTinta" NOT NULL DEFAULT 'ADAOS_PCT',
    "tintaValoare" DECIMAL(14,4) NOT NULL,
    "grupaPct" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "completareLaId" TEXT,
    "motivCompletare" TEXT,
    "preluataDinId" TEXT,
    "note" TEXT,
    "creatDeId" TEXT,
    "modificatDeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oferta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oferta_invelitoare" (
    "id" TEXT NOT NULL,
    "ofertaId" TEXT NOT NULL,
    "ordine" INTEGER NOT NULL,
    "rol" TEXT NOT NULL,
    "produsId" TEXT,
    "cod" TEXT NOT NULL,
    "denumire" TEXT NOT NULL,
    "um" TEXT NOT NULL,
    "finisaj" TEXT,
    "grosime" TEXT,
    "grup" TEXT,
    "familie" TEXT,
    "optiune" TEXT,
    "pretBazaEur" DECIMAL(12,4) NOT NULL,
    "culoare" TEXT,
    "latimeTotalaM" DECIMAL(8,4) NOT NULL,
    "mpDirect" DECIMAL(12,3),
    "variantaProfil" TEXT,

    CONSTRAINT "oferta_invelitoare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oferta_pozitie" (
    "id" TEXT NOT NULL,
    "invelitoareId" TEXT,
    "linieId" TEXT,
    "ordine" INTEGER NOT NULL,
    "lungimeM" DECIMAL(8,3) NOT NULL,
    "bucati" INTEGER NOT NULL,

    CONSTRAINT "oferta_pozitie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oferta_linie" (
    "id" TEXT NOT NULL,
    "ofertaId" TEXT NOT NULL,
    "ordine" INTEGER NOT NULL,
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
    "pretBazaEur" DECIMAL(12,4) NOT NULL,
    "cantitate" DECIMAL(12,3) NOT NULL,
    "invelitoareId" TEXT,
    "culoareRal" TEXT,
    "culoareFinisaj" TEXT,
    "culoareGrosime" TEXT,
    "pretFixTip" "TipPretFix",
    "pretFixValoare" DECIMAL(12,4),
    "pretFixPreluat" BOOLEAN NOT NULL DEFAULT false,
    "discountPct" DECIMAL(6,3),

    CONSTRAINT "oferta_linie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oferta_sipca" (
    "id" TEXT NOT NULL,
    "ofertaId" TEXT NOT NULL,
    "linieId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "culoare" TEXT,
    "latimeSipcaMm" DECIMAL(8,2) NOT NULL,
    "varianta" "VariantaSipca" NOT NULL,

    CONSTRAINT "oferta_sipca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oferta_tronson" (
    "id" TEXT NOT NULL,
    "sipcaId" TEXT NOT NULL,
    "ordine" INTEGER NOT NULL,
    "lungimeSipcaM" DECIMAL(8,3) NOT NULL,
    "lungimeTronsonM" DECIMAL(8,3) NOT NULL,
    "distantaMm" DECIMAL(8,2) NOT NULL,

    CONSTRAINT "oferta_tronson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oferta_zona_b" (
    "id" TEXT NOT NULL,
    "ofertaId" TEXT NOT NULL,
    "ordine" INTEGER NOT NULL,
    "denumire" TEXT NOT NULL,
    "um" TEXT NOT NULL,
    "cantitate" DECIMAL(12,3) NOT NULL,
    "sumaLei" DECIMAL(12,2) NOT NULL,
    "contineTva" BOOLEAN NOT NULL DEFAULT false,
    "preiaInFactura" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "oferta_zona_b_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oferta_istoric" (
    "id" TEXT NOT NULL,
    "ofertaId" TEXT NOT NULL,
    "moment" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utilizatorId" TEXT,
    "numeUtilizatorLaMoment" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "camp" TEXT,
    "valoareInainte" TEXT,
    "valoareDupa" TEXT,
    "mentiuni" TEXT,

    CONSTRAINT "oferta_istoric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oferta_atasament" (
    "id" TEXT NOT NULL,
    "ofertaId" TEXT NOT NULL,
    "nume" TEXT NOT NULL,
    "fisier" TEXT NOT NULL,
    "tipMime" TEXT,
    "marime" INTEGER,
    "incarcatDeId" TEXT,
    "moment" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oferta_atasament_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_telefonNormalizat_key" ON "client"("telefonNormalizat");

-- CreateIndex
CREATE UNIQUE INDEX "curs_valutar_data_moneda_key" ON "curs_valutar"("data", "moneda");

-- CreateIndex
CREATE INDEX "oferta_firmaId_data_idx" ON "oferta"("firmaId", "data");

-- CreateIndex
CREATE INDEX "oferta_utilizatorId_data_idx" ON "oferta"("utilizatorId", "data");

-- CreateIndex
CREATE INDEX "oferta_clientId_idx" ON "oferta"("clientId");

-- CreateIndex
CREATE INDEX "oferta_status_idx" ON "oferta"("status");

-- CreateIndex
CREATE UNIQUE INDEX "oferta_serie_numar_versiune_key" ON "oferta"("serie", "numar", "versiune");

-- CreateIndex
CREATE INDEX "oferta_invelitoare_ofertaId_idx" ON "oferta_invelitoare"("ofertaId");

-- CreateIndex
CREATE INDEX "oferta_pozitie_invelitoareId_idx" ON "oferta_pozitie"("invelitoareId");

-- CreateIndex
CREATE INDEX "oferta_pozitie_linieId_idx" ON "oferta_pozitie"("linieId");

-- CreateIndex
CREATE INDEX "oferta_linie_ofertaId_idx" ON "oferta_linie"("ofertaId");

-- CreateIndex
CREATE UNIQUE INDEX "oferta_sipca_ofertaId_key" ON "oferta_sipca"("ofertaId");

-- CreateIndex
CREATE UNIQUE INDEX "oferta_sipca_linieId_key" ON "oferta_sipca"("linieId");

-- CreateIndex
CREATE INDEX "oferta_tronson_sipcaId_idx" ON "oferta_tronson"("sipcaId");

-- CreateIndex
CREATE INDEX "oferta_zona_b_ofertaId_idx" ON "oferta_zona_b"("ofertaId");

-- CreateIndex
CREATE INDEX "oferta_istoric_ofertaId_moment_idx" ON "oferta_istoric"("ofertaId", "moment");

-- CreateIndex
CREATE INDEX "oferta_atasament_ofertaId_idx" ON "oferta_atasament"("ofertaId");

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_creatDeId_fkey" FOREIGN KEY ("creatDeId") REFERENCES "utilizator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta" ADD CONSTRAINT "oferta_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "firma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta" ADD CONSTRAINT "oferta_utilizatorId_fkey" FOREIGN KEY ("utilizatorId") REFERENCES "utilizator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta" ADD CONSTRAINT "oferta_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta" ADD CONSTRAINT "oferta_listaPretId_fkey" FOREIGN KEY ("listaPretId") REFERENCES "lista_pret"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta" ADD CONSTRAINT "oferta_completareLaId_fkey" FOREIGN KEY ("completareLaId") REFERENCES "oferta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta" ADD CONSTRAINT "oferta_preluataDinId_fkey" FOREIGN KEY ("preluataDinId") REFERENCES "oferta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta" ADD CONSTRAINT "oferta_creatDeId_fkey" FOREIGN KEY ("creatDeId") REFERENCES "utilizator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta" ADD CONSTRAINT "oferta_modificatDeId_fkey" FOREIGN KEY ("modificatDeId") REFERENCES "utilizator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_invelitoare" ADD CONSTRAINT "oferta_invelitoare_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "oferta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_invelitoare" ADD CONSTRAINT "oferta_invelitoare_produsId_fkey" FOREIGN KEY ("produsId") REFERENCES "produs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_pozitie" ADD CONSTRAINT "oferta_pozitie_invelitoareId_fkey" FOREIGN KEY ("invelitoareId") REFERENCES "oferta_invelitoare"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_pozitie" ADD CONSTRAINT "oferta_pozitie_linieId_fkey" FOREIGN KEY ("linieId") REFERENCES "oferta_linie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_linie" ADD CONSTRAINT "oferta_linie_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "oferta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_linie" ADD CONSTRAINT "oferta_linie_produsId_fkey" FOREIGN KEY ("produsId") REFERENCES "produs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_linie" ADD CONSTRAINT "oferta_linie_invelitoareId_fkey" FOREIGN KEY ("invelitoareId") REFERENCES "oferta_invelitoare"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_sipca" ADD CONSTRAINT "oferta_sipca_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "oferta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_sipca" ADD CONSTRAINT "oferta_sipca_linieId_fkey" FOREIGN KEY ("linieId") REFERENCES "oferta_linie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_tronson" ADD CONSTRAINT "oferta_tronson_sipcaId_fkey" FOREIGN KEY ("sipcaId") REFERENCES "oferta_sipca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_zona_b" ADD CONSTRAINT "oferta_zona_b_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "oferta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_istoric" ADD CONSTRAINT "oferta_istoric_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "oferta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_istoric" ADD CONSTRAINT "oferta_istoric_utilizatorId_fkey" FOREIGN KEY ("utilizatorId") REFERENCES "utilizator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_atasament" ADD CONSTRAINT "oferta_atasament_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "oferta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_atasament" ADD CONSTRAINT "oferta_atasament_incarcatDeId_fkey" FOREIGN KEY ("incarcatDeId") REFERENCES "utilizator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

