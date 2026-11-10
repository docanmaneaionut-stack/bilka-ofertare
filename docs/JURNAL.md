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

## 2026-10-28 — S13: editorul ofertei — zona produselor (reluat după pana de curent)

**Obiectiv:** S13 din PLAN v0.13 — cascada învelitorii din catalog, cele trei moduri de cantitate, rubricile în ordinea decisă cu listele implicite, accesoriile speciale, pluvialul, șipca, la lungimi, zona B, rezultatul motorului pe loc, salvarea automată cu snapshot, grupa, adresa lucrării pe ofertă (migrarea 7). Fără prețuri pe ecran.

**Pana de curent (~14:10):** fișierele scrise înainte erau întregi (compilau), migrarea 7 era aplicată; lipseau potrivirea a patru nume din lista de fixare (spray, corector, foliile — finisajul lor stă în „variantă”), apelurile API din web și toate ecranele. Reluat de acolo, fără a reface nimic.

**Rezultat:**
- Migrarea 7 (SQL citit integral: doar ADD COLUMN), catalogul pentru editor (`ofe/catalog.ts`), salvarea produselor cu snapshot pe server (`ofe/produse.ts`), mapperul ofertă → intrarea motorului (`ofe/intrareMot.ts`), rezultatul doar cu cantități și structură.
- Web: `pages/oferta/` — `Produse` (container cu salvare automată și indicator), `Invelitori`, `Rubrica` (standard și fixare, cu secțiuni pentru secundare și de sine stătătoare), `Speciale2ML`, `Pluvial`, `Sipca`, `Lungimi`, `ZonaB`, `Structura`; antetul primește adresa lucrării și localitatea.
- Corectura aprobată: capacul de coamă prin `categorie_oferta` (CSV-ul 01 corectat, în commit); Ionuț mută categoria celor 3 produse din Zona tehnică (Produse → Capac coamă lucios / mat / Grande Mat → categoria „Fixare și etanșare”).
- Teste: `npm test` — **219 verzi** (208 + 11: E01 prin API → 180,481 mp, 48 de coli, P1 cu 17 linii și Pluvial A, 2 formulare, snapshot cu preț de bază în bază dar nu în răspuns; a doua salvare fără dubluri; E06 → 100 buc, 120,000 ml; E11 → P1 / P2 / Pluvial A / Pluvial B și 4 formulare; cele 86 de rânduri din listele implicite rezolvate pentru cheile reale; cascada, căutarea, treptele, pluvialul, șipca fără prețuri; validări; drepturi; grupa și precizările; migrarea 7 aditivă). `npm run test:etalon` — 11 la zero.
- ARH §4.3 completat (adresa pe ofertă, mapperul 1:1, limitele motorului), §13 intrarea S13. În commit: PLAN v0.13 (Claude chat, neatins), CSV-ul 01 corectat. Nimic din `mot/`, catalog (din cod), prețuri sau conturi nu s-a modificat. Serverele repornite.

**De decis / de cerut ca MODIFICARE la nevoie (motorul e înghețat):** două învelitori cu același produs pe aceeași ofertă (culori diferite) nu se disting în motor; o singură rubrică de șipcă pe ofertă.

**De verificat de Ionuț:** o ofertă nouă → zona produselor: alege învelitoarea în cascadă, completează panotajul, listele implicite apar pe rubrici; totul se salvează singur; rezultatul de jos arată mp, coli, pachetele și formularele.

**Următorul pas propus:** S14 — prețurile în ofertă (cap. 11, 21): zona de țintă, modul de prezentare, prețurile fixe, garda, abaterea, totalurile, „Creează variantă”, „Preia prețuri din oferta…”, „Completare la…”, reîmprospătarea cursului, ecranul „Află preț”; testul de capăt E01 din ecran = etalon — prima verificare manuală a lui Ionuț.

## 2026-10-28 — S13b: MODIFICAREA M1 la motor (învelitori pe id, mai multe rubrici de șipcă) — `v0.2.1-motor`

**Obiectiv:** PLAN v0.14 S13b — cele două limite găsite la S13, rezolvate după regula ARH §8: întâi testul (ETALON v1.4: R9, E12, fișierele etalon în format v1.3, scrise de Claude chat), apoi codul. §5 rămâne ÎNGHEȚAT, cu M1 notată.

**Rezultat:**
- Pasul 1 (testul primul): încărcătorul etalon și cel al testelor pe formatul v1.3 — legătura prin id e singurul drum (linia învelitorii poartă și ea id-ul, fără căutare după cod). Baseline: 12 etaloane, toate roșii (motorul vechi nu știa id-urile și `sipci`).
- Pasul 2 (motorul, strict M1): învelitorile și rubricile de șipcă pe id, `sipci[]`, pachete de șipcă „Șipcă A — Oslo 7016 mat”, prima rubrică în primul formular, următoarele formular separat, validările legăturilor. **12 etaloane la zero** — E01–E11 cu cifrele neschimbate, E12 nou. Nimic altceva din motor nu s-a atins.
- Pasul 3 (baza, mapperul, editorul): migrarea 8 (indexul unic de pe șipcă → index simplu + coloana `ordine`; SQL citit integral, serverele oprite, nimic șters); oferta ține oricâte rubrici de șipcă; linia fiecărei învelitori e legată de ea prin id; editorul are „+ Adaugă rubrică șipcă” pentru fiecare model în plus, iar două învelitori cu același produs în culori diferite au fiecare secțiunile ei.
- Teste: `npm run test:etalon` — 12 la zero; `npm test` — **228 verzi** (219 + testele M1: motor și E12 prin API).
- ARH: §5.3 / 5.4 / 5.9 completate, §13 intrarea „MODIFICAREA M1”, paranteza din §4.3. În commit: PLAN v0.14, ETALON v1.4, cele 12 fișiere etalon (neatinse de Code). Eticheta `v0.2.1-motor`.

**De semnalat lui Claude chat (cosmetic, nu blochează):** în E01–E11 câmpul `format` începe tot cu „v1.1 (27.10.2026)” și descrie conversia v1.3 la coadă; E12 începe cu „v1.3”. Testul acceptă ambele.

**De verificat de Ionuț:** pe o ofertă „În lucru”: adaugă a doua învelitoare cu același produs în altă culoare, cu accesorii proprii → rezultatul arată P1 și P2; la Șipcă gard apasă „+ Adaugă rubrică șipcă” și completează al doilea model → „Șipcă A” și „Șipcă B”, textul formularelor spune că a doua merge pe formular separat.

**Următorul pas propus:** S14 — prețurile în ofertă (cap. 11, 21): zona de țintă, modul de prezentare, prețurile fixe, garda, abaterea, totalurile, „Creează variantă”, „Preia prețuri din oferta…”, „Completare la…”, reîmprospătarea cursului, ecranul „Află preț”; testul de capăt E01 din ecran = etalon — prima verificare manuală a lui Ionuț.

## 2026-10-28 — S14: prețurile în ofertă (zona de țintă, prezentarea, garda, varianta, preluarea, completarea, cursul, „Află preț”)

**Obiectiv:** PLAN v0.15 S14 — prețurile în ofertă prin API-ul real al ecranului, cu motorul neatins (apelat prin ARH §5.9); testul de capăt: ofertele-model construite din editor + prețuri dau exact cifrele etalon.

**Rezultat:**
- Migrarea 9 (doar tabelul `optiune_lista`), `npm run seed` idempotent din `docs/import/configurare/optiuni-liste.csv` (rulat pe baza de dezvoltare: 10 valori), README de instalare (migrări → seed → prima pornire; seed după restaurare), tabelul în export și în Zona tehnică → Referințe.
- Serverul: zona de prețuri cu normalizarea prețului fix, garda ca refuz 409 cu liniile vinovate, blocul `preturi` filtrat pe rol, varianta, preluarea și renunțarea, completarea, cursul, „prețuri vechi · recalculează”, „Află preț”.
- Ecranul: panoul „Prețuri” în pagina ofertei, „Creează variantă”, „Completare la această ofertă” (motiv din listă), versiunile cu „Fă-o curentă”, sursa clientului din listă, pagina „Află preț” lângă lista de oferte.
- Teste: `npm test` — **245 verzi**; `npm run test:etalon` — 12 la zero. Prin API: E01, E02, E04, E05, E08, E12 exact; E09 ca variantă; E10 ca completare cu lucrarea agregată; garda; filtrarea pe rol; preluarea; cursul; „Află preț”; listele.
- ARH §4.3 (Completări S14), §13; în commit PLAN v0.15 și etaloanele cu câmpul `format` aranjat (neatinse de Code).

**De semnalat:** legarea ulterioară a unei oferte existente ca completare (cap. 2b, „sau ulterior”) nu e făcută — se poate adăuga la S15, odată cu statusurile.

**De verificat de Ionuț (nu a existat cont de test în sesiune):** pe o ofertă cu produse: scrie totalul discutat (ex. 17.000) → totalurile și prețurile pe linii se refac pe loc; pune un preț fix pe țiglă („achiziție + 5 %”); încearcă o țintă sub achiziție → mesaj cu liniile colorate, valoarea revine; schimbă modul pe „listă + discount general” cu 25 %; „Creează variantă” și schimbă modelul; „Completare la această ofertă”; „Află preț” cu „clasic mat”.

**Următorul pas propus:** S15 — statusurile, istoricul, montatorul și trecerea în comandă (minim): cele 8 statusuri cu regula de ordine, „Acceptată” face varianta curentă, istoricul de la „Transmisă”, notițe și atașamente, montatori cu autocompletare, recomandarea, „Comandat” îngheață produsele și salvează rezultatul motorului + rândul de comandă minim.

