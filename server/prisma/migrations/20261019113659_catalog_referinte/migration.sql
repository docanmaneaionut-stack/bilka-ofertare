-- AlterTable
ALTER TABLE "compartiment" ADD COLUMN     "codScurt" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "varianta_profil" (
    "id" TEXT NOT NULL,
    "furnizor" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "variantaProfil" TEXT NOT NULL,
    "restrictii" TEXT,
    "listaSursa" TEXT,
    "activ" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "varianta_profil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "culoare_finisaj_grosime" (
    "id" TEXT NOT NULL,
    "furnizor" TEXT NOT NULL,
    "finisaj" TEXT NOT NULL,
    "grosime" TEXT NOT NULL,
    "culoare" TEXT NOT NULL,
    "activ" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "culoare_finisaj_grosime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garantie_finisaj_grosime" (
    "id" TEXT NOT NULL,
    "furnizor" TEXT NOT NULL,
    "finisaj" TEXT NOT NULL,
    "grosime" TEXT NOT NULL,
    "garantieCuloareAni" INTEGER NOT NULL,
    "garantieCoroziuneAni" INTEGER NOT NULL,
    "stratZincGMp" DECIMAL(8,2),
    "stratVopseaUmExtInt" TEXT,
    "activ" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "garantie_finisaj_grosime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lista_implicita_oferta" (
    "id" TEXT NOT NULL,
    "furnizor" TEXT NOT NULL,
    "rubrica" TEXT NOT NULL,
    "categorieInvelitoare" TEXT NOT NULL,
    "ordine" INTEGER NOT NULL,
    "produs" TEXT NOT NULL,
    "activ" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lista_implicita_oferta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treapta_desfasurata" (
    "id" TEXT NOT NULL,
    "furnizor" TEXT NOT NULL,
    "treapta" TEXT NOT NULL,
    "deLaMm" INTEGER NOT NULL,
    "panaLaMm" INTEGER NOT NULL,
    "denumireBilka" TEXT NOT NULL,
    "activ" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treapta_desfasurata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "culoare_finisaj_grosime_furnizor_finisaj_grosime_idx" ON "culoare_finisaj_grosime"("furnizor", "finisaj", "grosime");

-- CreateIndex
CREATE UNIQUE INDEX "culoare_finisaj_grosime_furnizor_finisaj_grosime_culoare_key" ON "culoare_finisaj_grosime"("furnizor", "finisaj", "grosime", "culoare");

-- CreateIndex
CREATE UNIQUE INDEX "garantie_finisaj_grosime_furnizor_finisaj_grosime_key" ON "garantie_finisaj_grosime"("furnizor", "finisaj", "grosime");

-- CreateIndex
CREATE INDEX "lista_implicita_oferta_furnizor_categorieInvelitoare_idx" ON "lista_implicita_oferta"("furnizor", "categorieInvelitoare");

-- CreateIndex
CREATE UNIQUE INDEX "treapta_desfasurata_furnizor_treapta_key" ON "treapta_desfasurata"("furnizor", "treapta");

-- CreateIndex
CREATE UNIQUE INDEX "compartiment_codScurt_key" ON "compartiment"("codScurt");

