# JURNAL — istoricul sesiunilor de lucru

Fiecare intrare: data, obiectivul sesiunii, rezultatul, următorul pas propus.

---

## 2026-09-03 — Inițializarea proiectului

**Obiectiv:** inițializarea proiectului, fără cod de aplicație.

**Rezultat:**
- Verificate uneltele instalate: Git prezent (2.55.0); Node.js și PostgreSQL lipsesc — instrucțiuni de instalare transmise lui Ionuț.
- Corectat numele fișierului de arhitectură: `docs/ARH.md.md` → `docs/ARH.md` (conținut neschimbat).
- Creată structura de foldere conform ARH §7 și §9: `server/src/modules/` (câte un folder per modul: cat, lp, mot, ofe, doc, accounts, com, sto, not, adm, imp), `server/src/db/migrations/`, `server/tests/etalon/`, `web/src/` — toate goale, doar schelet.
- Modulul CON (Conturi) are folderul numit `accounts`, nu `con` — `con` este nume rezervat de Windows (device consolă) și nu poate fi folder pe disc. Codul de modul din glosar (ARH §2) rămâne CON; doar numele de folder diferă.
- Adăugat `.gitignore` (exclude `.env`, `node_modules`, build-uri, loguri).
- Inițializat depozitul Git local, primul commit, legat la depozitul GitHub al lui Ionuț, push.

**Următorul pas propus:** instalarea Node.js și PostgreSQL de către Ionuț; apoi începerea Fazei 2 din ARH §10 — baza de date + CON minim + CAT / LP / ADM (secțiunea 4 din ARH, model de date pentru configurare).

---

## 2026-09-10 — Catalog Bilka: liste 01–09 și fișa CATALOG ȘI PREȚURI

**Obiectiv:** punerea în git a întregii documentații de catalog Bilka lucrate în 04–10.09.2026, fără nicio modificare de conținut.

**Rezultat:**
- Adăugate în git, sub `docs/`:
  - fișele listelor 01–09 (rezidențial, auxiliare, pluvial 03–04, retro / fălțuită, industrial, șipcă gard, accesorii speciale 08–09) și fișa de modul CATALOG ȘI PREȚURI (CAT / LP / ADM), versiunea 1.0, propusă spre închidere;
  - fișa CONTURI, analizele listelor și ale formularului Bilka, regulile de culori, verificarea prețurilor din formular față de listele PDF;
  - `docs/import/Bilka/`: fișierele CSV de import pentru listele 01–09, pluvial Aluzinc (04b), culori finisaj × grosime, garanții finisaj × grosime, variante de profil, plus README;
  - `docs/Liste/Bilka/2026-09/`: listele de preț PDF 01–09, formularul de comandă v10 și tabelul tehnic rezidențial (sursele originale);
  - `docs/tools/compara_pdf_listapret.py`: scriptul de comparare PDF ↔ ListaPret, de refolosit la fiecare actualizare de listă.
- Niciun fișier existent nu a fost modificat; nu există încă teste (folderul de teste e gol), deci nu a fost nimic de rulat.

