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

*Completare 16.10.2026:* Ionuț a completat `.env`; seed-ul a rulat, ambele conturi Admin general există, testele au rămas verzi (10/10). S2 e GATA.

---

## 2026-10-19 — Etapa 1, sesiunea S3: ecranele de Catalog în Zona tehnică + migrarea 2

**Obiectiv:** ecranele de Catalog pentru Admin general (compartimente cu contactul furnizorului, grupuri și familii, produse cu căutare / filtre / formular complet / cascada de culori ca verificare), migrarea 2 aditivă cu tabelele pentru variante de profil, culori finisaj × grosime, garanții, liste implicite pe rubrică și trepte D, ecranele lor simple de vizualizare / editare; orice modificare în jurnal. Plan aprobat de Ionuț cu cinci corecturi (ordinea rubricilor decisă 19.10, `activ` pe tabelele de referință, codul intern determinist definit acum și folosit și la manual, excepțiile de culoare cu prioritate, aspectul după Capitolul 0).

**Rezultat:**
- **Migrarea 2** (`20261019113659_catalog_referinte`): cinci tabele noi care copiază coloanele CSV-urilor cu același nume, fiecare cu `activ` (nimic nu se șterge; o culoare greșită se dezactivează și iese din cascadă), plus `codScurt` pe Compartiment. Generată cu `prisma migrate diff` (promptul interactiv al `migrate dev` nu merge în acest mediu), citită integral înainte de aplicare — strict aditivă — aplicată cu `migrate deploy`.
- **Codul intern determinist** (decizie în ARH §13): `COD_SCURT-` + 10 caractere din SHA-256 peste (cod furnizor, denumire). Formularul îl completează automat când e lăsat gol; importul din S4 va folosi aceeași funcție (`server/src/modules/cat/codIntern.ts`). Verificat în browser: produsul creat manual a primit exact codul dat de formulă.
- **Server** (`server/src/modules/cat/`, montat la `/api/adm/cat`, doar Admin general): compartimente, grupuri / familii, produse (listă cu căutare și filtre pe compartiment / grup / familie / finisaj / grosime, paginată; creare / editare cu toate câmpurile; `culori-verificare` — excepțiile produsului au prioritate față de tabelul general), cele cinci tabele de referință + categoriile de ofertă printr-un singur tipar (listă / adăugare / editare, fără ștergere). Validare cu `zod`; erorile (validare, dubluri, inexistent) întoarse uniform. **Jurnal**: la creare un rând; la editare câte un rând pe câmp schimbat, cu valoarea dinainte / după și numele persoanei la momentul acțiunii (`server/src/modules/adm/jurnal.ts`).
- **Seed**: cele nouă categorii de ofertă în ordinea decisă 19.10 (Învelitori → Accesorii standard → Accesorii speciale 2 ML → Fixare și etanșare → Sistem pluvial → Șipcă gard → Accesorii speciale ML → Ferestre → Zona B); doar inițializare, rămân editabile din ecranul „Rubrici ofertă”.
- **Web** (`react-router-dom` adăugat): meniul Zonei tehnice; Compartimente (listă + formular, detaliu cu grupuri și familii inline); Produse (listă filtrabilă, formular pe secțiuni, panou „culorile care vor apărea la ofertă”, notă neblocantă la cod furnizor repetat); un ecran generic pentru cele șase tabele de referință — celule editabile, **Tab** și **săgeți** între căsuțe (sus / jos pe coloană, stânga / dreapta la marginea textului), „Salvează” se aprinde pe rândul modificat, rândul gol de jos adaugă, inactivele ascunse cu buton „Arată și inactivele”. Stilul de bază după Capitolul 0 (`web/src/index.css`): aerisit, contrast puternic, literă mare, laptop întâi, o singură culoare de accent (focus), galben doar la avertizări, roșu doar la erori. Acesta devine tiparul ecranelor următoare — de ajustat cu Ionuț pe ecrane reale (Capitolul 0, pct. 9).
- **Verificat în browser**, numai din tastatură unde se putea: login → compartiment → grup → familie → produs (cod intern automat, moneda preluată de la compartiment, avertizare „nicio culoare” până există rânduri) → două culori în tabelul editabil → săgeți între rânduri confirmate pe elementul focalizat → dezactivarea unei culori → produsul arată doar culoarea activă. Toate acțiunile au apărut în jurnal (creare × 4, modificare `activ` true → false). Datele de test au fost șterse la final; baza rămâne doar cu cele două conturi reale și cele nouă rubrici.
- **Teste**: 29 verzi (`npm test` în `server/`) — cod intern determinist (4), compartimente / grupuri / familii cu jurnal și acces interzis agentului (5), produse: validare, cod automat, „un cod, două produse”, jurnal pe câmp, filtre, verificarea culorilor în ambele variante (7), tabel de referință: jurnal la adăugare și dezactivare, dublură respinsă, acces (3), plus cele 10 din S2.
- ARH §13: notată decizia despre codul intern și `codScurt`, tabelele de referință independente până la S4, prioritatea excepțiilor de culoare, regula de jurnalizare pe câmp.
- Neatins, ca și în S2: modificarea deja existentă în `docs/ANALIZA-FORMULAR-BILKA.md` (nu e a acestor sesiuni, rămâne necomisă).
- Lăsat deliberat pentru mai târziu: ștergerea de rânduri (nu există cerere; există `activ`), legarea strictă a tabelelor de referință de produse (S4), avertismentele de stil `react(set-state-in-effect)` din lint (nu afectează funcționarea).

**Următorul pas propus:** Etapa 1, sesiunea S4 — liste de preț și import: versiuni cu dată de valabilitate; import din CSV-urile `docs/import/Bilka/` (cele 9 liste + cele 5 auxiliare) cu ecran de diferențe (preț modificat / produs nou / dispărut / culori), folosind `genereazaCodIntern` pentru identitatea produselor și `compartiment.denumire` ca cheie `furnizor` pentru tabelele de referință; activare; prețuri Stoc manuale. Înainte de S4, Ionuț poate crea din ecran compartimentul Bilka (cod scurt BIL, moneda EUR, listă de achiziție) și poate verifica aspectul ecranelor pe laptopul lui.

