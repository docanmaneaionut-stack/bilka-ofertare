# PLAN — foaia de parcurs a construcției

Versiunea 0.6 · 22 octombrie 2026 · Se citește împreună cu `docs/ARH.md` și cu fișele de specificație din `docs/` (FISA-CONTURI, FISA-CATALOG-PRETURI, FISA-OFERTARE, FISA-COMENZI). **Unde ARH și o fișă spun lucruri diferite, fișa are prioritate** (e mai nouă și e aprobată de Ionuț); diferența se notează în ARH §13 în aceeași sesiune.
Claude Code actualizează statusul sesiunilor la finalul fiecărei sesiuni.

## Cum se folosește

- O **etapă** = un rezultat utilizabil de Ionuț. O **sesiune** = un singur obiectiv.
- Fiecare sesiune are: obiectiv · rezultat vizibil · teste · ce nu se atinge.
- Statusuri: NEÎNCEPUT · ÎN LUCRU · GATA · ÎNGHEȚAT.
- Mesaj standard de sesiune: „Citește CLAUDE.md, docs/ARH.md, docs/PLAN.md (Etapa X, sesiunea SY) și ultima intrare din docs/JURNAL.md. Obiectivul sesiunii: cel din PLAN. Începe cu planul și așteaptă aprobarea. Nu se atinge: …"
- Ionuț testează pe date reale doar după ce testele automate ale sesiunii trec.

---

## Etapa 1 — Fundația și zona tehnică (CAT / LP / ADM / CON minim)

**Rezultat la final:** Ionuț intră în aplicație cu contul lui, catalogul Bilka e în baza de date, și poate face o listă de preț nouă din CSV, cu ecran de diferențe, în sub 10 minute, fără ajutor. Nicio ofertă încă.

**Precondiții (de la Ionuț):** ✔ lista Bilka transformată în CSV (`docs/import/Bilka/`, 15 fișiere, README) · datele firmelor (denumire, CUI, J, adresă, telefon, e-mail, siglă) · lista utilizatorilor cu rol, firmă și serie de ofertă (2–3 litere) · Node.js și PostgreSQL instalate pe calculatorul de lucru.