## 2026-10-29 — S14b: MODIFICAREA M2 la motor (formularele Bilka) + repararea preluării cursului BNR — `v0.2.2-motor`

**Obiectiv:** PLAN v0.17 S14b — R10 (șase locuri de pluvial pe formular, o variantă de șipcă pe formular, lungimile fără formulare în plus), după regula §8: întâi testul, apoi codul; plus cauza reală a cursului BNR nepreluat.

**Rezultat:**
- Testul primul: etalonul cu fișierele v1.5 — 11 din 12 roșii pe `formulare_bilka`. Apoi `pachete.ts`, strict pasul formularelor; pachetele neschimbate. **12 etaloane la zero**: familia E01 1 formular, E11 2, E12 2, E06 / E10 1 formular fără învelitoare.
- `sistem` în contractul de intrare și în snapshot: migrarea 10 (coloana + UPDATE din catalog pentru liniile existente, nimic șters). Piesele comune „125 / 90 și 150 / 100” urmează grupul finisajului și culorii lor; singure, locul 125/90 — scris în ARH §5.4 ca regulă.
- **Cursul BNR — ce am găsit:** de pe server, `https://www.bnr.ro/nbrfxrates.xml` răspunde cu 200, dar cu **pagina HTML a BNR** (302 pe pagina principală pentru identitatea noastră; „Request Rejected” pentru cereri care imită un browser) — la fel fișierele anuale. Site-ul BNR refuză cererile automate; nu e internetul, firewall-ul sau un certificat. În codul nostru: (1) HTML-ul trecea prin parserul XML cu 0 cursuri și nu era eșec → rezerva nu pornea niciodată; (2) parserul rezervei lua **USD 4,8088** în loc de EUR 5,3495 (pagina are „EUR” într-un meniu înaintea valorii dolarului). Reparat: răspuns care nu e XML = eșec cu mesaj → rezerva cursbnr.ro, parser strict pe rândul EUR; pagina „Curs BNR” arată ultima încercare (când, sursa, reușit / eșuat, mesajul); manualul rămâne plasa de siguranță. Ordinea rămâne BNR întâi — când BNR redeschide XML-ul, revenim singuri la sursa oficială. Fișierele de diagnostic au fost șterse; concluzia e aici.
- Ecranul: rezultatul arată lista formularelor cu conținutul fiecăruia.
- Teste: `npm test` — **257 verzi**; `npm run test:etalon` — 12 la zero. ARH §5.4 rescris pe R10, §13 „MODIFICAREA M2”; în commit FISA-OFERTARE v1.2, ETALON v1.5, PLAN v0.17, etaloanele.

**De verificat de Ionuț:** Zona tehnică → Curs BNR → „Preia acum”: trebuie să apară „Preluate 1 cursuri (cursbnr.ro)” și, la „Ultima încercare”, mesajul că BNR n-a răspuns cu XML; pe o ofertă cu pluvial și o singură învelitoare, rezultatul spune „Se va genera 1 formular”.

**Următorul pas propus:** S15 — statusurile, istoricul, montatorul și trecerea în comandă (minim); odată cu statusurile, legarea ulterioară a unei oferte existente ca completare (cap. 2b).

## 2026-10-29 — S15: statusuri, istoric, montator, trecerea în comandă (minim) + lucrările de ecran

**Obiectiv:** PLAN v0.18 S15 — cele 8 statusuri cu istoric de la „Transmisă”, montatorul / recomandarea, notițe și atașamente, „Comandat” cu rezultatul motorului salvat și rândul de comandă minim, legarea ulterioară ca completare, meniul ⋯ din listă, lucrările de ecran cerute la verificarea E01. Motorul neatins.

**Rezultat:**
- Migrarea 11 (aditivă, nimic șters): avans, montator / recomandare și comision pe ofertă, rezultatul motorului salvat, tabelele montator, comanda (rândul minim), oferta_notita.
- Statusurile: orice ordine, cu revenire, cu istoric; doar „Comandat” ireversibil; „Avans luat” cere suma (0 permis); „Acceptată” face varianta curentă; alt agent primește 403.
- Istoricul: nimic cât e „În lucru”; de la „Transmisă” orice modificare (status, antet, client, produse, cantități, prețuri, sume, montator, legare) cu cine, când, înainte / după și mențiunile scrise sus pe pagină; intervențiile Administratorului cu numele lui; asteriscul roșu la sumele modificate, cu „Vezi istoric”.
- „Comandat”: blocat cât o învelitoare e în mp direct (cu motivele), îngheață antetul, clientul, produsele, cantitățile și prețurile; salvează rezultatul complet al motorului (de atunci se citește de acolo); creează rândul de comandă cu rezumatul după cap. 16 („Iberic 3005 mat 0,50 — 180.481 mp + T8 3005 mat 0,50 — 6.000 mp; sistem pluvial 3005 colorat (lucios); accesorii standard + …”), totalul, avansul și restul; avansul, montatorul, notițele și atașamentele rămân editabile.
- Montatori: lista fiecărui agent (nume și telefon obligatorii), văzută de el și de toți Administratorii, autocompletare pe ofertă, adăugare pe loc; comisionul ca sumă fixă cu istoric; nimic pe documente.
- Notițe (se adaugă, nu se rescriu) și atașamente (în folderul de date, cu nume, mărime, cine, când, descărcabile).
- Legarea ulterioară ca completare, din orice ofertă și după comandă, cu motivul; lucrarea agregată (E01 + E10 prin API). Copierea ofertei (număr nou, aceleași produse și prețuri, clientul schimbabil).
- Lista: totalul cu TVA și învelitoarea pe fiecare rând, eticheta „Avans luat” cu suma, meniul ⋯ funcțional; „PDF ▾” explică „vine în S16”.
- Ecran: săgețile ↑ ↓ și Enter între căsuțele de cantitate și rândurile de panotaj (Tab rămâne), zona produselor comprimată, niciun buton gri fără explicație, mesaj clar la „Ofertă nouă” fără curs.
- Teste: `npm test` — **266 verzi**; etalon — 12 la zero. ARH §4.3 (Completări S15), §13; în commit PLAN v0.18.

**De verificat de Ionuț:** pe o ofertă cu produse: pune „Transmisă” cu o mențiune → apare istoricul; schimbă o cantitate → intrarea cu înainte / după; „Avans luat” cere suma; „Comandat” pe o ofertă cu mp direct → mesajul cu motivele; pe una panotată → oferta devine doar citire, cu rezumatul comenzii; în listă, meniul ⋯ și avansul pe rând; în zona produselor, săgețile ↑ ↓ între cantități.

**Următorul pas propus:** S16 — documentele (cap. 13): PDF-ul de ofertă, rezumatul, oferta detaliată, tabelul de facturare, din rezultatul motorului (sau din cel salvat la „Comandat”), cu machetele din `docs/design/`; istoricul documentelor transmise.

## 2026-10-29 — S16: documentele PDF (ofertă, rezumat, detaliată, tabel de facturare, anexa „Supliment la ofertă”)

**Obiectiv:** PLAN v0.19 S16 — cele patru documente + anexa, după machetele aprobate și cap. 13, generate pe server din rezultatul motorului (sau din cel salvat la „Comandat”), păstrate ca documente ale ofertei, cu „Marchează ca transmis” în istoric. Motorul neatins; formularul Bilka rămâne S16b.

**Rezultat:**
- Motorul de PDF: Chrome-ul lui puppeteer (25.16.0, pinned), descărcat o dată la instalare; pe Windows fără descărcare, Edge-ul din sistem ca rezervă. Fonturile vin din proiect (Arimo, OFL, în `server/fonturi`), încorporate în șabloane — randare identică pe orice aparat, diacriticele nu depind de sistem.
- Migrarea 12 (aditivă): tabelul documentelor (tip, variantă, fișier, mărime, pagini, cine / când, transmis / canal). Fișierele în folderul de date al ofertei.
- Cele patru documente și anexa, după machete: antetul cu sigle, firma, agentul, clientul, SERIE-NR / DATA, fără valabilitate; benzile pe rubrică + cheie de culoare cu subtotal; coloanele după modul de prezentare; totalurile cu „Total în lei” (R6); subsolul cu garanțiile compuse din tabelul de garanții și „Curs EURO”; zona B doar în anexă, pe pagină nouă numerotată în continuare; detaliata cu panotaj și „Primit”; rezumatul pe blocuri; tabelul de facturare intern în lei cu liniile preluate și totalul din motor (E07: 19.238,50). Fără coduri, fără semnătură, fără ștampilă.
- Ecran: panoul „Documente” pe ofertă (generare, listă, descărcare, „Marchează ca transmis”), „PDF ▾” funcțional pe listă și pe ofertă.
- README și ARH §9: pasul `npx puppeteer browsers install chrome` la instalare și bibliotecile de sistem ale serverului Linux pentru Faza 3 (doar scrise).
- Teste: `npm test` — **277 verzi**; etalon — 12 la zero. Documentele verificate pe textul extras din PDF (totaluri, pagini, „Pagina x din y”, lipsa codurilor, anexa, rezultatul salvat, permisiunile).

**De verificat de Ionuț:** pe o ofertă cu produse, „PDF ▾” → Ofertă: se deschide PDF-ul (sigla firmei dacă e încărcată, benzile, totalurile, garanțiile în subsol); Rezumat; Ofertă detaliată (panotajul și căsuțele „Primit”); Tabel de facturare; pe o ofertă cu zona B, anexa pe ultima pagină; în panoul „Documente”, „WhatsApp” la un document → intrarea în istoric. Sigla furnizorului apare când există `docs/design/sigle/bilka.png` (sau .jpg).

**Următorul pas propus:** S16b — formularul de comandă Bilka (XLSM completat din pachetele și formularele motorului, cu macro-urile păstrate), după analiza hărții celulelor.

