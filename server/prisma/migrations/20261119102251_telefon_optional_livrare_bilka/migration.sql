-- S26a (migrarea 20; MODIFICARILE M6 si M7): telefonul clientului devine optional si apare marcajul "telefon dublat";
-- livrarea de la Bilka (depozit / santier) pe oferta si pe comanda. Doar adaugiri si largiri; nimic sters.
-- CreateEnum
CREATE TYPE "LivrareBilka" AS ENUM ('DEPOZIT', 'SANTIER');

-- AlterTable
ALTER TABLE "client" ADD COLUMN     "telefonDublat" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "telefon" DROP NOT NULL,
ALTER COLUMN "telefonNormalizat" DROP NOT NULL;

-- AlterTable
ALTER TABLE "comanda" ADD COLUMN     "livrareBilka" "LivrareBilka",
ADD COLUMN     "livrareBilkaLa" TIMESTAMP(3),
ADD COLUMN     "livrareBilkaLocalitate" TEXT,
ADD COLUMN     "livrareBilkaTelefon" TEXT;

-- AlterTable
ALTER TABLE "oferta" ADD COLUMN     "livrareBilka" "LivrareBilka",
ADD COLUMN     "livrareBilkaLa" TIMESTAMP(3),
ADD COLUMN     "livrareBilkaLocalitate" TEXT,
ADD COLUMN     "livrareBilkaTelefon" TEXT;

-- M6: unicitatea telefonului ramane in baza, dar PARTIALA - doi clienti nemarcati nu pot avea acelasi numar;
-- clientul fara telefon si dublatul marcat ("telefonDublat" = true) sunt singurele exceptii. Indexul unic
-- complet de pana acum e inlocuit cu unul partial cu acelasi nume (Prisma nu vede indexurile partiale: in schema nu mai e @unique).
DROP INDEX "client_telefonNormalizat_key";
CREATE UNIQUE INDEX "client_telefonNormalizat_key" ON "client"("telefonNormalizat") WHERE "telefonNormalizat" IS NOT NULL AND "telefonDublat" = false;