---

## 2026-10-19 — După S3: specificația în git, compartimentul Bilka, două ajustări înainte de S4

**Obiectiv:** (a) commit separat pentru modificările din `docs/` venite din sesiunile de specificație; (b) crearea compartimentului Bilka din ecran; (c) două ajustări cerute de Ionuț după primele ecrane reale: textele explicative mutate într-o secțiune „Ajutor pentru această pagină” pliată, și acces din rețeaua locală (tabletă) cu login funcțional.

**Rezultat:**
- `docs/` comis separat (`2fc107e`: COMENZI v1.2, NOTIȚE, OFERTARE — ordinea rubricilor, PLAN v0.3, `import/firme.csv`, sigla, macheta de aviz, ANALIZA-FORMULAR); `firme.csv` verificat înainte — doar date de identificare ale firmelor, fără parole sau chei.
- **Compartimentul Bilka** creat din ecran, din tastatură: BIL · furnizor · EUR · listă de achiziție · format import `bilka-v1` · agent de vânzări Vișan Alexandru Ionuț, 0728 192 569 · director zonal Tănase Cosmin-Andrei, 0726 298 747 (e-mail lipsă deocamdată). Creat cu un cont temporar „Configurare inițială (Claude, S3)”, șters după; jurnalul păstrează numele autorului cu `utilizatorId` gol — exact comportamentul proiectat.
- **Ajutorul paginii** (FISA-OFERTARE Capitolul 0, pct. 10, nou): componenta `Ajutor` (`<details>` pliat implicit) la finalul fiecărei pagini; scoase toate textele explicative din Compartimente, detaliul compartimentului, Produse, formularul de produs (toate indicațiile din etichetele câmpurilor, inclusiv la bifa „Activ”) și tabelele de referință (descrierea și regulile de tastatură). Rămân vizibile doar validările și avertizările (cod furnizor repetat, „nicio culoare”, erori). Proprietatea `ajutor` a componentei `Camp` a fost eliminată, ca regula să nu poată fi ocolită din neatenție.
- **Acces din rețea**: Vite ascultă pe toate interfețele (`host: true`) și face proxy `/api` către Express — aplicația și API-ul au același origin, deci cookie-ul de sesiune merge de pe orice dispozitiv fără CORS; aplicația apelează API-ul relativ (`VITE_API_URL` gol implicit). Serverul are `trust proxy` pe loopback și proxy-ul trimite `X-Forwarded-For`, ca jurnalul de autentificări să rețină adresa reală a dispozitivului (normalizată fără prefixul `::ffff:`). **Verificat de pe adresa din rețea (192.168.8.163), nu localhost**: login prin `curl` → cookie → `/api/auth/me` 200 (401 fără cookie); login și navigare și în browser pe același origin; jurnalul a reținut `192.168.8.163` și dispozitivul. **Firewall**: nu a fost nevoie de modificare — există deja reguli „Node.js JavaScript Runtime” (TCP + UDP, `C:\Program Files\nodejs\node.exe`) pe profilul Public, iar Wi-Fi-ul calculatorului e pe profilul Public. Dacă rețeaua trece pe Private, e nevoie de o regulă nouă (comanda e în mesajul către Ionuț; se rulează de el, ca administrator — Claude nu modifică setări de sistem).
- Adresa de tastat pe tabletă (același Wi-Fi): `http://192.168.8.163:5173` — cât timp ambele servere rulează pe calculator și adresa IP nu se schimbă (DHCP).
- Teste: 29 verzi; build și lint web curate. ARH §13 completat cu tiparul de ecran și cu arhitectura de acces din rețea.

**Următorul pas propus:** neschimbat — S4 (liste de preț și import CSV cu ecran de diferențe). Ionuț verifică ecranele de pe tabletă și laptop; orice ajustare de aspect se face înainte de S4, pentru că ecranele acestea sunt tiparul.

---

## 2026-10-19 — Etapa 1, sesiunea S4: liste de preț și importul CSV

**Obiectiv:** versiuni de listă de preț pe compartiment (schiță / activă / arhivată, una activă), importul CSV din Zona tehnică în trei pași (analiză → ecran de diferențe → confirmare, apoi activare), raport pe fișier, prețuri manuale pentru Stoc. Plan aprobat cu șapte corecturi (categoriile pe potrivire exactă, erorile blochează / avertizările nu, set complet, împerecherea redenumirilor pe cod + rubrică + UM, raport comparat cu versiunea anterioară și fișierele brute păstrate, testele pe o bază separată, mărunte: loturi, formatul de import, secțiuni pliate și paginate, schiță anulabilă, istoric liniar).