## 2026-10-29 — S16b: formularul de comandă Bilka (XLSM completat per formular, macro-urile păstrate)

**Obiectiv:** PLAN v0.20 S16b — un fișier .xlsm completat per formular (R10), din șablonul firmei, cu macro-urile Bilka intacte; harta celulelor derivată din șablon; produsele fără loc în avertizări; generarea de la „De comandat” și la „Comandat”; fișierele ca documente ale ofertei. Motorul neatins.

**Rezultat:**
- Pasul 0 (analiză): harta completă a șablonului v10 în `docs/FORMULAR-BILKA-HARTA.md` — celulele antetului, cele 28 de sloturi ale fiecărei învelitori și ale șipcii, rândurile de tinichigerie / auxiliare cu listele lor derulante, blocurile de pluvial (codul = numele definit al celulei de preț), foaia accesoriilor la lungimi, listele de finisaje / grosimi / culori / modele. Concluzia care a schimbat planul: formularul lucrează cu **nume SAP prescurtate**, nu cu codurile noastre, și regula nume → cod stă doar în VBA; potrivirea liberă a numelor nu e sigură → **tabela de corespondență** (aprobată de Ionuț).
- Migrarea 13 (aditivă): tipul de document „formular Bilka”, șablonul pe firmă (fișier, versiune, când, cine), numărul formularului și avertizările pe document, câmpul „montaj” pe învelitoare, tabela de corespondență.
- Scrierea arhivei fără bibliotecă: doar valorile celulelor de intrare și `fullCalcOnLoad`; tot restul, inclusiv `vbaProject.bin`, identic octet cu octet (hash în teste).
- Harta derivată din șablonul încărcat la fiecare generare; un șablon fără numele așteptate oprește generarea cu mesaj clar. Pluvialul după cod (138 / 138), specialele după treaptă, restul prin tabela de corespondență verificată pe listele șablonului.
- Conținutul per formular din pachetele și formularele motorului (la „Comandat” din rezultatul salvat); antetul cu SERIE-NR, localitatea lucrării și telefonul clientului; „Mesaj pt producție” rămâne al agentului.
- Șablonul per firmă: Zona tehnică → Firme → „Șablon formular Bilka” (.xlsm, verificat, versiunea din numele fișierului și data modificării, jurnal). Firma fără șablon → mesaj clar.
- Tabla cutată: câmpul „Montaj” (acoperiș / perete) pe învelitoare, dus în formular ca „T xx A / P”.
- Ecran: „Formulare Bilka (n)” pe ofertă de la „De comandat”, „Formulare Bilka” în meniul ⋯ al listei, panoul „Documente” cu formularele F1, F2… și avertizările, descărcare .xlsm; Referințe → „Formular Bilka” (tabela de corespondență).
- Teste: `npm test` — **284 verzi**; etalon — 12 la zero. Formularele verificate pe XML-ul citit din arhiva rezultată: E01, E11, E12, E03 (cu montaj), produs fără loc, „Comandat”, firmă fără șablon, permisiuni, fișier străin refuzat.

**De verificat de Ionuț (în Excel, fără trimitere reală):** Zona tehnică → Firme → încarcă șablonul (v10 din `docs/Liste` pentru Roofshop; `FORMULAR_PROROOF_COMP.XLSM` pentru Proroof); pe o ofertă „De comandat”, „Formulare Bilka (n)” → panoul „Documente” → descarcă `SERIE-NR-F1.xlsm` → deschide în Excel (acceptă macro-urile; recalculează singur): învelitoarea, lungimile, rândurile de accesorii, pluvialul cu culoarea blocului, șipca, foaia de accesorii speciale; apoi validarea codurilor cu macro-ul Bilka, **fără** trimiterea comenzii. Avertizările („Nu au loc în formularul Bilka: …”) apar pe ecran și pe document.

**De controlat în Referințe → „Formular Bilka” — cele 46 de rânduri „de verificat”** (hotărâte de Code, nu de Bilka): tabla cutată T 8 P / T 8 P VENTILAT / T 12 / T 18 / T 35 / T 45 (litera A / P din „Montaj”; TDT18 / 35 / 45 cu membrană dripstop); TPLAN cu cuvântul BUC → „TABLA PLANA 2.00*1.25” (tabla plană ca accesoriu); AOZ12 / AOZ20 → „OPRITOR ZAPADA 1.25 ML” / „2 ML” (lățimea 208 lipsește din numele Bilka); ACI31 / ACI41 → „COAMA UNG. INDUSTRIALA …”; ACL25 / 31 / 41 exterior / interior → „COLTAR EXT. / INT. INDUSTRIAL …”; ASTR2 / ASTR3 → „BORD. STREASINA RETRO …”; ABPO3 → „BORD. PER. ORIZ. RETRO 312MM”; ABPL2 → „BORD. PER. LATERAL RETRO 250MM”; ARPR3 convex / concav → „RUP. PANTA CONV. / CONC. RETRO 312MM”; AES60 / AES80 → „ELEMENT MIC / MARE SUPRAP. RETRO …”; APCOZ → „PIESA CONEC. OPR. ZAPADA RETRO”; AXSPRMAT400 → „SPRAY RETUS” (formularul alege lucios / mat după finisajul învelitorii); numele cu culoarea în ele, „{RAL}” = culoarea liniei: AXPIESTRUNI, BANDAAER501, BANDABCO531 / 523, BANDABIC075 / 100 / 150 / 300, BANDAFUM529, AXCOSVEN UNI / CLS / BLC / IBE / GOT / ROM / PLT (formularul are doar câteva culori pe fiecare; alta → avertizare).

**Fără loc în formular (avertizare, de completat manual în Excel):** pluvialul Aluzinc (37 de coduri), holțșuruburile zincate pe un formular cu învelitoare colorată, corectorul colorat, banda de etanșare expandabilă, a doua învelitoare secundară, peste 28 de lungimi sau 35 de rânduri la lungimi.

**Următorul pas propus:** după verificarea lui Ionuț în Excel: corecturile din Referințe (nu în cod); eventual MODIFICAREA M3 la motor (locurile de pluvial structurate pe formular); apoi Etapa 4 / 5 după PLAN.

## 2026-10-29 — S17a: pregătirea înghețării Etapei 3 (M3, exportul, lista de acceptare)

**Obiectiv:** PLAN v0.23 S17a — MODIFICAREA M3 la motor (conținutul structurat al formularelor), exportul cu toate tabelele noi și exportul de firmă pentru Administratori, rândurile „Code (S17)” din lista de acceptare; fără etichetă (vine la S17b, după verificările lui Ionuț).

**Rezultat:**
- **M3**, după §8: întâi testul pe structură (`mot-m3.test.ts`, 7 cazuri), apoi codul — fiecare formular Bilka poartă acum învelitorile, liniile, locurile de pluvial cu liniile lor, blocul de șipcă și foaia de lungimi, pe id-uri; textul rămâne pentru agent, etaloanele neschimbate. Generatorul formularului citește structura; împărțirea după text a rămas doar ca rezervă pentru rezultatele salvate la „Comandat” înainte de M3 (cu avertizare). Găsit cu ocazia asta și reparat în M3: linia unei șipci comandate pe lungimi era numărată la „accesorii la lungimi” în textul formularului.
- **G6 reparat** (cum ai hotărât): un nume din tabela de corespondență care lipsește din șablonul încărcat oprește generarea cu mesaj — numele lipsă și unde se corectează (Referințe → „Formular Bilka” sau șablonul potrivit în Zona tehnică → Firme); niciun fișier nu se creează. „Nu au loc în formularul Bilka” rămâne doar pentru produsele care prin natura lor n-au loc. Test pentru amândouă.
- **Exportul, formatul 2**: clienții, cursurile, contoarele, montatorii, ofertele cu toți copiii, documentele și comenzile intră în „descarcă tot” și în restaurare (legăturile ofertei către ea însăși în doi pași). Testul export → bază goală → restaurare → comparație acoperă toate tabelele noi, pe două firme.
- **Exportul de firmă** pentru Administratori: Zona tehnică → Export → „Descarcă datele firmei (ZIP)” — doar firma lor, fără parole, fără propunerile de import și jurnalul de autentificare, din fișiere doar ale firmei; restaurarea îl refuză (e copie de siguranță a firmei, nu a softului).
- **Lista de acceptare**: 31 de rânduri „Code (S17)” completate în coloana Status (✔ cu testul sau citirea care le acoperă); rândurile „Ionuț” neatinse; H6 rămâne pentru S17b. Nimic nu a picat în afară de G6, reparat în sesiune.
- Testul nou `migrari-aditive.test.ts` (H1): SQL-ul migrărilor 6–13 fără instrucțiuni distructive; seed-ul idempotent.
- Teste: `npm test` — **297 verzi**; etalon — 12 la zero.

**De verificat de Ionuț (rândurile lui din lista de acceptare):** G3 (formularul în Excel, celulă cu celulă, validarea codurilor fără trimitere), G6 (cele 46 de corespondențe în Referințe), H5 (3–5 oferte reale), documentele (F1–F4), restul rândurilor „Ionuț”. Dacă un nume din tabelă nu se potrivește cu formularul, generarea spune acum exact ce lipsește.

**Următorul pas propus:** S17b — remedierile găsite de Ionuț (ca cereri BUG), ARH §4.3 → ÎNGHEȚAT, eticheta `v0.3-ofertare` (și eticheta motorului pentru M3).

## 2026-11-03 — S17b: bugurile din verificarea lui Ionuț și foaia de import a formularului Bilka

**Obiectiv:** PLAN v0.25 S17b — lămurirea foii „Portal” (formule sau VBA), BUG-1…4 din `docs/CERERI-BUG-S17B.md`, textul butonului „Formulare Bilka”. Motorul neatins.

