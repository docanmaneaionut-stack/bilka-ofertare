-- CreateEnum
CREATE TYPE "StatusImport" AS ENUM ('PROPUSA', 'CONFIRMATA', 'ANULATA');

-- AlterEnum
ALTER TYPE "StatusListaPret" ADD VALUE 'ANULATA';

-- AlterTable
ALTER TABLE "lista_pret" ADD COLUMN     "activataLa" TIMESTAMP(3),
ADD COLUMN     "anulataLa" TIMESTAMP(3),
ADD COLUMN     "arhivataLa" TIMESTAMP(3),
ADD COLUMN     "fisiere" JSONB,
ADD COLUMN     "raport" JSONB;

-- CreateTable
CREATE TABLE "import_propunere" (
    "id" TEXT NOT NULL,
    "compartimentId" TEXT NOT NULL,
    "creatDeId" TEXT,
    "status" "StatusImport" NOT NULL DEFAULT 'PROPUSA',
    "areProduse" BOOLEAN NOT NULL DEFAULT false,
    "areReferinte" BOOLEAN NOT NULL DEFAULT false,
    "fisiere" JSONB NOT NULL,
    "diferente" JSONB NOT NULL,
    "raport" JSONB NOT NULL,
    "erori" JSONB NOT NULL,
    "avertizari" JSONB NOT NULL,
    "randuri" JSONB NOT NULL,
    "listaPretId" TEXT,
    "confirmataLa" TIMESTAMP(3),
    "anulataLa" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_propunere_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_propunere_compartimentId_createdAt_idx" ON "import_propunere"("compartimentId", "createdAt");

-- AddForeignKey
ALTER TABLE "import_propunere" ADD CONSTRAINT "import_propunere_compartimentId_fkey" FOREIGN KEY ("compartimentId") REFERENCES "compartiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_propunere" ADD CONSTRAINT "import_propunere_creatDeId_fkey" FOREIGN KEY ("creatDeId") REFERENCES "utilizator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_propunere" ADD CONSTRAINT "import_propunere_listaPretId_fkey" FOREIGN KEY ("listaPretId") REFERENCES "lista_pret"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Imutabilitatea listelor arhivate (manual, adaugat dupa generarea Prisma).
-- O lista ARHIVATA nu se modifica: nici randurile ei de pret (INSERT / UPDATE /
-- DELETE), nici lista insasi (UPDATE / DELETE). Istoricul ramane liniar;
-- revenirea la o lista veche = reimportul fisierelor ei ca versiune noua.
-- Fara schema hardcodata: tabelele se rezolva prin search_path (merge si pe o
-- schema de test). TRUNCATE (folosit doar de teste) nu declanseaza trigger-ele
-- pe rand.
CREATE OR REPLACE FUNCTION refuza_modificare_lista_arhivata() RETURNS trigger AS $$
DECLARE
  stare text;
  lista_id text;
BEGIN
  IF TG_TABLE_NAME = 'pret_lista_produs' THEN
    lista_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."listaPretId" ELSE NEW."listaPretId" END;
    SELECT status::text INTO stare FROM lista_pret WHERE id = lista_id;
    IF stare = 'ARHIVATA' THEN
      RAISE EXCEPTION 'Lista de pret arhivata nu se modifica (%)', lista_id;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD."listaPretId" <> NEW."listaPretId" THEN
      SELECT status::text INTO stare FROM lista_pret WHERE id = OLD."listaPretId";
      IF stare = 'ARHIVATA' THEN
        RAISE EXCEPTION 'Lista de pret arhivata nu se modifica (%)', OLD."listaPretId";
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'lista_pret' THEN
    IF OLD.status::text = 'ARHIVATA' THEN
      RAISE EXCEPTION 'Lista de pret arhivata nu se modifica (%)', OLD.id;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pret_lista_produs_imutabil_arhivat
  BEFORE INSERT OR UPDATE OR DELETE ON pret_lista_produs
  FOR EACH ROW EXECUTE FUNCTION refuza_modificare_lista_arhivata();

CREATE TRIGGER lista_pret_imutabila_arhivata
  BEFORE UPDATE OR DELETE ON lista_pret
  FOR EACH ROW EXECUTE FUNCTION refuza_modificare_lista_arhivata();