**Rezultat:**
- **Migrarea 3** (`liste_pret_import`): pe listă — data activării / arhivării / anulării, fișierele sursă, raportul; status `ANULATA`; tabelul **propunere de import** (fișiere, diferențe, raport, erori, avertizări, rândurile normalizate, status propusă / confirmată / anulată, versiunea rezultată); **trigger de imutabilitate**: o listă arhivată nu acceptă nimic — nici pe prețurile ei (INSERT / UPDATE / DELETE), nici pe ea (UPDATE / DELETE); fără schemă hardcodată. **Migrarea 4** (`garantii_optionale`): `grosime` și `garantie_culoare_ani` opționale la garanții — rândurile de pluvial n-au grosime (se potrivesc pe finisaj), iar lipsa garanției la culoare (Magnelis, Aluzinc) înseamnă „fără garanție”, nu zero. Ambele generate cu `migrate diff`, citite integral, aplicate cu `migrate deploy` pe dezvoltare și pe schema de test.
- **Importul** (`server/src/modules/imp/`): formatul `bilka-v1` ales după `compartiment.formatImport`; fișierele recunoscute după coloane; citire CSV cu BOM și „;”, numere cu virgulă sau punct; rubricile potrivite exact pe denumire + două echivalențe (listele 08 / 09) + categoria dublă a tablei plane (două produse pe același cod: mp la Învelitori și coală de 2,5 mp, UM BUC, preț 2,5 × preț/mp, la Accesorii standard); identitatea produsului = `genereazaCodIntern`. **Analiza** nu scrie nimic: calculează diferențele față de catalog și față de lista activă (noi · prețuri modificate cu vechi → nou și % · câmpuri modificate · dispărute → inactive · redenumiri împerecheate pe cod furnizor + rubrică + UM, 1-la-1 · reapărute · grupuri / familii noi · tabelele de referință: apărute / dispărute / modificate / reapărute), raportul pe fișier (comparat cu versiunea anterioară; abaterile = avertizări), erorile (rubrică necunoscută, același produs de două ori, preț / UM necitibile, coloane lipsă, fișier nerecunoscut, set incomplet față de versiunea activă) și păstrează fișierele brute pe disc (`server/data/import/<propunere>/`, în afara git-ului). **Confirmarea**: o singură tranzacție (loturi de 500, timeout 180 s) — grupuri / familii noi, produse noi, redenumiri (denumire **și cod intern** noi, cu jurnal „codIntern: vechi → nou”, id și istoric păstrate), câmpuri modificate, dispărute inactive, reapărute active, tabelele de referință, versiunea ca schiță cu toate prețurile. Tabelele de referință se pot importa și singure (fără versiune).
- **Listele de preț** (`server/src/modules/lp/`): activare (arhivează automat versiunea activă; istoric liniar — o arhivată nu redevine niciodată activă; revenirea = reimport ca versiune nouă), anulare schiță, istoricul prețurilor unui produs, **preț manual** în versiunea activă (la Stoc se creează automat „Prețuri manuale”), totul în jurnal.
- **Ecrane**: „Liste de preț” (versiuni pe compartiment, activare / anulare, raport), „Import” (compartiment + fișiere, istoricul importurilor), **ecranul de diferențe** (erori blocante / avertizări, secțiuni pliate cu numărătoarea în titlu, tabele randate la deschidere și paginate câte 100, raportul pe fișier cu totaluri, formularul de confirmare cu denumire + valabilă de la, butonul „Activează versiunea”), raportul unei versiuni, secțiunea **„Preț de bază”** pe produs (prețul din versiunea activă, modificare manuală, istoric pe versiuni), „—” la grosimea lipsă în Garanții. Ajutorul paginii peste tot, după Capitolul 0 pct. 10.
- **Testele rulează numai pe o bază de test** (`DATABASE_URL_TEST`, cu „test” obligatoriu în numele bazei sau al schemei; migrări + TRUNCATE la pornire; refuz altfel). `ofertare_test` nu exista, deci s-a folosit varianta aprobată de rezervă: schema `test` din aceeași bază. **41 de teste verzi**, între care: importul celor 14 fișiere reale pe compartiment gol ⇒ 3.399 rânduri, **3.425 rânduri de preț**, 3.247 coduri distincte, 5 fără cod, 26 de perechi tablă plană, 2 inactive, 13 / 118 / **22** / 86 / 25 rânduri de referință (cele 4 garanții de pluvial recunoscute ca atare); reimport ⇒ zero diferențe și zero avertizări; un preț schimbat ⇒ exact o diferență (7,37 → 7,99); produs redenumit ⇒ pereche, același id, cod intern nou în jurnal, istoric de preț pe ambele versiuni; două active imposibil (prin activare și direct în bază); arhivata nemodificabilă (preț: update / delete / insert; listă: update, inclusiv reactivare); set incomplet ⇒ eroare blocantă; rubrică necunoscută / produs dublat / preț necitibil ⇒ erori; culori importate singure (dispărută → inactivă → reapărută); ruta de încărcare (agent 403); Stoc: preț manual cu „Prețuri manuale” și jurnal vechi → nou. Suita completă durează ~19 s.
- **Catalogul real e în aplicație**: `07-sipca-gard.csv` curățat de Ionuț (83 de rânduri „Șipcă gard”, inclus în commit); importul pe baza de dezvoltare a mers prin aceleași rute ca ecranul (analiza 1 s, confirmarea 2 s): 3.425 de produse, versiunea **„Bilka v10 — septembrie 2026”** activă, cele 5 tabele de referință încărcate. Prima confirmare a eșuat cu „eroare neașteptată”: serverul pornit rula clientul Prisma dinainte de migrarea 4 (nu se repornise) și respingea grosimea goală; tranzacția s-a derulat înapoi integral, serverul a fost repornit cu clientul regenerat, a doua confirmare a reușit. Lecție: după o migrare, serverul de dezvoltare se repornește.
- ARH §13: istoric liniar și imutabilitate în bază, cei trei pași ai importului, set complet, identitatea și redenumirea, prețurile numai în versiuni, garanțiile opționale, testele doar pe bază de test.
- Lăsat deliberat: răspunsurile 404 ale serverului pentru rute API inexistente sunt HTML (Express implicit), nu JSON — de uniformizat când apare nevoia; avertismentele de stil din lint rămân cele din S3.

**Următorul pas propus:** Etapa 1, sesiunea S5 — firme și utilizatori (CON minim): firme cu date și siglă (`docs/import/firme.csv`, `docs/design/sigle/`), utilizatori cu rol, firmă, serie de ofertă, adaos % cu istoric; export „descarcă tot”. Înainte: Ionuț se uită la catalogul real în aplicație (produse, liste, raportul importului) și la ecranul „Garanții” cu rândurile de pluvial.

---

## 2026-10-22 — Etapa 1, sesiunea S5: firme, utilizatori (CON minim), export „descarcă tot”, pornire cu dublu-clic

**Obiectiv:** firme (cu siglă), utilizatori pe cele șase roluri cu regulile din FISA-CONTURI, pagina proprie a contului, blocarea după încercări greșite, exportul „descarcă tot” cu restaurare, `pornire.cmd`. Plan aprobat cu cinci completări (exportul ia tot folderul de date; jurnal pe orice câmp de firmă / utilizator și fără valori la parole; sigla după id-ul firmei; firma nu se dezactivează cu utilizatori activi; restore acceptă exporturi mai vechi și refuză mai noi).

