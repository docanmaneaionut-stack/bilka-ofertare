-- Migrarea 23 (S28, aditiva; BUG-18 din docs/CERERI-BUG-S25.md): comanda manuala isi tine localitatea si adresa
-- lucrarii, ca oferta (pana acum randul ei arata adresa din fisa clientului, care putea fi a altei lucrari).
-- Doua coloane optionale; comenzile existente raman cu ele goale (se arata localitatea de pe comanda, ca pana acum).

-- AlterTable
ALTER TABLE "comanda" ADD COLUMN     "adresaLucrarii" TEXT,
ADD COLUMN     "localitateLucrarii" TEXT;
