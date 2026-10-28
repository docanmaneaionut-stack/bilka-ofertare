# Configurare — liste de opțiuni (`optiuni-liste.csv`)

Scris de Claude (chat), 28.10.2026, pentru S14 (FISA-OFERTARE cap. 2 — sursa clientului; cap. 2b — motivul completării).
Coloane: `lista` (cheia listei) · `valoare` (textul afișat) · `ordine` · `activ` (da / nu).
Se încarcă prin `npm run seed` (idempotent: adaugă doar valorile care lipsesc; nu șterge, nu rescrie ce a modificat Admin general din Zona tehnică → Referințe).
Valorile nu stau în migrări, ca restaurarea unui export să pornească mereu de la o bază goală.
