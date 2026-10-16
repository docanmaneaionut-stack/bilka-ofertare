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
