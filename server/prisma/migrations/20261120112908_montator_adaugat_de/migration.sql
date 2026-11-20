-- Migrarea 22 (S27, aditiva; BUG-16 din docs/CERERI-BUG-S25.md): pe lista de persoane a agentului, cine a adaugat
-- persoana cand nu e chiar agentul listei - montatorul de executie scris de mana pe comanda de Gestiune sau de un
-- Administrator intra in lista autorului ofertei, marcat "adaugat de ...". O singura coloana, optionala.

-- AlterTable
ALTER TABLE "montator" ADD COLUMN     "adaugatDeNume" TEXT;
