# Lista de acceptare — Etapa 1 (fundația: CAT · LP / IMP · CON minim · ADM)

Versiunea 1.0 · 22 octombrie 2026 · Se bifează în sesiunea S6 și se îngheață odată cu eticheta `v0.1-fundatie`.
Fișier scris de Claude (chat). **Excepție la regula „docs/ nu se rescrie":** Claude Code completează doar coloana **Status** a rândurilor marcate „Code (S6)"; rândurile „Ionuț" le bifează Ionuț (prin Claude chat). Nimic altceva din fișier nu se modifică.

Legendă status: ✔ verificat (de cine, când) · ○ de verificat (de cine) · ✖ picat (ce s-a găsit → cerere BUG).

## A. Pornire și infrastructură

| Nr | Ce trebuie să fie adevărat | Cum se verifică | Status |
|---|---|---|---|
| A1 | `pornire.cmd` pornește totul de la zero (servere oprite → două ferestre + browserul pe login) | Ionuț, la următoarea repornire a calculatorului | ○ Ionuț · varianta „rulează deja" ✔ Ionuț 22.10 |
| A2 | Aplicația merge de pe tabletă, în rețeaua biroului (`http://192.168.8.163:5173`) | Ionuț, pe Surface | ✔ Ionuț 19.10 |
| A3 | Niciun secret în cod sau în git: parole, chei, date de conectare doar în `server/.env` (ignorat de git); `server/data/` ignorat | Code (S6): căutare în tot depozitul și în istoricul git | ✔ Code 22.10 — niciun `.env` comis vreodată; nicio parolă, cheie sau adresă de conectare cu parolă în fișierele curente sau în istoric (singurele potriviri: `server/.env.example`, cu `PAROLA` ca substituent); `server/data/` și `server/data-test/` ignorate |
| A4 | Migrările 1–5 se aplică de la zero pe o bază goală, fără intervenție manuală | test automat (fiecare rulare a testelor pornește de la zero pe schema de test) | ✔ test automat (S4, S5) |
| A5 | Testele refuză să ruleze pe o bază sau schemă fără „test" în nume | test automat | ✔ test automat (S4) |
| A6 | Serverul de dezvoltare repornit după orice migrare (lecția S4) este scris în JURNAL și în `pornire.cmd` nu e nevoie de pași în plus | Code (S6): citire | ✔ Code 22.10 — lecția e în JURNAL (S4, „Catalogul real e în aplicație”); `pornire.cmd` pornește direct `npm run dev` pentru server și interfață, fără migrări sau alți pași |

## B. Catalog (CAT)

| Nr | Ce trebuie să fie adevărat | Cum se verifică | Status |
|---|---|---|---|
| B1 | Compartimente, grupuri, familii, produse se creează și se modifică din ecran; fiecare modificare apare în jurnal (cine, când, dinainte / după) | Ionuț (S3) + test automat | ✔ Ionuț 19.10 · ✔ test automat |
| B2 | Catalogul Bilka real este în aplicație: 3.425 produse (3.399 rânduri + 26 coale), 3.247 coduri furnizor distincte, 5 fără cod, 2 inactive | test automat pe fișierele reale | ✔ test automat (S4) |
| B3 | Prețurile din aplicație sunt cele din PDF-urile Bilka | Ionuț, produse la întâmplare din liste diferite, cu PDF-ul alături | ✔ Ionuț 22.10 (fără diferențe) |
| B4 | „Un cod, două produse": tabla plană (mp + coală = 2,5 × preț/mp), ruperea pantei convexă / concavă, benzile — coduri interne diferite, același cod furnizor | test automat | ✔ test automat (S4) |
| B5 | Tabelele de referință: 118 culori, 22 garanții (4 de pluvial fără grosime, Magnelis / Aluzinc fără ani la culoare), 13 variante de profil, 86 liste implicite, 25 trepte D | test automat + Ionuț (ecranul Garanții) | ✔ test automat · ○ Ionuț |
| B6 | Nimic nu se șterge: produsele dispărute dintr-o listă devin inactive, culorile dispărute la fel | test automat | ✔ test automat (S4) |

## C. Liste de preț și import (LP / IMP)

| Nr | Ce trebuie să fie adevărat | Cum se verifică | Status |
|---|---|---|---|
| C1 | Importul din ecran al celor 14 fișiere reale, cu ecranul de diferențe; reimportul acelorași fișiere arată zero diferențe | Ionuț, din ecran | ✔ Ionuț 22.10 |
| C2 | O singură versiune activă pe compartiment; versiunea arhivată nu se poate modifica, nici direct în bază; istoricul e liniar (revenirea = reimport ca versiune nouă) | test automat | ✔ test automat (S4) |
| C3 | Erorile (rubrică necunoscută, identitate dublă, preț necitibil, listă lipsă din set) blochează confirmarea; avertizările nu | test automat | ✔ test automat (S4) |
| C4 | Raportul de import arată numărătorile pe fișier (522 / 88 / 138 / 37 / 339 / 892 / 83 / 650 / 650) și comparația cu versiunea anterioară | Ionuț (Liste de preț → Raport) | ○ Ionuț |
| C5 | Prețul de bază manual (Stoc sau corecție pe lista activă) lasă rând de jurnal cu dinainte / după | test automat | ✔ test automat (S4) |

## D. Firme și conturi (CON)