**Rezultat:**
- **Lămurirea VBA (doar citire, programul în folderul temporar; codul Bilka nu intră în depozit):** foaia „Portal” se umple din **cod VBA la salvare** (`Workbook_BeforeSave` → `ExportToPortal`: golește foaia și o rescrie din celulele formularului, un rând per produs cu codul de ierarhie compus de macro și perechile lungime / bucăți), nu din formule. Evenimente care rulează singure: la deschidere (bara de butoane, FORMULAR COMANDA activată), la salvare (Portal), la schimbarea **modelului de mână** în E23 (macro-ul rescrie numele accesoriilor pe coloana C după model și golește câteva rânduri), la modificarea foii Preturi (cache-ul prețurilor). Macro-urile cu nume: „Get Date SAP” (datele clientului din SAP), „Save Oferta / Comanda SAP” (trimit în SAP **direct din celule**, prin clasificare; nu citesc Portal), LogSap e doar foaia-jurnal; **nu există un macro „validare coduri”**. Prețul pe mp (R23) e o funcție VBA care compune codul de ierarhie din modelul scurt + finisaj + grosime și îl caută în ListaPret, după ce verifică combinația cu culoarea în COMBCUL; modelul scurt vine din AUX!B23 = model + **modul** + membrană. **Concluzie:** fișierul nostru e complet pentru butonul SAP din fișier (celulele se recalculează la deschidere cu macro-urile active), dar foaia Portal e la zi doar după o salvare din Excel → regula „deschide, verifică, salvează, trimite” (pe buton și mai jos). **Propunere, neconstruită:** la generare golim rândurile de date din Portal (ca un fișier trimis fără salvare să nu poarte comanda veche din șablon); S17c verifică prin automatizarea Excel ce ajunge în Portal după salvare. Detaliile în ARH §13.
- **BUG-2** — cauza era la noi (b): celula **modulului** (O22 / O35) rămânea goală la învelitorile plate și la tabla cutată (modele fără listă de modul în șablon), iar macro-ul Bilka nu formează cheia modelului fără modul → fără preț și fără clasificare SAP, nici la alegerea manuală (în șablonul gol O22 păstra „35 cm” de la modelul dinainte, de aceea acolo mergea). Listele de prețuri nu erau cauza: șablonul din 20.10 (acum la ambele firme) și copia „de zi” sunt identice pe ListaPret, COMBCUL și VBA; v10 din `docs/Liste` diferă pe ListaPret, dar are și el codul Retro Plus lucios 0,50. Reparat: modulul implicit al șablonului („35 cm”, cel mai mic din listele lui) scris când modelul n-are listă sau modulul catalogului lipsește din ea; test pe lanțul formulei prețului (R23 → `_FC_MODEL` → AUX1!E1 → AUX!B23 → E23 și O22) și pe valoare (Retro Plus, T 8 P, T 35 A). Pagina Firme arăta deja fișierul, data modificării, când și cine l-a încărcat. **Prețul real îl confirmă doar Excel — S17c.**
- **BUG-1** — tabela de corespondență are a treia cheie, **numele familiei**: „Corector colorat pentru acoperiș → CORECTOR” (rândul „SPRAY RETUS”, lista SPRAY RETUS / CORECTOR), ambele rânduri din catalog pe același rând, fără avertizare; spray + corector pe aceeași ofertă → al doilea la „Nu au loc în formularul Bilka … același rând în formular” (regula „pe alt formular” = **M4**, la S17d). De clarificat cu Bilka (d): macro-ul de export dă spray-ului și corectorului același cod (`AXSPR…000`).
- **BUG-3** — tabelul listelor implicite adus la CSV-ul din 30.10 prin import de referință (86 → 81: zincatele inactive, rândul Retro Panel nou, nimic șters); în cod: rândurile generale („toate învelitorile”) + rândurile categoriei învelitorii, editorul trimite categoria și la Fixare (secundarele cu categoria lor); teste pe 81, Retro Panel → `SURLINOX000` primul la plate, fără zincate, ordinea 35 / 20 / 55 / 70 / 19 / 35.
- **BUG-4** — răspunsul 400 spune **câmpul și motivul**, în română („Client · Telefon: conține litere”), și întoarce lista câmpurilor; ecranul arată motivul **sub câmp** (clientul la „Ofertă nouă” și pe ofertă, antetul, suma avansului, montatorul, discounturile și ținta la prețuri), restul formularelor mesajul compus. Verificat prin test pe API și prin compilarea ecranului; afișarea la câmp nu a fost văzută în browser (autentificarea de probă n-a fost permisă în sesiune) — **de verificat de Ionuț**.
- Butonul „Formulare Bilka”, panoul Documente și meniul listei: „Deschide fișierul în Excel, verifică-l și salvează-l înainte de a-l trimite”.
- Teste: `npm test` — **301 verzi** (297 + testele BUG-1…4); etalon — 12 la zero. Reparat pe drum: folderul de date al testelor (`data-test`) se golește la pornirea testelor, ca baza — se adunase la 485 MB și exportul „descarcă tot” din teste depășea limita de descărcare. În commit: PLAN v0.25, FISA-OFERTARE v1.3, CSV-ul listelor, CERERI-BUG-S17B (coloana Status), șablonul „de zi” din `docs/verificari/`, ARH §13.

**Pașii pentru agent (formularul de comandă Bilka):**
1. Pe oferta „De comandat”: „Formulare Bilka (n)” → panoul „Documente” → descarcă `SERIE-NR-F1.xlsm` (și F2… dacă sunt mai multe).
2. Deschide fișierul în Excel. Dacă apare bara galbenă „Activează conținutul / Enable content”, apas-o: fără macro-uri nu se calculează nici prețurile, nici foaia de import.
3. Verifică FORMULAR COMANDA: învelitoarea (tip, model, modul, finisaj, culoare, grosime), lungimile × coli, rândurile de accesorii și cantitățile, culoarea și cantitățile pluvialului pe foaia lui, șipca, foaia de accesorii speciale. Completează de mână ce scrie la „Nu au loc în formularul Bilka” în panoul Documente. **Nu schimba modelul din E23 de mână** — macro-ul Bilka rescrie atunci numele accesoriilor pe coloana C și pierzi rândurile puse de soft; dacă trebuie alt model, corectează oferta în soft și generează din nou.
4. Salvează (Ctrl+S) și închide: la salvare macro-ul Bilka umple foaia „Portal” din celule. Un fișier nesalvat în Excel are foaia Portal cu conținutul vechi din șablon.
5. Atașează fișierul salvat la e-mailul către Bilka. Nu apăsa „Save Comanda SAP” (trimite comanda direct în SAP).

**Următorul pas propus:** S17c — Excel ca arbitru, pe toate produsele (plan separat, aprobat separat): buclă în fundal pe calculatorul lui Ionuț, formular generat → deschis în Excel → recalculat → prețul pe rând și foaia Portal comparate cu catalogul; raport în `docs/verificari/formular-bilka-raport.md`. Apoi S17d: M4 (spray + corector pe formulare separate), golirea rândurilor din Portal la generare, ARH §4.3 → ÎNGHEȚAT, eticheta `v0.3-ofertare`.

## 2026-11-03 — S17c: Excel ca arbitru — scriptul și proba pe trei formulare

**Obiectiv:** PLAN v0.26 S17c — bucla „ofertă de test → formular → Excel (deschis, salvat) → Portal și prețuri → comparație cu catalogul”, ca script reluabil în fundal, cu raport pe patru categorii; întâi confirmarea că macro-urile automate nu ies pe rețea, apoi proba pe trei formulare, apoi bucla completă la ora dată de Ionuț. Motorul neatins.

**Rezultat:**
- **Confirmat în VBA** (codul extras în S17b, în afara depozitului): la deschidere rulează doar bara de butoane și activarea foii; la salvare doar rescrierea foii „Portal” din celule și funcțiile de calcul; evenimentele de foaie lucrează doar pe celule. Singurele apeluri în afara registrului sunt conectările SAP din „Get Date SAP” / „Save Oferta / Comanda SAP”, pornite numai din butoane. Nicio îndoială; concluzia stă și în raport.
- **`npm run verifica:formular`** (README): schema de test cu firmă, agent și catalog proprii; șablonul din folderul de date; planul pe chei de culoare cu loturi care încap pe formular și trecerea a doua pentru produsele de la avertizări; Excel invizibil cu macro-urile active doar pe instanța lui, deschidere, recalcul, **salvare**, citire, închidere cu limită de timp; comparația pe cod / cantitate / lungimi / cheie / preț; starea în `formular-bilka-stare.json`, raportul rescris din stare, reluabil; `--proba`, `--de-la-zero` (șablon nou), `--sablon`, `--toate-culorile`, `--limita`.
- **Găsit la probă și ocolit:** `CalculateFullRebuild` evaluează funcțiile VBA înaintea precedentelor și `pretts()` scoate un `MsgBox` („INTRODUCETI CURSUL VALUTAR”) care blochează instanța (T 35 a stat 90 s). Scriptul lasă Excel să calculeze la deschidere (fișierul are `fullCalcOnLoad`) și folosește `Calculate`; un formular durează acum ≈ 11 s (E01, cu pluvial: ≈ 50 s).
- **Proba (E01; Retro Plus Double Line lucios 0,50; T 35 acoperiș și perete):** 33 de produse corecte (cod în Portal, cantitate, lungimi, preț = catalog), printre care **BUG-2 confirmat în Excel**: REPROLUC050 → prețul 7,78 apare, modelul scurt „RETROPLUS DLINE”, Portal cu codul, 9,539 mp, 4,2 × 3 și 2,5 × 2. T 35: codul TCT35LUC050, modelul „T 35 A”, prețul 6,68. **(d) de clarificat cu Bilka:** spray-ul de retuș ajunge în Portal sub `AXSPRMAT000` (catalog `AXSPRMAT400`, preț egal 4,50); „SET COS FUM ( 4 PIESE )” ajunge în Portal **fără cod de ierarhie** — macro-ul Bilka n-are regulă pentru acest nume. **(c):** cele două coame industriale (312 și 417 mm) cer același rând al formularului. Nimic în (a) sau (b). Raportul probei: `docs/verificari/formular-bilka-proba.md`.
- Teste: neschimbate (scriptul nu e test vitest); `npm test` nu se rulează în același timp cu scriptul.