**Rezultat:**
- **Migrarea 5** (`firme_utilizatori_securitate`, aditivă): la firmă — plătitor TVA, localitate, județ, bancă, observații (ce lipsea față de `firme.csv`); la utilizator — „parola trebuie schimbată”, contor de încercări eșuate, „blocat până la”; rezultatul „BLOCAT” în jurnalul de autentificări. Generată cu `migrate diff`, citită integral, aplicată pe dezvoltare și pe schema de test.
- **Login** (`accounts/routes.ts`): blocare 15 minute după 5 încercări greșite consecutive (răspuns 423 cu mesaj clar; contorul se șterge la conectare reușită; blocările în jurnal); răspunsul către cont nu conține adaosul %. **Pagina proprie** (`/api/cont`, orice rol): schimbarea parolei (cu cea veche, minim 10) și ultimele 10 conectări; parola pusă de altcineva **se schimbă obligatoriu la prima conectare** (ecran dedicat, înainte de orice).
- **Firme** (`accounts/firme.ts`): Admin general — creare / editare integrală, sigla JPG / PNG ≤ 2 MB în `server/data/sigle/<id>.<ext>`; Administratorul — doar firma lui, doar datele de contact; dezactivarea refuzată cât timp există utilizatori activi (409, nu cascadă); jurnal pe fiecare câmp.
- **Utilizatori** (`accounts/utilizatori.ts`): Admin general creează orice rol în afară de Admin general (unic, din seed); Administratorul doar Agenți / Colaboratori pe firma lui (firma impusă de server, legătura administrator → subordonat automată) și adaosul propriu; Contabilitate / Gestiune cu acces general sau pe firme; seria 2–3 litere unică și obligatorie la cine face oferte; e-mail unic; parola inițială ≥ 10 pusă de creator (apoi schimbată la prima conectare); resetarea parolei de superior; conturile se dezactivează (login refuzat, sesiune moartă), nu se șterg; contul de rezervă (`ADMIN_REZERVA_EMAIL`) marcat și neatins din ecran; jurnal pe fiecare câmp (inclusiv accesul pe firme), fără valori la parole. Zona tehnică: Admin general integral; Administratorul doar „Firma mea” și „Utilizatori”; restul rolurilor — 403 pe tot `/api/adm`, cu doar „Contul meu”.
- **Export „descarcă tot”** (`adm/exportDate.ts`, buton în Zona tehnică): ZIP cu câte un CSV per tabel (coloanele luate din schema Prisma, 18 tabele; utilizatorii fără parole; propunerile de import fără rândurile brute), `_sistem/parole.csv` cu hash-urile, tot folderul de date (sigle + fișierele brute ale importurilor), README cu data, formatul (1), versiunea softului și numărătorile; fiecare export în jurnal. **Restaurare** (`npm run restore -- <zip>`, `adm/restaurare.ts`): numai pe bază goală, refuză exporturi mai noi, acceptă mai vechi (coloanele noi iau valorile implicite), păstrează id-urile, pune statusurile listelor după prețuri (trigger-ul de imutabilitate), repune fișierele.
- **`pornire.cmd`** în `D:\SOFT` (fără drepturi de administrator): verifică serviciul `postgresql-x64-17`, pornește serverul și interfața în două ferestre cu titlu doar dacă porturile 4000 / 5173 sunt libere, deschide browserul după 6 secunde; CRLF, fără diacritice (fișier de consolă). **De încercat de Ionuț cu dublu-clic.**
- **Ecrane**: Firme (listă, formular complet / de contact, sigla), Utilizatori (listă pe roluri, formular dependent de rol, resetare parolă, dezactivare), Contul meu (parolă, conectări), Export, ecranul de schimbare obligatorie a parolei; meniul pe roluri; utilizatorul conectat într-un context React (`contextUtilizator.tsx`) — prima variantă, prin contextul rutelor, dădea pagini albe. Verificat în browser: listele de utilizatori (cu contul de rezervă marcat) și de firme, contul meu.
- **Teste: 54 verzi** (13 noi): Agent / Colaborator → 403 pe toate rutele Zonei tehnice și fără adaos în răspunsuri; Administratorul nu creează firme / Administratori, nu vede utilizatorii și firmele altei firme (nici prin id), își modifică doar contactul firmei (cu jurnal); serie 2–3 litere unică, e-mail unic, parolă scurtă refuzată, serie obligatorie; Agent creat de Administrator → prima conectare cere parola nouă; adaosul (pe subordonat și pe sine) lasă jurnal dinainte / după; cont dezactivat → 401, nimic șters, jurnal; firma cu utilizatori activi → 409; blocare după 5 încercări (și cu parola corectă), deblocare după expirare; contul de rezervă → 409, al doilea Admin general → 400; Contabilitate cu acces pe două firme, firmă cu toate câmpurile; export cu toate tabelele și numărătorile egale cu baza, parolele separat, fișierele; **export → bază goală → restore** pe schema `test_restore` ⇒ aceleași numărători, firme, utilizatori (cu hash-uri), produse, liste (cu statusuri), suma prețurilor, jurnal; refuz pe bază negoală și pe export mai nou. Suita: ~35 s.
- Lecții: `archiver` 8 e un rescris ESM cu alt API — fixat pe 7.x (clasic, CommonJS); contextul `Outlet` din react-router nu ajungea la pagini — înlocuit cu un context React propriu.
- ARH §13: conturile și securitatea, sigla pe id, exportul / restaurarea (Administratorii — Etapa 3, fără parole), pornirea cu dublu-clic. PLAN v0.5 (scris de Claude chat) inclus în commit.

**Următorul pas propus:** Ionuț încearcă `pornire.cmd`, își creează din ecran cele două firme (cu sigla Roofshop) și conturile reale; apoi Etapa 1, sesiunea S6 — verificare și înghețare: lista de acceptare, backup local de probă + restaurare de probă (cu `npm run restore`), eticheta `v0.1-fundatie`, ARH §4.1 / §4.2 / §6 → ÎNGHEȚAT.

