-- AlterTable
ALTER TABLE "oferta_linie" ADD COLUMN     "sistem" TEXT;


-- M2 (R10): liniile existente primesc sistemul pluvial al produsului lor din catalog
-- (aditiv: doar UPDATE pe coloana noua, nimic sters)
UPDATE "oferta_linie" AS l
SET "sistem" = p."sistem"
FROM "produs" AS p
WHERE l."produsId" = p."id" AND p."sistem" IS NOT NULL AND l."sistem" IS NULL;
