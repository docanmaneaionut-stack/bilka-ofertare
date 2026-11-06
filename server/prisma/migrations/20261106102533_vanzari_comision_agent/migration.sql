-- S21 (migrarea 17, aditiva): comisionul agentului cu "achitat" si sumele manuale de vanzare pe comanda (tabelul de vanzari)
-- AlterTable
ALTER TABLE "comanda" ADD COLUMN     "comisionAgentAchitat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "comisionAgentAchitatDeNume" TEXT,
ADD COLUMN     "comisionAgentAchitatLa" TIMESTAMP(3),
ADD COLUMN     "comisionAgentLei" DECIMAL(14,2),
ADD COLUMN     "vanzareCostLei" DECIMAL(14,2),
ADD COLUMN     "vanzarePretLei" DECIMAL(14,2);