| Nr | Ce trebuie să fie adevărat | Cum se verifică | Status |
|---|---|---|---|
| D1 | Firmele reale create din ecran, cu toate câmpurile și sigla încărcată din ecran | Ionuț | ✔ Ionuț 22.10 (Roofshop DMI cu siglă, Proroof Comp fără siglă) |
| D2 | Conturi create din ecran pe roluri; serie 2–3 litere unică; e-mail unic; parolă de minim 10 caractere | Ionuț + test automat | ✔ Ionuț 22.10 (Administrator + Agent) · ✔ test automat |
| D3 | La prima conectare cu parolă pusă de altcineva, softul cere parola proprie | Ionuț | ✔ Ionuț 22.10 |
| D4 | Parolă greșită → mesaj neutru (nu spune dacă e-mailul există); după 5 încercări, blocare 15 minute, scrisă în jurnal | Ionuț (mesajul) + test automat (blocarea) | ✔ Ionuț 22.10 · ✔ test automat |
| D5 | Agentul și Colaboratorul nu văd Zona tehnică și nu primesc adaosul % în niciun răspuns | test automat + Ionuț (intră cu contul de agent, se uită la meniu și la „Contul meu") | ✔ test automat · ○ Ionuț |
| D6 | Administratorul vede doar firma lui și utilizatorii ei; nu creează Administratori sau firme | test automat | ✔ test automat (S5) |
| D7 | Conturile se dezactivează, nu se șterg (sesiunea moare pe loc); contul de rezervă e marcat și nu se atinge din ecran; o firmă cu utilizatori activi nu se dezactivează | test automat | ✔ test automat (S5) |
| D8 | Orice câmp modificat la firmă sau utilizator lasă rând de jurnal; parolele lasă rând fără valori | test automat | ✔ test automat (S5) |
| D9 | „Contul meu": schimbarea parolei proprii și ultimele 10 conectări | Ionuț | ✔ Ionuț 22.10 (parola) · ○ Ionuț (lista conectărilor) |

## E. Export și restaurare (ADM)

| Nr | Ce trebuie să fie adevărat | Cum se verifică | Status |
|---|---|---|---|
| E1 | „Descarcă tot" din ecran produce un ZIP cu toate tabelele, folderul de date și README cu numărători | Ionuț descarcă ZIP-ul în `D:\SOFT-BACKUP\` | ○ Ionuț (S6) |
| E2 | Restaurarea ZIP-ului **real** pe o bază goală dă aceleași numărători și valori ca baza de dezvoltare (produse, prețuri, firme, conturi, jurnal) | Code (S6): `npm run restore` pe schema de test cu ZIP-ul lui Ionuț, apoi comparație tabel cu tabel | ✔ Code 22.10 — `export-2026-10-22.zip` (752 KB) restaurat pe schema goală `test_restore_real`: 17 din 18 tabele identice ca numărători (3.425 produse, 3.425 prețuri, 2 firme, 5 conturi, 27 grupuri, 279 familii, 118 / 22 / 13 / 86 / 25 referințe, 2 propuneri, 16 autentificări, 28 fișiere); 20 de produse cu prețul activ, firmele cu toate câmpurile, utilizatorii fără parole, hash-urile, versiunea (activă) și suma prețurilor — identice; jurnal 4.011 față de 4.012 = rândul pe care exportul îl scrie despre sine după ce ZIP-ul e gata (așteptat). **BUG găsit și reparat** (propunerile de import nu se restaurau — coloana `randuri` lipsea din export, dar e obligatorie), cu test. Observație pentru D1: nici baza, nici exportul nu conțin o siglă (`logo` gol la ambele firme, fără `data/sigle/`, fără rând de jurnal) — încărcarea siglei Roofshop nu a ajuns pe server; ruta e verificată separat prin test automat cu sigla reală. Schema și folderul temporar șterse după raport. |
| E3 | Restaurarea cu date de test (export → bază goală → restore) | test automat | ✔ test automat (S5) |
| E4 | ZIP-ul real e păstrat într-un al doilea loc (stick sau cloud), nu doar pe calculator | Ionuț | ○ Ionuț |

## F. Documentație și înghețare

| Nr | Ce trebuie să fie adevărat | Cum se verifică | Status |
|---|---|---|---|
| F1 | JURNAL are câte o intrare per sesiune (S1–S6); ARH §13 are deciziile; PLAN e la zi | Code (S6): citire | ✔ Code 22.10 — JURNAL: S1 (03.09), S2 (16.10), S3 (19.10), S4 (19.10), S5 (22.10), S6 (22.10), plus intrările de specificație și de BUG; ARH §13 cu deciziile S2–S6; PLAN v0.6 cu S1–S6 GATA |
| F2 | ARH §4.1, §4.2, §6 marcate ÎNGHEȚAT, cu nota că se schimbă doar prin cerere MODIFICARE (testul întâi, apoi codul) | Code (S6) | ✔ Code 22.10 — titlurile §4.1, §4.2, §6 poartă „ÎNGHEȚAT (22.10.2026, `v0.1-fundatie`)" cu nota de sub fiecare; decizia și în §13 |
| F3 | Toate testele verzi; commit; eticheta `v0.1-fundatie` pe GitHub | Code (S6) | ✔ Code 22.10 — 56 de teste verzi (9 fișiere); commit S6; eticheta adnotată `v0.1-fundatie` împinsă pe GitHub |

## Rămâne deschis după Etapa 1 (nu blochează înghețarea)

- Un Administrator = o singură firmă (FISA-CONTURI §6): dacă Ionuț conduce ambele firme, are două conturi de Administrator; de regândit prin cerere MODIFICARE înainte de Etapa 3, dacă e incomod.
- Sigla Proroof Comp — de încărcat când există.
- Exportul pentru Administratori (fără `_sistem/parole.csv`) — Etapa 3, odată cu ofertele.