**De la Ionuț:** ora la care pot porni bucla completă (≈ 400 de oferte; estimat 1,5–2 ore, în fundal; Excel nu trebuie folosit în acel timp — orice dialog al unui macro blochează doar instanța scriptului, care e oprită după limita de timp, dar fiecare oprire costă 90 s).

**Următorul pas propus:** bucla completă, apoi raportul citit și S17d: BUG-urile noi din (b) în `CERERI-BUG-S17B.md`, numele propuse din (a) în Referințe, lista (c), întrebările (d) pentru Bilka; M4 (spray + corector pe formulare separate), golirea rândurilor din Portal la generare; ARH §4.3 → ÎNGHEȚAT, eticheta `v0.3-ofertare`.

## 2026-11-04 — S17c (continuare): bucla completă cu Excel ca arbitru

**Obiectiv:** bucla completă pe toate produsele active, în fundal (aprobată de Ionuț pe 03.11, 16:00: Excel închis până la final); raportul final cu rezumatul pe categorii și excepțiile; BUG-urile noi numerotate; ARH §13, JURNAL, PLAN; commit.

**Rezultat:**
- **938 de oferte de test, 4330 de verificări de produs** (fiecare produs activ, cu prima culoare a cheii; învelitorile pe variantă de profil și montaj, șipcile pe profil × capăt): **3612 corecte**, (a) 4, **(b) 0**, (c) 82, (d) 632, erori 0. Raportul: `docs/verificari/formular-bilka-raport.md` (rescris de script din stare; concluziile scrise de mână în `formular-bilka-concluzii.md`, pe care scriptul le include).
- **Reluări pe drum** (toate din stare, nu de la zero): (1) cele 106 oferte de șipcă erau refuzate de motor — scriptul trimitea pozițiile pe rubrica de șipcă, nu pe linie; (2) 224 de învelitori cu „nu apare în Portal” reluate cu diagnostic (celulele scrise + modelul compus de șablon) — toate completate corect, prețul 0 vine din tabelele șablonului; (3) trecerea a doua regrupată pe cheie de culoare, în loturi fără conflict de rând — rândul cerut se citește acum din segmentul produsului din avertizare (la început se lua primul segment), iar loturile cu listă de mărimi pe un rând (profil U, borduri Retro, calote, dolii Retro) s-au rezolvat strat cu strat, până la zero conflicte; (4) peste noapte calculatorul a intrat în repaus de câteva ori și sesiunea agentului a expirat → 139 de oferte „Autentificare necesară”; scriptul se re-autentifică singur și ține calculatorul treaz; (5) șipcile Berna / Haga / Sofia erau planificate de script fără tipul de capăt (fișa: profil × capăt, 8 modele) → reverificate pe ambele capete: 130 corecte, 36 la (d).
- **Niciun BUG nou în cod** (`CERERI-BUG-S17B.md` rămâne la BUG-1…4). Ce părea (b) avea cauze în script, în șablonul Bilka sau în catalog (produse fără cod Bilka).
- **(a)** 4 rânduri de Referințe: bandă etanșare expandabilă → `BANDA ETANSARE UNIVERSALA`; bordurile la perete SSAB 0,60 (coduri interne `BIL-…`, fără prefix Bilka) → `BORDURA LA PERETE 178 / 208 / 250 MM`.
- **(d)** opt tipare ale macro-ului Bilka (detaliate în raport): codul fără segmentul culorii la RAL 8003 (78, preț egal); specialele 2 ML și tabla plană Magnelis cu preț 0 (26); AML în RAL 8003 / Wood / Magnelis fără cod și preț (100); preț 0 la Wood, Magnelis, T12 DPL 0,40 / zincat 0,37–0,40, T35 / T45 DPL 0,40, Retro Panel Micro-Ribs / Flat cu dripstop / soundcontrol, Retro Duo Micro-Ribs dripstop, șipcile în RAL 8003 / Wood / Magnelis / SSAB 0,60 — combinațiile lipsesc din COMBCUL (336); Retro Duo dripstop mapat pe Retro Panel dripstop, cod și preț greșite în macro (41); set coș fum și colțar interior 312 fără cod de ierarhie (40); spray / corector cu `AXSPR…000` (4); sufixe diferite la închideri de coamă și opritoare omega (8).
- **(c)** pluvial Aluzinc (35, fără foaie), numele cu culoarea în ele (16, verificate doar cu culoarea cheii — neacoperite), subcoama industrială 312 (25, toate finisajele — nume acceptat de macro, dar pe niciun rând al formularului), holțșuruburi zincate pe formular colorat (6).
- Teste: `npm test` verde — 28 fișiere, 301 teste; scriptul nu e test.

**Următorul pas propus:** S17d — rândurile (a) în Referințe; întrebările (d) la Bilka (tiparele 1–8); M4 (spray + corector și a doua mărime a unui rând cu listă — pe formulare separate); golirea rândurilor din Portal la generare; ARH §4.3 → ÎNGHEȚAT; eticheta `v0.3-ofertare`.

## 2026-11-05 — S17d: închiderea Etapei 3 (M4, avertizări la trimitere, datele, Portal, înghețarea §4.3)

**Obiectiv:** PLAN v0.28 S17d — M4 la motor (întâi testul, apoi `pachete.ts`), avertizări pe produs din tabela de corespondență, rândurile (a) și corecțiile de date (Aluzinc, banda expandabilă), golirea rândurilor din Portal la generare, lista de acceptare (H6), ARH §4.3 → ÎNGHEȚAT, eticheta `v0.3-ofertare`. Aprobat de Ionuț cu cele cinci presupuneri (rândul cu listă e cel din șablon; etaloanele neatinse — altfel îi spun înainte; avertizările pe ecran, nu în Excel; dezactivare cu jurnal, nu reimport; nimic șters).

**Rezultat:**
- **M4** (`mot-m4.test.ts` întâi roșu — 6 din 7 —, apoi `pachete.ts`): orice rând cu listă ține o variantă pe formular; a doua pleacă pe primul formular cu aceeași cheie și rândul liber, altfel pe un formular nou cu cheia secțiunii; textul spune de ce. Ofertarea dă motorului rândul fiecărei linii din șablonul firmei (citit o dată, ținut în memorie) și tabela de corespondență, cu capacitatea rândurilor identice (specialele 2 ML). **Etaloanele neschimbate** (E01 → 1, E11 → 2, E12 → 2; 12 etaloane la zero) — niciunul n-are două variante pe același rând. Prin API: spray + corector → două fișiere, corectorul pe al doilea (formular fără învelitoare, cheia 3005 mat 0,50), fără avertizare.
- **Avertizări „atenție la trimitere”**: coloană nouă în tabela de corespondență (migrare aditivă, CSV, seed, Referințe); textul apare în răspunsul generării și în panoul Documente, sub formular — nu în Excel. Valori pentru Retro Duo dripstop (ambele variante), închiderea de coamă lucios / Grande Mat, spray-ul lucios.
- **(a)** cele trei borduri la perete SSAB 0,60 pe rândurile „BORDURA LA PERETE … MM”, cheiate pe codul intern. **Date**: `npm run date:activ -- --aplica` pe baza de lucru → **36 de produse inactive, fiecare cu intrare în jurnal** (banda expandabilă + 35 pluvial Aluzinc); a doua rulare: 0. Testele de import la 38 inactive; test propriu pentru sincronizare (idempotentă, fără reactivări automate).
- **Portal**: fișierul generat pleacă cu foaia „Portal” doar cu antetul; testul de arhivă verifică un singur rând și restul fișierului neschimbat octet cu octet (vbaProject.bin inclusiv).
- **Reverificare** cu `verifica:formular -- --doar-acelasi-rand`: cele 72 de oferte care avuseseră „același rând” ies acum pe 2–7 formulare, zero conflicte, zero erori; raportul final: 4318 verificări — 3623 corecte, (a) 0, (b) 0, (c) 47, (d) 648; avertizările „Atenție la trimitere” sunt informative pentru script (nu scot produsul din comparație). Testul „produs fără loc” folosește acum subcoama industrială 312 (Aluzinc nu mai există).
- **ARH §4.3 → ÎNGHEȚAT** (05.11.2026, `v0.3-ofertare`), §5 cu M3 / M4 în titlu, §5.4 cu regula M4, §13; H6 ✔ în lista de acceptare; BUG-1 cu M4 făcută. Rămân deschise rândurile „Ionuț” (H5 — ofertele reale) până la punerea în funcțiune.

## 2026-11-05 — S19: tabelul de comenzi (Etapa 5)

**Obiectiv:** PLAN v0.30 S19 — modelul complet al comenzii (extinderea aditivă a rândului din S15), comenzile manuale, ecranul „Comenzi” după machetă, cine vede / cine face după FISA-CONTURI §2–3, „Doc. ▾” din documentele ofertei, teste, ARH §4.4. Motorul și oferta (ÎNGHEȚATĂ la `v0.3-ofertare`) neatinse. Aprobat de Ionuț cu corectura: lista de comenzi e **comună** — Admin general și orice Administrator văd toate comenzile și schimbă statusul logistic pe toate; agentul lista firmei lui; colaboratorul ale lui; Contabilitatea și Gestiunea pe firmele setării lor; banii rămân pe firmă (S20); notițele și atașamentele ofertei se văd din comandă în citire.

