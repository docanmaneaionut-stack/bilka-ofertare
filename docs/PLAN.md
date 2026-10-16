# PLAN — foaia de parcurs a construcției

Versiunea 0.1 · 3 septembrie 2026 · Se citește împreună cu `docs/ARH.md`.
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

**Precondiții (de la Ionuț):** lista Bilka curentă (PDF / Excel) → transformată în CSV canonic în Chat · datele firmelor (denumire, CUI, adresă, cont, logo) · lista utilizatorilor cu rol.

| Sesiune | Obiectiv | Rezultat vizibil | Teste | Status |
|---|---|---|---|---|
| S1 | Inițializare: structură, git, GitHub, JURNAL | depozit creat și publicat | — | GATA? |
| S2 | Schelet aplicație + bază de date + autentificare: server, conexiune PostgreSQL, unealta de migrări, migrarea 1 (tabelele din ARH §4.1 și §4.2), cont administrator, pagină de login, pagina goală „Zona tehnică" | aplicația pornește local; Ionuț se loghează | migrare de la zero; login / logout | NEÎNCEPUT |
| S3 | Catalog (CAT): ecrane pentru categorii, produse (tip de calcul + parametri), culori, profil furnizor; jurnal de modificări | Ionuț adaugă un produs manual și îl vede în jurnal | validări produs; jurnalizare | NEÎNCEPUT |
| S4 | Liste de preț (LP) + import: versiuni; import CSV canonic cu ecran de diferențe (modificat / nou / dispărut); activare; editare manuală; copiere + ajustare % pe categorie | lista Bilka reală importată și activă | import; diferențe; o singură listă activă; versiunile arhivate nu se pot modifica | NEÎNCEPUT |
| S5 | Firme și utilizatori (CON minim) + export: firme cu date, logo, serie de numerotare; utilizatori cu rol și firme; export „descarcă tot" | firmele și utilizatorii reali creați | agentul nu intră în ADM; exportul se poate reimporta | NEÎNCEPUT |
| S6 | Verificare și înghețare: lista de acceptare, teste verzi, backup local de probă + restaurare de probă, etichetă `v0.1-fundatie`; ARH §4.1, §4.2, §6 → ÎNGHEȚAT | eticheta în git; ARH actualizat | toate | NEÎNCEPUT |

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
| S8 | Panelare și cantități: lățimi, rupere cu suprapunere, ml → buc, șipcă gard | NEÎNCEPUT |
| S9 | Cele trei straturi de preț: achiziție, țintă, prezentare (3 moduri), gardă absolută | NEÎNCEPUT |
| S10 | Variante de preț, prețuri fixe, colaboratori, moneda documentului | NEÎNCEPUT |
| S11 | Toate ofertele etalon verzi; ARH §5 → ÎNGHEȚAT; etichetă `v0.2-motor` | NEÎNCEPUT |

---

## Etapa 3 — Ofertare și documente (OFE + DOC)

**Rezultat:** agenții lucrează în aplicație în locul prototipului v4.1.

| Sesiune | Obiectiv | Status |
|---|---|---|
| S12 | Lista de oferte; creare / editare: client, secțiuni, cantități | NEÎNCEPUT |
| S13 | Prețuri în ofertă: moduri de prezentare, variante, prețuri fixe | NEÎNCEPUT |
| S14 | Statusuri, recomandare, blocarea la acceptare | NEÎNCEPUT |
| S15 | PDF ofertă și tabel factură (șabloane HTML) | NEÎNCEPUT |
| S16 | Verificare pe oferte reale; înghețare; etichetă `v0.3-ofertare` | NEÎNCEPUT |

**Faza 3 — Punere în funcțiune** vine imediat după Etapa 3: VPS, domeniu, backup automat, restaurare de probă, conturile reale. De aici înainte etapele următoare se livrează pe sistemul în funcțiune, prin migrări aditive.

---

## Etapele următoare (schiță; se detaliază când le vine rândul)

- **Etapa 4 — CON complet**: director zonal, colaboratori, permisiuni fine, jurnal complet.
- **Etapa 5 — COM**: comenzi către furnizor, export în formatul Bilka (IMP), încasări, avansuri.
- **Etapa 6 — STO**: stoc propriu per firmă, livrări.
- **Etapa 7 — NOT**: notițe text / voce, offline pe telefon, sincronizare.
- **Etapa 8 — SCH / GEO / PAN**: schiță 2D, geometrie, panotaj — în cele cinci sub-etape din ARH §7; motorul (GEO, PAN) se construiește și se testează pe acoperișuri reale înaintea interfeței de desen.

---

## Date de furnizat de Ionuț (o singură dată)

| Ce | Pentru | Status |
|---|---|---|
| Lista Bilka curentă (PDF / Excel) | Etapa 1, S4 | de trimis |
| Datele firmelor emitente (denumire, CUI, adresă, cont, logo, serie) | Etapa 1, S5 | de trimis |
| Lista utilizatorilor cu rol și firmă | Etapa 1, S5 | de trimis |
| 10–20 oferte etalon (document v4.1 + intrări) | Etapa 2, S7 | de pregătit |
| Adaosuri țintă implicite pe categorie | Etapa 2, S9 | de pregătit |
| Culorile disponibile per model / grosime | Etapa 2 | de pregătit |
| Textul legal pentru zona B | Etapa 3, S15 | de pregătit |
| Stadiile comenzilor; schema de comision a agenților | Etapa 5 | mai târziu |
| Regulile de panotaj per model; 10–15 acoperișuri reale cu lista de coli montată | Etapa 8 | mai târziu |
