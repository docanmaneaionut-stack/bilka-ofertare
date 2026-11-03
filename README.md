# Ofertare Bilka — instalare și pornire

Soft de ofertare și gestiune pentru distribuția de țiglă metalică. Arhitectura și regulile sunt în `docs/ARH.md`; jurnalul sesiunilor în `docs/JURNAL.md`.

## Cerințe
- Node.js 24, PostgreSQL 17.
- `server/.env` după `server/.env.example` (baza de date, baza de test, baza „shadow” pentru migrări, secretul de sesiune, conturile Admin general și de rezervă). Secretele nu intră în git.

## Instalare (prima dată) — în această ordine
1. `cd server && npm install`, apoi `cd ../web && npm install`.
2. **Migrările**: `cd server && npx prisma migrate deploy` (creează toate tabelele; migrările sunt doar aditive).
3. **Seed-ul**: `npm run seed` — creează conturile Admin general din `.env`, categoriile de ofertă și încarcă listele de opțiuni configurabile din `docs/import/configurare/optiuni-liste.csv` (motivele completării, sursa clientului) și tabela de corespondență pentru formularul de comandă Bilka din `docs/import/configurare/corespondenta-formular-bilka.csv`. Seed-ul e idempotent: se poate rula oricând, adaugă doar ce lipsește și nu rescrie ce a modificat Admin general din Zona tehnică → Referințe.
4. **Browserul pentru PDF** (documentele ofertei se generează pe server cu Chrome, identic pe orice aparat): `cd server && npx puppeteer browsers install chrome` — descarcă Chrome-ul lui puppeteer (≈ 170 MB) în `%USERPROFILE%\.cache\puppeteer`. Fără internet la instalare, pe Windows serverul folosește Edge-ul din sistem ca rezervă. Fonturile documentelor sunt în proiect (`server/fonturi`, Arimo — OFL), nu depind de sistem.
5. **Șablonul formularului Bilka** (după prima pornire, din aplicație): Admin general → Zona tehnică → Firme → „Șablon formular Bilka” → fișierul .xlsm al firmei (formularul de comandă Bilka cu datele ei de cont; pentru referință, v10 e în `docs/Liste/Bilka/2026-09/`). Fără el, formularele de comandă nu se pot genera pentru ofertele firmei. Fișierul stă în folderul de date (`sabloane-bilka/`), nu în git.
6. **Prima pornire**: `pornire.cmd` din rădăcina proiectului (sau `npm run dev` în `server` și în `web`).

## Serverul Linux (Faza 3, VPS) — ce îi trebuie pentru PDF
Chrome-ul adus de puppeteer are nevoie de bibliotecile de sistem obișnuite ale unui browser (pe Debian / Ubuntu): `libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 fonts-liberation ca-certificates`; în Docker se folosește o imagine care le are deja (sau `npx puppeteer browsers install chrome` după instalarea pachetelor). Nu se construiește nimic acum — e doar lista pentru punerea în funcțiune.

La **restaurarea unui export** (`npm run restore -- <zip>`): baza trebuie să fie goală, cu migrările aplicate; după restaurare se rulează din nou `npm run seed`, ca listele de opțiuni și categoriile să fie complete.

## Teste
- `cd server && npm test` — testele pe baza de test (`DATABASE_URL_TEST`, numele bazei sau al schemei trebuie să conțină „test”).
- `npm run test:etalon` — ofertele-model din `docs/etalon/` (fără bază de date); trebuie să fie toate la zero.

## Verificarea formularului Bilka cu Excel ca arbitru (S17c)
`cd server && npm run verifica:formular` — pe calculatorul cu Excel, când nu lucrează nimeni în Excel. Scriptul rulează **doar pe schema de test** (`DATABASE_URL_TEST`, folderul `data-test`), cu firmă, agent și catalog proprii; nu atinge baza de dezvoltare. Pentru fiecare produs activ din catalog face o ofertă de test, generează formularul, îl deschide într-o instanță Excel invizibilă (macro-urile active doar pe acea instanță, nicio setare permanentă), îl **salvează** (abia la salvare macro-ul Bilka umple foaia „Portal”), citește prețurile pe rânduri și foaia Portal și le compară cu catalogul. Niciun macro nu e apelat explicit și nimic nu pleacă nicăieri (vezi secțiunea „Ce rulează automat în Excel” din raport).
- Raportul: `docs/verificari/formular-bilka-raport.md` (rezumat pe categorii + excepțiile); starea pe produs: `docs/verificari/formular-bilka-stare.json`, scrisă după fiecare formular — o rulare întreruptă se reia de unde a rămas.
- `-- --proba` — doar trei formulare (E01, Retro Plus Double Line lucios 0,50, T 35 acoperiș / perete); raport separat `formular-bilka-proba.md`.
- `-- --de-la-zero` — **la fiecare șablon nou de la Bilka**: încarcă șablonul la firmă (Zona tehnică → Firme), apoi rulează cu `--de-la-zero` (sau `--sablon <cale.xlsm>` pentru un fișier anume); starea veche se șterge și raportul se reface pentru noul șablon.
- `-- --toate-culorile` (fiecare culoare a cheii, nu doar prima), `-- --limita N` (cel mult N oferte în rularea curentă).
- Nu se rulează în același timp cu `npm test` (aceeași schemă de test). Șablonul implicit: primul fișier din `server/data/sabloane-bilka/`.
