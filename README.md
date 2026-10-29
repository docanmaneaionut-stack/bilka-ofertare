# Ofertare Bilka — instalare și pornire

Soft de ofertare și gestiune pentru distribuția de țiglă metalică. Arhitectura și regulile sunt în `docs/ARH.md`; jurnalul sesiunilor în `docs/JURNAL.md`.

## Cerințe
- Node.js 24, PostgreSQL 17.
- `server/.env` după `server/.env.example` (baza de date, baza de test, baza „shadow” pentru migrări, secretul de sesiune, conturile Admin general și de rezervă). Secretele nu intră în git.

## Instalare (prima dată) — în această ordine
1. `cd server && npm install`, apoi `cd ../web && npm install`.
2. **Migrările**: `cd server && npx prisma migrate deploy` (creează toate tabelele; migrările sunt doar aditive).
3. **Seed-ul**: `npm run seed` — creează conturile Admin general din `.env`, categoriile de ofertă și încarcă listele de opțiuni configurabile din `docs/import/configurare/optiuni-liste.csv` (motivele completării, sursa clientului). Seed-ul e idempotent: se poate rula oricând, adaugă doar ce lipsește și nu rescrie ce a modificat Admin general din Zona tehnică → Referințe.
4. **Browserul pentru PDF** (documentele ofertei se generează pe server cu Chrome, identic pe orice aparat): `cd server && npx puppeteer browsers install chrome` — descarcă Chrome-ul lui puppeteer (≈ 170 MB) în `%USERPROFILE%\.cache\puppeteer`. Fără internet la instalare, pe Windows serverul folosește Edge-ul din sistem ca rezervă. Fonturile documentelor sunt în proiect (`server/fonturi`, Arimo — OFL), nu depind de sistem.
5. **Prima pornire**: `pornire.cmd` din rădăcina proiectului (sau `npm run dev` în `server` și în `web`).

## Serverul Linux (Faza 3, VPS) — ce îi trebuie pentru PDF
Chrome-ul adus de puppeteer are nevoie de bibliotecile de sistem obișnuite ale unui browser (pe Debian / Ubuntu): `libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 fonts-liberation ca-certificates`; în Docker se folosește o imagine care le are deja (sau `npx puppeteer browsers install chrome` după instalarea pachetelor). Nu se construiește nimic acum — e doar lista pentru punerea în funcțiune.

La **restaurarea unui export** (`npm run restore -- <zip>`): baza trebuie să fie goală, cu migrările aplicate; după restaurare se rulează din nou `npm run seed`, ca listele de opțiuni și categoriile să fie complete.

## Teste
- `cd server && npm test` — testele pe baza de test (`DATABASE_URL_TEST`, numele bazei sau al schemei trebuie să conțină „test”).
- `npm run test:etalon` — ofertele-model din `docs/etalon/` (fără bază de date); trebuie să fie toate la zero.