---

## 2026-10-22 — BUG · ADM · „Descarcă tot” nu se termina

**Acum:** butonul rămânea pe „se încarcă”; în `server/data/_temp/` s-a găsit un ZIP de 2,96 GB încă în creștere.
**Cauza:** ZIP-ul temporar se scria în folderul de date, iar exportul arhivează tot folderul de date — se citea pe sine la nesfârșit. În teste nu s-a văzut pentru că acolo ZIP-ul se scria în folderul temporar al sistemului.
**Reparat:** ZIP-ul se scrie în folderul temporar al sistemului și se șterge după descărcare; `_temp` e exclus oricum din export; numele fișierului e `export-AAAA-LL-ZZ.zip`. Verificat cu client real (curl), direct pe 4000 și prin proxy-ul interfeței: 752 KB în sub o secundă, `Content-Disposition: attachment; filename=export-2026-10-22.zip`, `Content-Type: application/zip`, `Content-Length` egal cu dimensiunea, ZIP valid (48 de intrări, fără ZIP în ZIP), nimic rămas în folderul de date. Test nou care descarcă ZIP-ul prin HTTP și îi verifică antetele și conținutul (și 403 pentru agent); pus ultimul în fișier, pentru că descărcarea scrie în jurnal și ar strica comparația restaurării. 55 de teste verzi.

---

## 2026-10-22 — Etapa 1, sesiunea S6: verificare și înghețare (`v0.1-fundatie`)

**Obiectiv:** parcurgerea listei de acceptare (`docs/ACCEPTARE-ETAPA-1.md`, rândurile „Code (S6)”), secretele, restaurarea exportului real, documentația la zi, înghețarea ARH §4.1 / §4.2 / §6, eticheta. Nimic nou construit.

**Rezultat:**
- **A3 — secrete:** niciun fișier `.env` comis vreodată (toate ramurile); nicio parolă, cheie privată, token sau adresă de conectare cu parolă în fișierele curente sau în tot istoricul git — singurele potriviri sunt în `server/.env.example`, cu `PAROLA` ca substituent; cele două parole reale văzute în sesiune (cea a lui `postgres`, cea din `.env`), rolul `ofertare` și secretul de sesiune: zero potriviri în depozit și în istoric. `server/data/` și `server/data-test/` ignorate. ✔
- **A6:** lecția „serverul de dezvoltare se repornește după migrare” e în JURNAL (S4); `pornire.cmd` pornește direct serverul și interfața, fără pași în plus. ✔
- **E2 — restaurarea exportului real** `D:\SOFT-BACKUP\export-2026-10-22.zip` (752 KB, descărcat de Ionuț la 15:54), pe schema goală `test_restore_real`, cu folderul de date într-un loc temporar. Comparație tabel cu tabel cu baza de dezvoltare: firma 2 / 2 · utilizator 5 / 5 · utilizator_firma 0 / 0 · compartiment 1 / 1 · categorie_oferta 9 / 9 · grup 27 / 27 · familie 279 / 279 · produs 3.425 / 3.425 · lista_pret 1 / 1 · pret_lista_produs 3.425 / 3.425 · varianta_profil 13 / 13 · culoare_finisaj_grosime 118 / 118 · garantie_finisaj_grosime 22 / 22 · lista_implicita_oferta 86 / 86 · treapta_desfasurata 25 / 25 · import_propunere 2 / 2 · jurnal_autentificare 16 / 16 · **jurnal_intrare 4.012 / 4.011** — diferența e rândul pe care exportul îl scrie despre sine (12:54:39.826) după ce ZIP-ul e gata (12:54:39.850), deci nu poate fi în ZIP: așteptat, nu defect. Eșantion: 20 de produse (din 20 în 20, pe cod intern) cu prețul din versiunea activă — identice; firmele cu toate câmpurile — identice; utilizatorii fără parole (e-mail, rol, firmă, administrator, serie, adaos, acces, activ) — identici, și hash-urile — identice; versiunea „Bilka v10 — septembrie 2026” ACTIVĂ — identică; suma tuturor prețurilor 26.468,73 — identică; 28 de fișiere repuse. ✔
- **BUG găsit la E2 și reparat** (mic, cu test): prima restaurare a căzut la tabelul propunerilor de import — coloana `randuri` (rândurile brute, mari) e exclusă din export, dar e obligatorie în schemă. Acum la restaurare primește o valoare goală marcată „restaurat”, iar confirmarea unei asemenea propuneri e refuzată explicit (se reîncarcă fișierele). Testul automat de restaurare nu prindea sigur cazul (depindea de ordinea fișierelor de test); acum își creează mereu o propunere. Lista de acceptare și-a făcut treaba.
- **Observație pentru D1 (rând al lui Ionuț):** nici baza, nici exportul nu conțin vreo siglă — `logo` gol la ambele firme, fără `data/sigle/`, fără rând de jurnal; încărcarea siglei Roofshop nu a ajuns pe server. Ruta e verificată separat prin test automat nou cu sigla reală din `docs/design/sigle/` (fișier pe disc sub id-ul firmei, jurnal, tip greșit refuzat, Administrator 403): funcționează. De reîncărcat de Ionuț din ecran („Firme” → „Editează” → „Încarcă sigla”); dacă nu merge din ecran, e cerere BUG pe interfață.
- **F1 / F2:** JURNAL are intrări pentru S1–S6; PLAN v0.6 cu S6 GATA; ARH §4.1, §4.2, §6 → **ÎNGHEȚAT** cu nota „doar prin cerere MODIFICARE: întâi testul, apoi codul”, decizia și constatările în §13.
- **F3:** 56 de teste verzi (una nouă pentru siglă, una întărită pentru restaurare); commit; eticheta adnotată `v0.1-fundatie`; push cu etichete.
- Curățenie, la cererea explicită a lui Ionuț: schema `test_restore_real` și folderul temporar de date (copie a datelor reale, cu hash-uri) șterse după scrierea acestui raport.
- Rămâne deschis (nu blochează): căile absolute din `fisiere` la propuneri și versiuni (informative) — de trecut pe căi relative înainte de VPS; rândurile „Ionuț” rămase ○ în lista de acceptare (A1 la rece, B5, C4, D5, D9 conectări, E1, E4) se bifează de el.

