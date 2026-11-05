-- S17d: avertizare pe produs la trimiterea formularului Bilka (din tabela de corespondenta)
ALTER TABLE "corespondenta_formular_bilka" ADD COLUMN "atentie" TEXT;