**Rezultat:**
- **Migrarea 15** (aditivă; singura lărgire: legătura cu oferta devine opțională, cheia străină neschimbată): tip (din ofertă / manuală), contul alocat, clientul, momentul statusului, nota lipsurilor, momentul livrării, indicațiile de livrare cu cine și când, ziua livrării, datele de facturare; tabele noi pentru istoric, observații și atașamente. Aplicată pe baza de lucru.
- **Modulul `com`** (`vizibilitate.ts`, `comenzi.ts`): lista cu numărătorile din cap, căutarea (client, telefon, număr, localitate, montator), filtrele (status, perioadă, agent / neidentificate, firmă, „Arată și comenzile închise”), ordinea (invers cronologic; Livrat la sfârșit, ascuns implicit); detaliul cu istoric, observații, atașamente, documentele ofertei (formulare Bilka, detaliata, tabel de facturare — colaboratorul fără tabel), notițele și atașamentele ofertei în citire; comanda manuală (seria CM, un contor pentru tot softul; clientul în baza comună; contul alocat sau „neidentificată”); tranzițiile logistice Comandat → Recepționat / parțial (cu nota lipsurilor) → Livrat, cu istoric; livrarea, facturarea, contactele, alocarea (doar Administratori), observațiile (se adaugă), atașamentele. Exportul de date (complet și de firmă) cuprinde tabelele și fișierele noi.
- **Ecranul „Comenzi”** după machetă: cap, căutare, selecție pe rând (fișa șoferului la S23), „+ Comandă manuală” (Administratori, Gestiune, Admin general), filtre, coloanele din fișă, rândul desfășurat cu cele patru casete (Încasări — S20), varianta pe telefon; Contabilitatea și Gestiunea au meniul „Comenzi”.
- **Teste**: `com-comenzi.test.ts` (11 cazuri: vizibilitatea pe toate rolurile, inclusiv Contabilitate cu acces pe o firmă și Gestiune cu acces general; coloanele și căutarea; tranzițiile cu istoric și refuzurile; Administratorul altei firme schimbă statusul, agentul / colaboratorul / Contabilitatea nu; ordinea, închisele, filtrele, numărătorile; livrarea; facturarea, contactele, observațiile, notițele ofertei; documentele prin comandă; comanda manuală cu și fără cont, CM-0001 / CM-0002, numărătoarea neidentificatelor; realocarea doar de Administrator, nu la comenzile din ofertă); migrarea 15 în testul migrărilor; exportul cu tabelele noi. `npm test` verde — 31 de fișiere, 323 de teste; 12 etaloane la zero. Ecranul e verificat prin tipuri și build, nu în browser (contul de probă îl pune Ionuț).
- Decizii notate în ARH §13: „închis” = Livrat până la S20; comenzile dinainte de S19 n-au cont alocat (corecție de date la S20, cu jurnal).

**Următorul pas propus:** S20 — încasările și comisioanele (cap. 2, 4): „+ Notează încasare”, statusul încasării derivat, avansul ca prima încasare propusă, comisionul montatorului / recomandării cu istoric și „achitat”, „închis” = Livrat și încasat, contul alocat la comenzile vechi.

## 2026-11-05 — S20: încasările și comisioanele pe comandă (Etapa 5)

**Obiectiv:** PLAN v0.30 S20 — încasările cu statusul derivat, avansul propus, anularea cu motiv; comisionul montatorului / recomandării pe comandă cu istoric și „achitat”; drepturile din CONTURI §3; ecranul; corecția de date pentru comenzile vechi; teste, export, ARH §4.4. Motorul, oferta (ÎNGHEȚATĂ) și tabelul de vânzări neatinse. Aprobat de Ionuț cu cele șase decizii (restul din încasările confirmate și `restLei` actualizat la fiecare mișcare; avansul propus în afara sumei până la confirmare; definițiile numărătorilor; la manuale Administratorul firmei alese; corecția de date cu contul alocat + comisionul + avansul propus; Admin general vede banii, nu-i scrie).

**Rezultat:**
- **Migrarea 16** (aditivă): `comanda_incasare` (sumă, dată, ce reprezintă, stare propusă / confirmată / anulată, cine și când a notat / confirmat / anulat, motivul anulării); pe comandă comisionul cu „achitat”, cine și când. Aplicată pe baza de lucru.
- **Regulile**: statusul încasării (neîncasat · parțial · încasat) și restul din încasările **confirmate**; la „Comandat” avansul intră ca încasare **propusă**, confirmată de Administratorul firmei când banii ajung la birou; anularea cu motiv, nimic șters, totul în istoric; comisionul copiat din ofertă la „Comandat” (comanda e copia vie, oferta rămâne neschimbată), modificat de contul ofertei și Administratorul lui cu istoric și asterisc, „achitat” doar de Administratorul firmei; **„închis” = Livrat și încasat**; numărătorile „neîncasate complet” și „comisioane neachitate” reale; filtrul pe încasare funcțional.
- **Ecranul**: caseta „Încasări” (lista cu stări, „Confirmă” / „Anulează” cu motiv, „+ Notează încasare”, restul de încasat), coloana „Încasat” reală, comisionul cu „achitat” în coloana Montator și în caseta Statusuri.
- **Corecția de date** `npm run date:comenzi -- --aplica` pe baza de lucru: comenzile din ofertă mai vechi primesc contul alocat și clientul din ofertă, comisionul copiat și avansul ca încasare propusă, cu jurnal; idempotentă (pe baza de lucru era o singură comandă veche: cont alocat + client).
- **Teste**: `com-incasari.test.ts` (10 cazuri), testul S19 adus la regula „închis”, migrarea 16 în testul migrărilor, exportul cu `comanda_incasare`; `npm test` verde — 32 de fișiere, 332 de teste; 12 etaloane la zero. Ecranul verificat prin tipuri și build, nu în browser.

**Următorul pas propus:** S21 — tabelul de vânzări (OFERTARE cap. 19): coloanele și definițiile, lucrările cu completări, comisionul agentului scris de Administrator cu „achitat”, filtrul încasat / neîncasat, statisticile; colaboratorii ca vânzare în tabelul Administratorului.


## 2026-11-06 — S21: tabelul de vânzări (Etapa 5)

**Obiectiv:** PLAN v0.30 S21 — ecran de lucru alimentat automat din comenzi (OFERTARE cap. 19, COMENZI cap. 7): cifrele din rezultatul salvat la „Comandat”, rândul colaboratorului în tabelul Administratorului, lucrările una sub alta, coloanele în ordinea lui Ionuț, comisionul agentului, filtrele, statisticile, cine vede ce. Motorul, oferta (ÎNGHEȚATĂ), retururile și paleții neatinse. Aprobat de Ionuț cu cele șase decizii (sumele manuale doar cu cont alocat; filtrul încasat / neîncasat ignoră perioada; procentul = net ÷ cost; rândurile fără sume în afara totalurilor; completarea fără inițiala în selecție ca rând de sine stătător; data comenzii în prima coloană).

**Rezultat:**
- **Migrarea 17** (aditivă): comisionul agentului cu „achitat” (cine, când) și sumele manuale de vânzare pe comandă. Aplicată pe baza de lucru.
- **`/api/vanzari`**: rândurile din blocul `vanzari` al rezultatului salvat — niciun recalcul (E01: 17.000 · 14.337,77 · 2.662,23 · 2.200,19; E05 costul fără grupă; E03 vânzare = achiziția colaboratorului, cost = baza, în tabelul Administratorului); comenzile manuale fără sume până le completează Administratorul firmei (doar cu cont alocat); lucrările una sub alta cu adaosul pe lucrare (`agregaLucrare`: E01 + E10 = 17.000 · 14.539,82 · 2.460,18 · 2.033,21); filtrele (încasat / neîncasat traversând lunile, lună / an / interval, agenți combinat, firmă); statisticile pe selecție (totaluri, comisioane, procent de adaos). Comisionul agentului scris de Administrator cu istoric și asterisc, „achitat” cu cine și când; comisionul recomandării rămâne cel de pe comandă.
- **Ecranul „Vânzări”**: coloanele în ordinea din cap. 19, rândul lucrării sub comenzile legate, statisticile (Administrator, Admin general), scrierea comisionului și a bifelor inline, „Completează sumele” la comenzile manuale; meniul doar la Administratori, Admin general și agenți (agentul vede tabelul lui, fără statistici, fără să scrie).
- **Teste**: `com-vanzari.test.ts` (9 cazuri) — toate cifrele etalon ies din prima; migrarea 17 în testul migrărilor; `npm test` verde — 33 de fișiere, 341 de teste; 12 etaloane la zero. Ecranul verificat prin tipuri și build, nu în browser.

**Următorul pas propus:** S22 — retururile și nota de retur (COMENZI cap. 5): calculul la prețurile din ofertă, rândul de retur legat în tabelul de vânzări (cu minus când comisionul era achitat), nota de retur pentru client; evidența paleților (cap. 8).


## 2026-11-06 — S22: retururile cu nota de retur și evidența paleților (Etapa 5)

**Obiectiv:** PLAN v0.30 S22 — returul din comandă la prețurile ofertei comandate (COMENZI cap. 5, OFERTARE cap. 19), nota de retur PDF, efectul în vânzări, nota de palet și evidența paleților (cap. 8). Motorul, oferta (ÎNGHEȚATĂ), avizul și fișa șoferului neatinse. Aprobat de Ionuț cu cele șapte decizii și completarea pentru comenzile manuale (returul = corecția sumelor manuale, cu istoric).