**Următorul pas propus:** Etapa 2 — Motorul de calcul (MOT + ETALON), sesiunea S7: formatul ofertelor etalon și primele 3 oferte transcrise ca teste. Precondiții de la Ionuț: ofertele etalon (document v4.1 + intrări), adaosurile țintă implicite pe categorie, formula de achiziție confirmată.

---

## 2026-10-23 — Verificare: baza de date = CSV-urile Bilka = facturile (doar citire)

**Obiectiv:** aceeași verificare pe care Claude chat a făcut-o pe CSV-uri (`docs/VERIFICARE-FACTURI-BILKA.md`), repetată pe baza de date reală, ca să fim siguri că baza e exact CSV-ul. Nimic modificat în bază, fără migrări, fără schimbări în aplicație.

**Rezultat:** script reutilizabil `server/scripts/verifica-catalog.ts` (`npm run verifica:catalog`), doar SELECT pe baza de dezvoltare. Valorile (preț, denumire, UM, activ) se compară din textul brut al CSV-urilor, citit separat; din cititorul de import se folosesc doar regulile structurale (rubrica, codul intern, derivarea coalei) — ca o eventuală greșeală a cititorului să fie vizibilă, nu ascunsă în ambele părți.
- **Catalog ↔ bază:** 3.399 rânduri CSV → 3.399 produse găsite după codul intern + 26 de produse-coală (Accesorii standard, BUC, 2,5 × preț/mp) = 3.425, exact câte sunt în bază, fără produse în plus; denumire, UM, rubrică, activ și prețul din versiunea activă „Bilka v10 — septembrie 2026” (3.425 prețuri) identice pe toate; cele 5 tabele de referință rând cu rând (13 + 118 + 22 + 86 + 25 = 264) identice. **Zero diferențe.**
- **Facturi ↔ bază:** 259 de rânduri din 21 de facturi (246 produse + 13 ambalaj); produsul găsit după cod furnizor + denumire (la `multiplicator = 2.5`, produsul-coală); preț așteptat = preț activ × cursul facturii, rotunjit la ban. **237 identice · 2 la 1 ban (coala, rotunjirea Bilka) · 7 diferite, toate pe factura 9002504593 (eroarea Bilka la accesoriile 8019 mat) · 0 negăsite** — exact raportul lui Claude chat. Rezultatul rând cu rând, cu codul intern, prețul din bază în EUR și lei, diferența și verdictul: `docs/verificari/facturi-bilka-2026-10-verificare-baza.csv`.
- Concluzie: baza de date reproduce CSV-urile la literă, iar prețurile din bază înmulțite cu cursul facturii dau prețul plătit — baza de achiziție pentru Etapa 2 e certă. Scriptul se reia la fiecare listă nouă, cu facturi proaspete. Testele existente: 56 verzi.

## 2026-10-27 — S7: fundația motorului de calcul (MOT) și etalonul ca teste

**Obiectiv:** structura motorului de calcul ca funcții pure, aritmetica zecimală cu rotunjirile din ETALON, încărcătorul ofertelor-model și câte un test pentru fiecare din cele 11 etaloane aprobate (E01–E11). Nicio regulă de preț încă — acestea vin la S8–S10.

**Rezultat:**
- `server/src/modules/mot/`: `zecimal.ts` (decimal.js 10.6.0, half-up, 2 / 3 / 4 zecimale, curs de achiziție BNR × 1,01, conversii EUR ↔ lei, desfacerea TVA), `tipuri.ts` (intrarea și ieșirea motorului, derivate din fișierele etalon v1.1, cu validare zod), `calcul.ts` (schelet: validare, curs de achiziție, cantități declarate, baza din catalog; prețurile „0.00”).
- Încărcătorul etalon (`server/tests/etalon/`): prețurile de bază și lățimile vin din CSV-urile Bilka (cod + denumire exactă, coala derivată), nu din blocul „asteptat”; rezultatul motorului se traduce în forma blocului „asteptat” și se compară cifră cu cifră, cu raport pe cale (așteptat | obținut). Toate cele 58 de coduri din etalon s-au găsit în catalog, prețurile și lățimile coincid; câmpurile v1.1 (`invelitoare`, `culoare`, `pret_fix`) sunt citite.
- Teste: `npm test` — **92 verzi** (56 existente + 24 rotunjiri / conversii + 12 încărcare etalon, printre care cursul de achiziție din „asteptat” se regăsește la toate cele 11). `npm run test:etalon` — **11 roșii, așteptat**, cu numărul diferențelor rămase: E01 128 · E02 126 · E03 65 · E04 128 · E05 127 · E06 29 · E07 138 · E08 181 · E09 126 · E10 18 · E11 144. `npm run test:toate` le rulează pe amândouă.
- ARH §13: intrarea S7 (prioritatea fișei și a etalonului peste §5, cu diferențele a–h, inclusiv decizia din 04.09.2026: ml → buc abandonat, accesoriile strict la bucată). Fără migrări, fără schimbări în catalog, prețuri sau conturi; serverele au rămas oprite.
- În commit intră și `docs/ETALON.md`, `docs/etalon/E01–E11.json` (v1.1) și `docs/FISA-OFERTARE.md` v1.1, scrise de Claude chat, neatinse.

**Următorul pas propus:** S8 — cantitățile: mp din panotaj (Σ lungime × bucăți × lățime totală, 3 zecimale), suprafață directă și combinată, ml din lungime × bucăți, șipca în ambele variante (Comandă / Calcul); primele diferențe din raportul etalon („intrari.*”) trebuie să dispară.

## 2026-10-27 — S8: cantitățile și structura ofertei în MOT

**Obiectiv:** S8 din PLAN v0.8 — cantitățile (învelitori, accesorii la lungimi, șipcă), comandabil, dripstop, UM normalizată, validarea intrărilor, pachetele și formularele Bilka. Nicio regulă de preț (S9–S10).