**Următorul pas propus:** confirmarea („ok") fișei CATALOG ȘI PREȚURI de către Ionuț, ca să treacă în stare închisă; apoi Faza 2 din ARH §10 — baza de date + CON minim + CAT / LP / ADM, folosind fișierele din `docs/import/Bilka/` ca prim set de date de import.

---

## 2026-10-16 — Fișa OFERTARE v1.0, fișa COMENZI v0.2, machete, PLAN, ARH v0.2

**Obiectiv:** aplicarea deltei `docs/ARH-delta-v0.2.md` în `docs/ARH.md` și punerea în git a documentației de proces scrise între timp (fișele OFERTARE și COMENZI, machetele de documente și ecrane, PLAN), fără nicio altă modificare.

**Rezultat:**
- `docs/ARH.md` actualizat la v0.2: glosar (SCH / GEO / PAN), entitățile Schiță și Panotaj în §4.3, regulile de panotaj de completat în §5, ordinea de construcție SCH/GEO/PAN și granițele cu MOT în §7, Etalon PAN în §8, intrare nouă în §13 Istoric. Fișierul `docs/ARH-delta-v0.2.md` a fost șters după aplicare, conform instrucțiunii din el.
- Adăugate în git: `docs/FISA-OFERTARE.md` (v1.0, închisă pentru oferta clasică), `docs/FISA-COMENZI.md` (v0.2, în lucru), `docs/PLAN.md` (v0.1, foaia de parcurs a construcției), `docs/design/` (machetele de documente și ecrane — oferte, tabel facturare, fișa șoferului, lista de oferte, tabelul de comenzi), modificările din `docs/FISA-CATALOG-PRETURI.md` și `docs/import/Bilka/garantii-finisaj-grosime.csv`, plus fișierul nou `docs/import/Bilka/liste-implicite-oferta.csv`.
- Niciun cod de aplicație încă; nu există teste de rulat.

**Următorul pas propus:** Ionuț confirmă fișa COMENZI (capitolele rămase PROPUS/de descris); apoi se poate trece la Faza 2 din ARH §10 / Etapa 1 din PLAN — sesiunea S2 (schelet aplicație + bază de date + autentificare).

---

## 2026-10-16 — Etapa 1, sesiunea S2: schelet aplicație + bază de date + autentificare

**Obiectiv:** scheletul aplicației (server Express/TypeScript, conexiune PostgreSQL prin Prisma, unealta de migrări), migrarea 1 cu tabelele pentru Etapa 1 (conform FISA-CONTURI și FISA-CATALOG-PRETURI, care au prioritate față de ARH §3/§4 — vezi ARH §13), contul Admin general, pagina de login și pagina goală „Zona tehnică".

**Rezultat:**
- Server Express + TypeScript în `server/` (deja schelet din S1): sesiune pe cookie stocată în Postgres (`connect-pg-simple`), parole cu `bcryptjs`, rute `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/adm` (Zona tehnică, acces doar Admin general).
- Prisma 6.19.3 ca unealtă de migrări (nu 8.x „latest", care s-a dovedit a fi un release-candidate cu un lanț de dependențe nesigur). Schema migrarii 1: Firmă, Utilizator (cele șase roluri, serie de ofertă, adaos %, ierarhie Administrator → Agent/Colaborator), Jurnal de modificări (cu numele utilizatorului la momentul acțiunii) și Jurnal de autentificări separat, Compartiment, Categorie de ofertă, Grup, Familie, Produs (cu toate coloanele din CSV-urile Bilka, inclusiv treapta / desfășurata / sistem / lățimi / modul — ca importul din S4 să nu piardă nimic), Listă de preț (versiune) și Preț de listă — schelet, fără date. Index unic parțial adăugat manual în migrare: o singură listă de preț ACTIVĂ per compartiment (FISA-CATALOG regula 6).
- Bază de date locală dedicată: rol `ofertare` (fără drept CREATEDB) + baza `ofertare_dev`, plus `ofertare_shadow` pentru calculul migrărilor — create cu parola lui `postgres` folosită o singură dată, niciodată salvată. Migrarea `20261016132528_init` e strict aditivă (verificată înainte de aplicare) și e în git.
- Pagina de login și pagina goală „Zona tehnică" în `web/` (React + Vite), verificate manual în browser: autentificare reușită, afișarea Zonei tehnice, logout, respingerea parolei greșite — toate funcționează.
- Scriptul de seed (`server/prisma/seed.ts`) creează contul Admin general al lui Ionuț și contul lui de rezervă (FISA-CONTURI §8.1) din variabilele de mediu `ADMIN_*` / `ADMIN_REZERVA_*` din `server/.env` — **nu a fost încă rulat**: fișierul are valori provizorii la parole, pe care Ionuț le înlocuiește el însuși înainte de rulare.
- Teste: 10 verzi (`npm test` în `server/`) — hash/verificare parolă, login cu parolă corectă/greșită, logout, acces Zona tehnică doar pentru Admin general.
- ARH §13: notată diferența dintre ARH §3/§4 și fișele FISA-CONTURI / FISA-CATALOG-PRETURI (care au prioritate); §3/§4 rămân nescrise.
- Lăsat neatins (nu e al acestei sesiuni): o modificare găsită deja în `docs/ANALIZA-FORMULAR-BILKA.md`, necomisă.

**Următorul pas propus:** Ionuț completează în `server/.env` cele patru valori provizorii (`ADMIN_EMAIL`, `ADMIN_PAROLA`, `ADMIN_REZERVA_EMAIL`, `ADMIN_REZERVA_PAROLA`) și confirmă; se rulează `npm run prisma:seed` ca să existe efectiv contul de login. Apoi Etapa 1, sesiunea S3 — Catalog (CAT): ecrane pentru compartimente, grupuri, familii, produse, culori, profil furnizor.