**Rezultat:**
- **Migrarea 18** (aditivă): `comanda_retur` + `comanda_retur_linie`, `NOTA_RETUR` în enumul documentelor, nota și statusul paletului pe comandă. Aplicată pe baza de lucru.
- **Returul** (`com/retururi.ts`): orice cont care vede comanda alege liniile și cantitățile din rezultatul salvat la „Comandat” (cel mult cantitatea comandată, peste retururile active); suma de restituit cu aritmetica R4 / R6 din `mot/zecimal.ts` (E01, 2 coame mici + 1 opritor: 15,81 € · TVA 3,32 · 19,13 € · **102,32 lei**), achiziția mărfii returnate pas cu pas (**86,29 lei**); numerotat, cu istoric; anularea cu motiv de Administratorul firmei (nimic șters, cantitatea se eliberează); **nota de retur** PDF pe șablonul ofertei, generată la salvare ca document al ofertei comandate, în „Doc.” al comenzii. Comenzile manuale: „retur: corectează sumele” (cost și vânzare, cu istoric), în ARH §4.4 și pe ecran.
- **Vânzări**: rândul de retur cu minus sub comandă („Retur n la …”, data returului, fără comision), lucrarea îl cuprinde (E01 cu retur: 16.897,68 · 14.251,48 · 2.646,20 · 2.186,94), statisticile scad; **„de regularizat”** când un comision era deja achitat, până bifează Administratorul firmei.
- **Paleții**: nota de palet pe orice comandă (Gestiune / Administratori, cu istoric), statusul nerecuperat / recuperat (orice Administrator și Admin general, cu istoric și data), ecranul „Evidența paleților” (nerecuperații cei mai vechi sus, filtre recuperați / client), „n paleți nerecuperați” în capul tabelului de comenzi peste toate comenzile vizibile.
- **Teste**: `com-retururi.test.ts` (8 cazuri) — cifrele pe hârtie au ieșit din prima, inclusiv textul PDF-ului; migrarea 18 în testul migrărilor; exportul cu cele două tabele; `npm test` verde — 34 de fișiere, 349 de teste; 13 etaloane la zero. Ecranele verificate prin tipuri (`tsc -b`, care a scos la iveală un tip dublat din S21, corectat) și build, nu în browser.

**Următorul pas propus:** S23 — documentele comenzii (COMENZI cap. 4c, 6, 9): avizul de însoțire a mărfii după machetă (un aviz per livrare, cantități ajustabile la livrări parțiale), fișa șoferului după machetă (selecția de comenzi, telefoane apelabile, linkul la locație), tipărirea avizului / tabelului de facturare din fișă.


## 2026-11-06 — S23: avizul de însoțire a mărfii și fișa șoferului (Etapa 5)

**Obiectiv:** PLAN v0.30 S23 — avizul după machetă (COMENZI cap. 9: dublu exemplar, fără valori, căsuțe pe rând și pe lungime, semnături, un aviz per livrare cu cantități ajustabile), fișa șoferului după machetă (cap. 4c: selecția de comenzi, ordinea traseului, telefoanele apelabile, linkul la locație, nereținută), tipărirea avizului / tabelului de facturare din fișă, drepturile din CONTURI §2–3. Motorul, oferta (ÎNGHEȚATĂ), catalogul, conturile și FGO neatinse. Aprobat de Ionuț cu cele șapte decizii, cu corectura la agent (FISA-CONTURI decide: agentul generează și printează avizul, tabelul de facturare și detaliata pe comenzile pe care le vede; colaboratorul nu generează și nu vede avizul).

**Rezultat:**
- **Migrarea 19** (aditivă): `AVIZ` în enumul documentelor, `comanda_aviz` + `comanda_aviz_linie`, linkul la locație pe comandă. Aplicată pe baza de lucru.
- **Avizul** (`com/avize.ts`): din „Doc. ▾” sau din fișă, de orice cont care vede comanda în afara colaboratorului; conținutul = detaliata fără valori din rezultatul salvat, cu panotajul, o căsuță pe fiecare rând și lungime, totalul în cuvinte („50 coli de învelitoare (186,481 mp) · n piese …”), casetele de semnături; ambele exemplare în același PDF, fiecare pe pagina lui, pe șablonul ofertei (CSS-ul în plus injectat în pagină, șablonul ofertei neatins). Un aviz per livrare: cantitățile propuse = restul de livrat, orice valoare până la cea comandată, liniile cu zero lipsesc, „livrare parțială”; identificat prin numărul comenzii + data livrării; nu se anulează (se înlocuiește cu altul, amândouă rămân); nu schimbă statusul logistic; istoric.
- **Fișa șoferului** (`com/fisaSoferului.ts`, ecranul „Fișa șoferului” din comenzile bifate): Gestiune, Administratori, Admin general; ordinea blocurilor = ordinea traseului (săgeți), data, mașina (text neținut minte), telefonul Gestiunii = telefonul contului (avertizare dacă lipsește); pe fiecare comandă clientul cu telefonul apelabil (`tel:` în PDF + text), adresa cu „locația pe hartă”, marfa (rezumat, coli pe lungimi, piese pe categorii), livrarea, montatorul apelabil, „de încasat” mare, căsuțele „predat”; „Deschide PDF”, „Descarcă pentru WhatsApp”, avizul și tabelul de facturare pe fiecare bloc. Nereținută: nimic în bază, nimic în istoric.
- **Pe lângă**: linkul la locație pe comandă (http / https, cu istoric, în „Livrare și facturare”); detaliata și tabelul de facturare se generează și din comandă (`POST /api/comenzi/:id/documente`), ca Gestiunea și Contabilitatea să le tipărească fără acces la ofertă.
- **Teste**: `com-documente-aviz-fisa.test.ts` (6 cazuri, pe textul extras din PDF: avizul E01 cu ambele exemplare și fără valori, căsuțele = rânduri + lungimi, livrarea parțială cu două avize și restul propus, drepturile, linkul la locație, fișa pentru două comenzi cu `tel:` și locația, nereținută, drepturile fișei); migrarea 19 în testul migrărilor; exportul cu cele două tabele; `npm test` verde — 35 de fișiere, 355 de teste; 13 cazuri etalon la zero. Ecranele verificate prin tipuri (`tsc -b`) și build, nu în browser.

**Următorul pas propus:** S24 — verificare și înghețare Etapa 5: lista de acceptare `docs/ACCEPTARE-ETAPA-5.md`, Ionuț și testerii pe comenzi reale (inclusiv o comandă manuală, un retur, un aviz și o fișă a șoferului), ARH §4.4 (COM) → ÎNGHEȚAT, eticheta `v0.4-comenzi`.


## 2026-11-06 — S24: verificarea și înghețarea Etapei 5 (`v0.4-comenzi`)

**Obiectiv:** PLAN v0.31 S24 — nicio funcționalitate nouă: rândurile „Code (S24)” din `docs/ACCEPTARE-ETAPA-5.md` bifate cu testul sau citirea care le acoperă (rândurile „Ionuț / testeri” neatinse), F1–F4 verificate, ARH §4.4 (COM) → ÎNGHEȚAT, eticheta. Aprobat de Ionuț, inclusiv interpretarea la F3 (cele trei fișiere din `ofe/` = legarea comenzii, nu modificări ale ofertei).

**Rezultat:**
- **A–E**: toate cele 22 de rânduri „Code (S24)” acoperite de testele existente (`com-comenzi`, `com-incasari`, `com-vanzari`, `com-retururi`, `com-documente-aviz-fisa`, `ofe-statusuri`), bifate cu ✔ și referința testului. Nimic picat, nimic de reparat.
- **F3**: `mot/` neatins față de `v0.3-ofertare` (diff gol); `ofe/` cu trei fișiere, toate legarea comenzii — `statusuri.ts` (crearea comenzii la „Comandat”: tipul, contul alocat, clientul, comisionul copiat, istoricul inițial, avansul ca încasare propusă), `documente/continut.ts` (antetul exportat, fără schimbare de conținut), `documente/index.ts` (etichetele notei de retur și avizului, regula colaboratorului); 13 etaloane la zero.
- **F1**: migrările 15–19 se aplică de la zero la fiecare rulare (`prisma migrate deploy` pe baza de test goală); SQL-ul citit — singura lărgire e legătura la ofertă devenită opțională (migrarea 15), restul clauze standard ale cheilor străine; `date:comenzi` idempotentă, cu jurnal (test existent).
- **F2**: testul export → bază goală → restaurare compară acum și copiii comenzii (istoric, observație, atașament, încasare, retur cu linie, aviz cu linii, linkul la locație) și fișierul atașat pe disc; exportul de firmă cuprinde fișierul comenzii firmei. Așteptări adăugate doar în test, verzi din prima.
- **F4**: depozitul fără fișiere de probă sau diagnostic; `npm test` verde — 35 de fișiere, 355 de teste.
- **F6**: ARH §4.4 (COM) → **ÎNGHEȚAT** (aceeași regulă ca §4.1–§4.3 / §5 / §6: schimbări doar prin MODIFICARE, întâi testul, apoi codul, migrări aditive); §13 cu intrarea S24; PLAN v0.31 cu S24 GATA și **Etapa 5 închisă**; eticheta `v0.4-comenzi`.

**Rămân deschise** (Ionuț și testerii, până la punerea în funcțiune): A4, A6, C3, D4, F5 și partea „Ionuț / tester” a celorlalte rânduri — o comandă cap-coadă (ofertă → Comandat → formulare → Recepționat → aviz → Livrat → încasare → comision → vânzări), o comandă manuală, un retur, fișa șoferului pe telefon.