**Rezultat:**
- `server/src/modules/mot/cantitati.ts`: mp din panotaj (Σ lungime × bucăți × lățime, 3 zecimale half-up, o singură rotunjire), coli, suprafață directă și combinată, ml din poziții, șipca în ambele variante (Calcul: 11.000 ÷ 117,9 = 93,3 → 94; 0,70 m → 6; E06: 100 buc, 120,000 ml), comandabil cu motive, avertizarea dripstop (T18 / T35 / T45 sub 40 mp, pe câmpul `optiune`), UM normalizată. Lățimea tablei plane (1,25) o dă apelantul, din varianta din catalog.
- `server/src/modules/mot/pachete.ts`: cele trei reguli de împachetare, pluvialul per finisaj + culoare, secțiunile de sine stătătoare, formularele cu textul pentru agent; numele pachetelor derivate din catalog („P2 — Retro Plus 7016 mat”, cum s-a decis). `tipuri.ts`: validare zod cu intrări imposibile refuzate; `calcul.ts` leagă cantități → pachete.
- Etaloanele v1.2 (panotajul din E01 și în E02 / E04 / E05 / E07 / E08 / E09, `asteptat.comandabil`, `mp_invelitori`) se citesc; încărcătorul dă motorului grup / familie / opțiune din CSV.
- Teste: `npm test` — **127 verzi** (92 + 24 cantități + 11 pachete; încărcarea etalonului actualizată la v1.2). `npm run test:etalon` — 11 roșii, **numai diferențe de preț** (cantitățile, mp-ul învelitorilor, șipca, comandabil, pachetul fiecărei linii, pachetele și formularele din E11 coincid): E01 126 · E02 126 · E03 62 · E04 128 · E05 127 · E06 23 · E07 138 · E08 181 · E09 126 · E10 18 · E11 106.
- ARH §13: intrarea S8. În commit: PLAN v0.8, ETALON.md v1.1, etalon/E01–E11 v1.2 (Claude chat, neatinse). Fără migrări, fără schimbări în catalog, prețuri sau conturi; serverele oprite.

**Următorul pas propus:** S9 — cele trei straturi de preț (achiziția contului cu grupa, ținta în lei, prezentarea în cele trei moduri cu calculul invers la leu, restul de rotunjire și abaterea, garda) și ecranul tehnic „Calcul de probă”; numărătorile de mai sus trebuie să ajungă la zero pe E01, E04, E05, E08, E11 (fără preț fix, variantă, completare sau colaborator).

## 2026-10-27 — S9: cele trei straturi de preț în MOT și ecranul „Calcul de probă”

**Obiectiv:** S9 din PLAN v0.9 — achiziția contului cu grupa, ținta în lei, documentul în euro, prezentarea în cele trei moduri cu prețuri fixe, restul de rotunjire și abaterea, totalul în lei, garda, vânzările; plus ecranul tehnic „Calcul de probă” pe catalogul real.

**Rezultat:**
- Înainte de cod, regulile au fost verificate numeric pe toate etaloanele; au ieșit două precizări acceptate de Ionuț și scrise de Claude chat în ETALON R2 / R4 (rotunjirea o singură dată la achiziția în lei cu TVA; documentul în euro derivat din lei-ul fără TVA), plus corectarea E09 (adaosul păstrat ca procent cu 4 zecimale pe lanțul rotunjit: țintă 20.972,64).
- `server/src/modules/mot/preturi.ts` (achiziție, totaluri pe linie, țintă, document, total în lei, gardă, vânzări), `prezentare.ts` (trei moduri, prețuri fixe, repartizarea restului, abaterea), `etalon.ts` (maparea etalon → intrare, comună testelor și ecranului), `routes.ts` (`/api/mot`, doar Admin general), `calcul.ts` leagă tot lanțul.
- Ecranul `web/src/pages/CalculProba.tsx` (Zona tehnică → „Calcul de probă”): curs BNR manual, cont, grupă, mod de prezentare, țintă, produse căutate în catalogul activ cu cantități (panotaj sau mp direct, buc, ml), învelitoarea de care aparțin, RAL, preț fix, discount pe linie; „Încarcă etalonul E0x” umple formularul din fișier cu prețurile din bază; rezultatul pe loc (linii, totaluri, marjă, abatere, gardă, pachete, textul formularelor). Nimic nu se salvează.
- Teste: `npm test` — **168 verzi** (127 + 17 prețuri + 13 prezentare + 11 API; testul E01 prin API dă 17.000,00 lei când catalogul Bilka e în baza de test). `npm run test:etalon` — **8 la zero** (E01, E02, E04, E05, E06, E08, E09, E11); rămân E03 4 (vânzările colaboratorului) · E07 11 (zona B în factură) · E10 4 (lucrarea recalculată) — toate pe partea de S10.
- ARH §13: intrarea S9. În commit: PLAN v0.9, ETALON.md v1.2, etaloanele rescrise (Claude chat, neatinse). Fără migrări, fără schimbări în catalog, prețuri sau conturi. Serverele pornite la final (`pornire.cmd` / preview).

**Următorul pas propus:** S10 — vânzările colaboratorului (cap. 19), zona B în tabelul de facturare și suplimentul (cap. 9), lucrarea cu completări (cap. 2b), variantele și „preia prețuri din oferta …” (11.7, 11.11); E03, E07, E10 la zero.

## 2026-10-28 — S10: restul regulilor motorului — toate cele 11 oferte-model la zero

**Obiectiv:** S10 din PLAN v0.10 — vânzările colaboratorului (E03), zona B cu supliment și tabel de facturare (E07), completarea și lucrarea recalculată (E10), varianta cu adaosul păstrat (E01 → E09), „preia prețuri din oferta …” (fără etalon, test propriu).