| Sesiune | Obiectiv | Rezultat vizibil | Teste | Status |
|---|---|---|---|---|
| S1 | Inițializare: structură, git, GitHub, JURNAL | depozit creat și publicat | — | GATA (03.09) |
| S2 | Schelet aplicație + bază de date + autentificare: server, conexiune PostgreSQL, unealta de migrări, migrarea 1 (tabelele pentru Etapa 1: compartimente, grupuri / familii, produse cu caracteristicile din FISA-CATALOG §3, versiuni de listă de preț, firme, utilizatori cu cele șase roluri din FISA-CONTURI, jurnal), cont Admin general, pagină de login, pagina goală „Zona tehnică" | aplicația pornește local; Ionuț se loghează | migrare de la zero; login / logout | GATA (16.10) — seed-ul conturilor se rulează după completarea `server/.env` |
| S3 | Catalog (CAT): ecrane pentru compartimente, grupuri / familii, produse (cascada model → finisaj → grosime → culoare, variante de profil, „un cod, două produse"), tabelele de culori și garanții, listele implicite și treptele D; jurnal de modificări | Ionuț adaugă un produs manual și îl vede în jurnal | validări produs; jurnalizare | GATA (19.10, commit 07d0b0d; 29 de teste) |
| S4 | Liste de preț (LP) + import: versiuni cu dată de valabilitate; import din CSV-urile `docs/import/Bilka/` cu ecran de diferențe (preț modificat / produs nou / dispărut / culori); activare; prețuri Stoc introduse manual. **Identitatea produsului la import**: `codIntern` se generează determinist din (compartiment, cod furnizor, denumire) — nu aleator — ca un reimport să regăsească aceleași produse și ecranul de diferențe să compare corect; produsele fără cod furnizor se identifică prin denumire. **Redenumiri**: când denumirea unui produs se schimbă (ex. „dubluvopsit" → „dubluvopsit SSAB"), codul intern se schimbă — ecranul de diferențe trebuie să recunoască perechile „dispărut + nou cu același cod furnizor" și să propună „același produs, redenumit" (păstrează istoricul de preț), cu confirmarea Admin general | catalogul Bilka real (3.399 de rânduri) importat și activ | import; diferențe; o singură listă activă; versiunile vechi nu se pot modifica | GATA (19.10, commit 9ae6081; 41 de teste) — versiunea „Bilka v10 — septembrie 2026" activă, 3.425 de produse (3.399 + 26 de coale de tablă plană), 5 tabele de referință; migrările 3 (liste, propuneri de import, blocarea versiunilor arhivate în bază) și 4 (garanții: grosime și ani la culoare opționale, pentru pluvial); testele rulează pe schema `test` din aceeași bază, cu siguranță pe nume; **revenirea la o listă veche = reimportul fișierelor ei ca versiune nouă**; de verificat de Ionuț: reimportul celor 14 fișiere din ecran dă zero diferențe |
| S5 | Firme și utilizatori (CON minim) + export: firme cu date și siglă; utilizatori cu rol, firmă, serie de ofertă, adaos % (FISA-CONTURI); export „descarcă tot" | firmele și utilizatorii reali creați | agentul nu intră în ADM și nu vede adaosul %; exportul se poate reimporta | GATA (22.10, commit a327762; 54 de teste) — migrarea 5 (firmă: plătitor TVA, localitate, județ, bancă, observații; utilizator: parolă de schimbat, încercări eșuate, blocat până la); blocare 5 încercări / 15 min; parola inițială se schimbă obligatoriu la prima conectare; jurnal pe orice câmp de firmă / utilizator; export ZIP (18 tabele + folderul de date, hash-urile separat în `_sistem/parole.csv`) și `npm run restore -- <zip>` doar pe bază goală, verificat prin test; `pornire.cmd` în rădăcina proiectului (dublu-clic); firmele și conturile reale le creează Ionuț din ecran |
| S6 | Verificare și înghețare: lista de acceptare, teste verzi, backup local de probă + restaurare de probă, etichetă `v0.1-fundatie`; ARH §4.1, §4.2, §6 → ÎNGHEȚAT | eticheta în git; ARH actualizat | toate | GATA (22.10, eticheta `v0.1-fundatie`) — rândurile „Code (S6)" din `docs/ACCEPTARE-ETAPA-1.md` completate (excepția documentată: Code scrie doar coloana Status); exportul real restaurat și comparat tabel cu tabel; un BUG găsit la E2 și reparat cu test (coloana `randuri` la restaurarea propunerilor de import); ARH §4.1, §4.2, §6 ÎNGHEȚATE; rândurile „Ionuț" rămase ○ se bifează de el |

**Lista de acceptare Etapa 1**

- [ ] Instalare de la zero pe un calculator curat: aplicația pornește și creează singură baza de date.
- [ ] Login cu contul de administrator; un cont de agent nu vede zona tehnică.
- [ ] Import CSV Bilka cu ecran de diferențe; nimic nu se aplică fără confirmare.
- [ ] Lista veche rămâne intactă după activarea celei noi.
- [ ] Editare manuală a unui preț; ajustare % pe o categorie; ambele apar în jurnal.
- [ ] Export „descarcă tot" și reimport reușit.
- [ ] Backup de probă restaurat cu succes.
- [ ] Toate testele verzi; etichetă `v0.1-fundatie`.

**Ce NU face Etapa 1:** oferte, calcule, PDF, roluri complete, comenzi, găzduire pe VPS.

---

## Etapa 2 — Motorul de calcul (MOT + ETALON)

**Rezultat:** motorul reproduce la leu ofertele reale, rulat din teste, fără interfață.

**Precondiții:** 10–20 oferte etalon (pentru fiecare: documentul generat de v4.1 + intrările folosite) · adaosurile țintă implicite pe categorie · formula de achiziție confirmată · culorile per model / grosime.

| Sesiune | Obiectiv | Status |
|---|---|---|
| S7 | Formatul ofertelor etalon; primele 3 oferte transcrise ca teste (încă roșii) | NEÎNCEPUT |
| S8 | Cantități: lungime × bucăți × lățime totală (3 zecimale), suprafață directă și combinată, ml → buc, cele două variante la șipcă (FISA-OFERTARE 3 și 8) | NEÎNCEPUT |
| S9 | Cele trei straturi de preț: achiziție (cu grupă), țintă cu TVA, prezentare (3 moduri, calcul invers la leu), gardă absolută, varianta B de TVA (FISA-OFERTARE 11) | NEÎNCEPUT |
| S10 | Variante (versiuni sub același număr), prețuri fixe, „preia prețuri din oferta…", completări sub achiziție, colaboratori | NEÎNCEPUT |
| S11 | Toate ofertele etalon verzi; ARH §5 → ÎNGHEȚAT; etichetă `v0.2-motor` | NEÎNCEPUT |

---

## Etapa 3 — Ofertare și documente (OFE + DOC)

**Rezultat:** agenții lucrează în aplicație în locul prototipului v4.1.

| Sesiune | Obiectiv | Status |
|---|---|---|
| S12 | Lista de oferte (machetă `docs/design/ecran-lista-oferte`); creare / editare: antet, client, învelitori și pachete, rubrici cu liste implicite | NEÎNCEPUT |
| S13 | Prețuri în ofertă: moduri de prezentare, variante, prețuri fixe | NEÎNCEPUT |
| S14 | Statusuri (8, cu istoric de la „Transmisă"), recomandare și montator, înghețarea la „Comandat", trecerea în comandă | NEÎNCEPUT |
| S15 | Documentele: ofertă, rezumat, detaliată, tabel de facturare, formularele Bilka (export) — după machetele din `docs/design/` (CSS-ul din `macheta-generator.py` e referința) | NEÎNCEPUT |
| S16 | Verificare pe oferte reale; înghețare; etichetă `v0.3-ofertare` | NEÎNCEPUT |

**Faza 3 — Punere în funcțiune** vine imediat după Etapa 3: VPS, domeniu, backup automat, restaurare de probă, conturile reale.
Decizii (17.10.2026): **domeniul aplicației este `roofdata.ro`** — separat de site-ul firmei (roofshop.ro), ca nimic de la site să nu atingă aplicația și invers; verificat liber, înregistrat de Ionuț pe Roofshop DMI SRL (luni, 19.10). DNS-ul domeniului se administrează pe Cloudflare (gratuit): certificat HTTPS, protecție de bază, control independent de registrar. Aplicația va rula la `app.roofdata.ro` (sau direct `roofdata.ro`), iar notificările prin e-mail, când vor exista, de pe acest domeniu. De aici înainte etapele următoare se livrează pe sistemul în funcțiune, prin migrări aditive.

---

## Etapele următoare (schiță; se detaliază când le vine rândul)

- **Etapa 4 — CON complet**: colaboratori, permisiuni fine, jurnal complet (rolul „director zonal" nu mai există — FISA-CONTURI).
- **Ferestre (Fakro, Velux)** — al doilea și al treilea compartiment de catalog, pe modul „catalog public cu discount"; intră când Ionuț are listele complete cu discounturile (17.10.2026). **Pazie și gard** (tipuri de ofertă separate, cu calcul pe metraj) — amânate fără termen, la decizia lui Ionuț (17.10.2026).
- **Etapa 5 — COM**: comenzi către furnizor, export în formatul Bilka (IMP), încasări, avansuri.
- **Etapa 6 — STO**: stoc propriu per firmă, livrări.
- **Etapa 7 — NOT**: notițe text / voce, offline pe telefon, sincronizare.
- **Etapa 8 — SCH / GEO / PAN**: schiță 2D, geometrie, panotaj — în cele cinci sub-etape din ARH §7; motorul (GEO, PAN) se construiește și se testează pe acoperișuri reale înaintea interfeței de desen.

---

## Date de furnizat de Ionuț (o singură dată)

| Ce | Pentru | Status |
|---|---|---|
| Lista Bilka curentă (PDF / Excel) | Etapa 1, S4 | ✔ primită (CSV în `docs/import/Bilka/`, importată 19.10) |
| Datele firmelor emitente (denumire, CUI, adresă, cont, logo, serie) | Etapa 1, S5 | ✔ `docs/import/firme.csv` + sigla Roofshop DMI; lipsesc sigla Proroof Comp și conturile bancare (se completează din ecran) |
| Lista utilizatorilor cu rol și firmă | Etapa 1, S5 | Ionuț le creează din contul de Admin general, din ecran (decis 16.10) |
| 10–20 oferte etalon (document v4.1 + intrări) | Etapa 2, S7 | de pregătit |
| Adaosuri țintă implicite pe categorie | Etapa 2, S9 | de pregătit |
| Culorile disponibile per model / grosime | Etapa 2 | de pregătit |
| Textul legal pentru zona B | Etapa 3, S15 | de pregătit |
| Stadiile comenzilor; schema de comision a agenților | Etapa 5 | mai târziu |
| Regulile de panotaj per model; 10–15 acoperișuri reale cu lista de coli montată | Etapa 8 | mai târziu |