**Următorul pas propus:** după decizia lui Ionuț — S18 (finisajul vizual, cu observațiile din `docs/OBSERVATII-ECRAN.md`) sau Faza 3 (punerea în funcțiune: VPS, domeniul `roofdata.ro`, backup, conturile reale), conform PLAN.


## 2026-11-10 — S25: corecții din lucrul în paralel (BUG-5…11)

**Obiectiv:** PLAN v0.32 S25 — cele șapte cereri din `docs/CERERI-BUG-S25.md` v1.3, în ordinea cauză → efecte (BUG-8, 7, 6, 9, 11, 10, 5), fiecare cu test automat **și** verificare în browser; schimbări de ecran, nu de calcul: motorul, ofertarea (§4.3) și comenzile (§4.4) neatinse. Aprobat de Ionuț cu precizările: textul căsuței nu e rescris la tastare și parsarea e separată; o singură componentă de bloc cu două instanțe, în fiecare mod pleacă spre motor ce pleca și înainte, rândul „Variantă” duce la același produs, formatul ofertei neschimbat, pozițiile peste 16 doar sub coloana a treia; textul căutat doar ca parametru în SQL, test cu „ȚIGLĂ” → „tigla”; BUG-5 pe trei comenzi (din ofertă, manuală, cu aviz anterior); nicio ștergere de la taste.

**Rezultat (pe fiecare BUG, cu verificarea în browser):**
- **BUG-8** — cauza găsită în cod: la accesoriile speciale 2 ML rândul „presetat” și rândul cu cantitate erau două rânduri React diferite, deci la prima cifră căsuța se reconstruia. Acum rândul își păstrează cheia și locul, iar toate cantitățile folosesc `CasutaCantitate` (textul neschimbat la tastare, virgula acceptată). Test de componentă (vitest + testing-library, nou în web). În browser: „12”, „125” la speciale, „1,5” la accesorii standard, scrise dintr-o mișcare.
- **BUG-7** — blocul învelitorii pe trei coloane, după simularea v2, o componentă cu două instanțe; selecția cu rândul „Variantă” mereu prezent (variantele de profil sau opțiunile din catalog — la Iberic „Standard” / „dripstop”; altfel „Standard” inactiv), comutatorul Panotaj / mp direct, pozițiile 1…8 și 9…16, peste 16 sub coloana a treia, totalurile sub coloane, stilul compact din variabile CSS. În browser, cu măsurători: poziția 1 la înălțimea rândului „Furnizor”, 8 la a ultimului, 9 la a primului, capetele pe aceeași linie, rând de 28 px; cu 6 și cu 17 lungimi, pe principală și pe secundară, pe telefon una sub alta; mp-ul din motor (3 zecimale), 13 etaloane la zero. Capturi: `docs/verificari/S25-capturi/`.
- **BUG-6** — Enter trece pe lungimea poziției următoare (8 → 9, 16 → 17 cu adăugare), la panotaj, șipcă și lungimi. În browser: 17 + 17 poziții fără mouse, cursorul verificat la fiecare Enter.
- **BUG-9** — rândul în care scrii primește fond și contur pe toate celulele (`:focus-within`). În browser: fondul și conturul măsurate pe rândul cu „1,5”.
- **BUG-11** — coșul în loc de „×” (gri, roșu la mouse), `tabIndex=-1` pe tot ce nu e căsuță; nicio tastă nu șterge. În browser: Tab prin 8 căsuțe fără oprire pe coș, Enter / Delete / Backspace pe coș lasă cantitatea, clicul o șterge.
- **BUG-10** — `normalizeazaText` pe server și în web; pe server potrivirea în SQL cu `translate` + `lower`, textul doar ca parametru, id-urile filtrate cu Prisma (fără coloană persistată, argumentul în ARH §13); rutele: cascadă / „+ Adaugă…”, catalogul din Zona tehnică, clienți, montatori, oferte, surse de preluare, comenzi, paleți; „Află preț” în memorie; pluvialul local. Test `ofe-cautare-diacritice.test.ts` (6 cazuri, inclusiv „ȚIGLĂ IBERIC” și „Ţiglă”, fiecare caracter al listei, LIKE scăpat). În browser: „fronton 360” și „COAMĂ MICĂ” la „+ Adaugă…”, „tigla iberic” la Află preț, „campineanca” în oferte, „asociatia” în comenzi. Un defect găsit pe drum și reparat înainte de commit: lista de caractere din `translate` avea un caracter lipsă (ţ se ducea în „a”).
- **BUG-5** — formularul avizului se deschide cu propunerea de pe API (restul de livrat); la comanda manuală caseta spune că nu există cantități de propus. Drumul lui Ionuț reprodus cu contul de Gestiune pe baza de test, tabel de comenzi → Deschide → „+ Aviz pentru o livrare”, pe trei comenzi: VAG (din ofertă E01): 13 coame, 15 coli de 4,20, nicio căsuță goală; CM (manuală): mesajul; VAG (cu aviz anterior de 5 coame + 10 coli de 4,20): 8 coame și 5 coli; „Generează” direct → avizul 1 fără „livrare parțială”. Dacă Ionuț a văzut căsuțe goale pe baza lui, de comparat cu acești pași.

**Verificarea în browser** s-a făcut cu puppeteer-ul din `server/`, pe o instanță separată (web 5174 → server 4010 → baza de test, `VITE_API_PROXY`), cu conturi de test create acolo: 36 de verificări trecute (`S25-capturi/rezultate.json`). **Contul de probă de pe baza de lucru** (test@roofshop.ro) cere parolă nouă la prima conectare, iar Code nu modifică contul: rămâne ca Ionuț să se conecteze o dată el și să parcurgă scenariile pe baza lui (serverele lui rulau cu reîncărcare automată, deci codul nou e deja acolo).

**Teste:** `npm test` verde — 36 de fișiere, 361 de teste; `test:etalon` 13 la zero; `npm test` în web — 3 teste; `git diff v0.4-comenzi..HEAD -- server/src/modules/mot` gol. Status completat în `CERERI-BUG-S25.md`; ARH §13 cu diferențele față de fișe (varianta din catalog, comutatorul fără suprafață combinată la oferte noi, lățimea la totaluri).

**Următorul pas propus:** S18 — finisajul vizual pe tot softul în stilul compact (variabilele din S25), cu `docs/OBSERVATII-ECRAN.md`; între timp, Ionuț verifică S25 pe contul lui.

**Verificarea pe baza de lucru (10.11.2026, după conectarea lui Ionuț):** aceleași scenarii rulate cu puppeteer pe `http://localhost:5173`, cu contul de probă `test@roofshop.ro` (Agent, Roofshop), pe o ofertă de probă nouă `TST-0001` (rămasă „În lucru”): 33 din 35 de verificări trecute — toate cele de editor (BUG-6, 7, 8, 9, 11) și „+ Adaugă…” / „Află preț” (BUG-10); cele două nereușite caută clienți care există doar pe baza de test („Câmpineanca”, „Asociația”), nu sunt defecte; pe baza de lucru, în tabelul de comenzi, „COTEȘTI” (cu diacritice) găsește clientul scris „Cotesti” — sensul invers. **BUG-5 pe comenzile reale ale lui Ionuț**, fără nicio generare: IDM-0007 se deschide cu 22 de căsuțe pline (3,65 m = 22, 3,10 m = 22, 2,60 m = 16…), IDM-0006 cu 13 pline (0,42 m = 8, 1,12 m = 8, 0,28 m = 18…), iar IDM-0005 cu toate pe 0 pentru că are deja avizul 1 din 09.11.2026 (24 coli, 132 piese) — restul de livrat e zero, ceea ce e corect.


## 2026-11-10 — S25b: modul combinat readus (BUG-12)

**Obiectiv:** BUG-12 din `docs/CERERI-BUG-S25.md` v1.4 — suprafața combinată din FISA-OFERTARE 3.2 (fișa are prioritate față de simularea S25): comutatorul de cantitate primește a treia poziție, „Combinat”. Schimbare de ecran, `mot/` neatins.

**Rezultat:** în „Combinat” rămân cele două coloane de poziții și apare la totaluri căsuța „Suprafață directă (mp)” (aceeași `CasutaCantitate`, virgula acceptată, 3 zecimale la deschidere); suprafața afișată = panotaj + mp direct, din motor, cu nota „nu se poate comanda așa (mp direct)” — regula motorului, neschimbată. Spre motor pleacă, în fiecare mod, exact ce pleca și înainte de S25 (combinat = amândouă); ofertele vechi cu amândouă se deschid de la sine în „Combinat”; comutarea Panotaj → Combinat → mp direct → Combinat nu pierde nimic din stare (pleacă doar ce aparține modului ales). Pe telefon căsuța vine sub poziții; așezarea din simularea v2 neschimbată. Test pe stare `web/src/pages/oferta/editor.test.ts` (4 cazuri). În browser, pe baza de lucru cu contul de probă, oferta `TST-0001`: 10 verificări trecute — 255,647 + 48,500 = 304,147 mp din motor, comutarea păstrează pozițiile și mp-ul, după reîncărcare se deschide în „Combinat”, pe telefon căsuța sub poziții; captura `docs/verificari/S25-capturi/principala-combinat.png` trimisă lui Ionuț. Oferta TST-0001 a rămas „În lucru”, în modul Panotaj. Verificarea S25 pe baza lui Ionuț n-a scos nimic de reparat în afară de BUG-12.

**Teste:** `npm test` verde — 36 de fișiere, 361 de teste; `test:etalon` 13 la zero (inclusiv etalonul cu suprafață combinată); web `npm test` — 7 teste; `git diff v0.4-comenzi..HEAD -- server/src/modules/mot` gol. Status BUG-12 ✔; PLAN rândul S25 completat cu S25b; ARH §13 corectat.