**Rezultat:**
- `server/src/modules/mot/`: `zonaB.ts`, `lucrare.ts`, `varianta.ts`, `preluare.ts` noi; `preturi.ts` cu baza pe linie și rândul Administratorului la colaborator; `prezentare.ts` cu modul fără țintă (preluare) și discountul explicit pe prețurile fixe; `tipuri.ts` cu ținta `preluata`, `completareLa`, `motivCompletare`, `preluataDin`, `pretFix.preluat`, `vanzari.tabel`; `calcul.ts` leagă tot.
- Regula totalului în lei al facturii (oferta + liniile preluate în lei cu TVA) confirmată de Ionuț și notată în ARH §13.
- Teste: `npm test` — **182 verzi** (168 + 14 pentru cele cinci puncte: colaborator, zona B inclusiv linia cu „conține TVA”, gardă refuzată pe o ofertă obișnuită la 0, lucrarea E01 + E10, varianta E01 → E09 cifră cu cifră, preluarea din E01 cu jumătate din cantități + coamă mare, preluarea din E08 cu discount per linie, renunțarea la preluare). `npm run test:etalon` — **11 la zero**.
- ARH §13: intrarea S10. În commit: PLAN v0.10 (Claude chat, neatins). Fără migrări, fără schimbări în catalog, prețuri sau conturi; serverele au rămas pornite.

**Următorul pas propus:** S11 — toate etaloanele verzi sunt; rămâne rescrierea ARH §5 după FISA-OFERTARE v1.1 și ETALON (R1–R8 + deciziile S7–S10), trecerea §5 în ÎNGHEȚAT și eticheta `v0.2-motor`; de hotărât cu Ionuț dacă S11 include și verificarea manuală prin „Calcul de probă” înainte de Etapa 3.

## 2026-10-28 — S11: ARH §5 rescris și înghețat, eticheta `v0.2-motor`

**Obiectiv:** sesiune de documentare și înghețare, fără modificări în codul motorului: ARH §5 rescris după FISA-OFERTARE v1.1 și ETALON v1.3 (deciziile S7–S10), harta funcțiilor publice din `mot/` pentru Etapa 3, §5 → ÎNGHEȚAT, eticheta `v0.2-motor`.

**Rezultat:**
- ARH §5 (5.1–5.9): regulile scrise ca reguli, cu trimitere la capitolul din fișă care le decide și la exemplul etalon care le probează; ce a fost abandonat sau înlocuit (ml → buc, „+1 % la curs +1 % [de confirmat]”) a dispărut; harta motorului listează `calculeazaOferta`, `agregaLucrare`, `construiesteVarianta`, `preiaPreturi` / `renuntaLaPreluare`, `construiesteIntrare`, tipurile de intrare / ieșire, aritmetica comună și `/api/mot`.
- §5 ÎNGHEȚAT cu aceeași regulă ca §4.1 / §4.2 / §6. ARH §13: intrarea S11.
- Dovada, rulată în sesiune: `npm test` **182 verzi**, `npm run test:etalon` **11 la zero**.
- În commit: ETALON.md v1.3 și PLAN v0.11 (Claude chat, neatinse). Eticheta `v0.2-motor` pe commit-ul sesiunii. Serverele au rămas pornite.

**Următorul pas propus:** Etapa 3 — ofertarea și documentele (OFE + DOC): ecranul de ofertă apelează motorul prin harta din §5.9; preluarea automată a cursului BNR; testele manuale ale lui Ionuț încep acolo.

## 2026-10-28 — S12: modelul ofertei și lista de oferte

**Obiectiv:** S12 din PLAN v0.12 — migrarea 6 (clienți, oferte, învelitori, linii cu snapshot, zona B, versiuni, istoric, atașamente, cursuri, contor pe serie), numerotarea continuă pe serie, cursul BNR cu regula orei 13:00, clienții cu deduplicare după telefon, ecranul „Oferte” și „+ Ofertă nouă”, ARH §4.3 rescris.

**Rezultat:**
- Migrarea 6 `20261028090000_ofertare_clienti_curs`: SQL-ul generat cu baza-umbră, citit integral (doar CREATE TYPE / TABLE / INDEX și chei străine), aplicat, clientul Prisma regenerat cu serverele oprite. Test care verifică pe textul migrării că e aditivă.
- Server: `modules/curs/` (regula 13:00 pură, preluare BNR + rezervă + istoric, planificator, `/api/curs`), `modules/ofe/` (clienți cu telefon normalizat, numerotare atomică pe serie cu contor setabil, vizibilitate pe roluri, `/api/oferte`, `/api/clienti`). Setări noi în `.env.example`: `TVA_PCT`, `ADAOS_TINTA_IMPLICIT_PCT`.
- Web: zona „Ofertare” (`Ofertare.tsx`), paginile `Oferte`, `OfertaNoua`, `OfertaDetaliu` (antet + client; produsele „vin în S13”, prețurile „în S14”), `ClientFisa`, `CursBnr` în Zona tehnică, contorul seriei în Utilizatori (Admin general). Agentul / Colaboratorul / Administratorul intră direct pe „Oferte”.
- Teste: `npm test` — **208 verzi** (182 + 10 regula cursului, parsare, telefon + 16 API: numerotare cu 10 creări simultane, cursuri înghețate și cazul offline, deduplicare după telefon, vizibilitate pe toate rolurile, răspuns fără adaos / preț de bază la Agent, antet și client cu jurnal, fișa clientului, contorul seriei, cursul prin API, migrarea aditivă). `npm run test:etalon` — 11 la zero (neschimbat).
- ARH §4.3 rescris, §13 intrarea S12. În commit: PLAN v0.12 (Claude chat, neatins). Nimic din `mot/`, catalog, prețuri sau conturi nu s-a modificat. Serverele repornite la final.

**De verificat de Ionuț:** conectare cu un cont de Administrator / Agent → „Oferte” → „+ Ofertă nouă” (clientul se autocompletează după telefon); Zona tehnică → „Curs BNR” → „Preia și istoricul” (prima preluare umple tabelul; până atunci oferta nouă cere un curs).

**Următorul pas propus:** S13 — editorul ofertei, zona produselor (cap. 3–10): cascada învelitorii din catalog, cele trei moduri de cantitate, rubricile cu listele implicite, rezultatul motorului pe loc (mp, coli, pachete, formulare, comandabil), salvarea cu snapshot.
