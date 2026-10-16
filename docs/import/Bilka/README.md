# Catalog Bilka — fișierele de import și fișele listelor

10 septembrie 2026 · Versiunea surselor: formular v10 (03.06.2026, prețuri valabile din 08.10.2025 / 01.06.2026 / 14.07.2026) + listele PDF septembrie 2026 + textul „Culori și modele Bilka" (09.09.2026)

## Unde se pun fișierele (folderul proiectului, ex. `D:\Proiecte\ofertare\`)

| Fișier | Unde | Rol |
|---|---|---|
| `01-rezidential.csv` … `09-accesorii-speciale-ml.csv` (9 fișiere, inclusiv `04b-pluvial-aluzinc.csv`) | `docs\import\bilka\` | extrasele de import, un cod Bilka o singură dată în tot setul |
| `variante-profil.csv` | `docs\import\bilka\` | variantele de profil per model, cu restricții |
| `culori-finisaj-grosime.csv` | `docs\import\bilka\` | tabelul de culori (finisaj × grosime × culoare) |
| `garantii-finisaj-grosime.csv` | `docs\import\bilka\` | garanții și straturi pe finisaj × grosime (ani culoare / ani coroziune) |
| `liste-implicite-oferta.csv` | `docs\import\bilka\` | ce produse apar direct în fiecare rubrică a ofertei, pe categorii de învelitoare |
| `trepte-desfasurata.csv` | `docs\import\bilka\` | încadrarea desfășuratelor pe trepte D01–D25 (pop-up la accesoriile speciale) |
| `README.md` (acest fișier) | `docs\import\bilka\` | indexul setului |
| `FISA-CATALOG-PRETURI.md` | `docs\` | fișa modulului (regulile catalogului) |
| `FISA-LISTA-01-REZIDENTIAL.md` … `FISA-LISTA-08-09-ACCESORII-SPECIALE.md` (7 fișe) | `docs\` | ce conține fiecare listă, regulile, deciziile |
| `ANALIZA-LISTE-BILKA.md`, `ANALIZA-FORMULAR-BILKA.md`, `VERIFICARE-PRETURI-BILKA.md`, `REGULI-CULORI-BILKA.md` | `docs\` | analizele și verificările |
| `compara_pdf_listapret.py` | `docs\tools\` | verificarea PDF ↔ formular, de rulat la fiecare actualizare |
| cele 9 PDF-uri Bilka + `Formular_comanda_v10.XLSM` + `tabel-tehnic-rezidential-bilka.pdf` | `docs\liste\bilka\2026-09\` | sursele acestei versiuni (arhivă) |

Fișierele cu același nume se **înlocuiesc**; versiunile de aici sunt cele finale.

## Conținut

| Fișier CSV | Rânduri | Coduri Bilka unice | Fără cod | Fișă |
|---|---|---|---|---|
| 01-rezidential | 522 | 498 | 0 | ÎNCHISĂ v1.1 |
| 02-auxiliare | 88 | 78 | 2 (corector colorat, produs nou) | ÎNCHISĂ v1.0 |
| 03-04-pluvial | 138 | 138 | 0 | ÎNCHISĂ v1.0 |
| 04b-pluvial-aluzinc | 37 (2 inactive, preț 0) | 37 | 0 | în fișa 03-04 |
| 05-retro-faltuita | 339 | 325 | 0 | ÎNCHISĂ v1.0 |
| 06-industrial | 892 | 788 | 3 (bordură perete SSAB lucios 0,60) | ÎNCHISĂ v1.0 |
| 07-sipca-gard | 83 | 83 | 0 | ÎNCHISĂ v1.0 |
| 08-accesorii-speciale-2ml | 650 | 650 | 0 | ÎNCHISĂ v1.0 |
| 09-accesorii-speciale-ml | 650 | 650 | 0 | ÎNCHISĂ v1.0 |
| **Total** | **3.399** | **3.247** | **5** | |

Rândurile cu același cod și denumiri diferite sunt intenționate: ruperea pantei convexă / concavă, colțar exterior / interior industrial, benzi profilate streașină / coamă, tabla plană (învelitoare la mp / accesoriu la coală) — regula „un cod, două produse".

## Coloanele CSV (separator „;", codificare UTF-8)

`cod_furnizor` · `grup` · `familie` · `varianta` · `finisaj` · `grosime` · `optiune` · `denumire` (cum apare în soft) · `um` · `pret_eur` (fără TVA) · `moneda` · `categorie_bilka` (doar 01) · `categorie_oferta` · `latime_totala_m` (învelitori) · `modul_cm` (țiglă, 35) · `culori_disponibile` (excepții pe produs) · `activ` · `sursa` · `observatii`. Listele 08 / 09 au în plus `treapta` și `desfasurata`; 03-04 și 04b au `sistem`; 07 are `latime_totala_mm`.

## Reguli aplicate la construirea setului

1. PDF-urile definesc ce intră în soft; formularul (ListaPret) dă codul și confirmă prețul. Singura excepție: pluvialul Aluzinc, la decizia lui Ionuț (10.09).
2. Excluse: module 37,5 / 40, profile zincate, ferestre (Fakro / Velux / Optilight prin Bilka), uz gospodăresc, T153, unelte, accesorii speciale în grosimi 0,75–1,50, variantele de T12, șipcă și zincat existente doar în formular, Sinus 18 zincat 0,70, bordura fronton sub țiglă, paravântul de bază.
3. Un cod apare o singură dată în set (accesoriile de 2 m comune listelor 01 și 06 sunt în 01; 06 conține doar coloanele noi și familiile industriale).
4. Prețul de referință e cel din PDF; singura diferență față de formular (set coș fum Retro mat 0,50: 19,62 față de 23,26) e notată în CSV.
5. Fără date de ambalare. Unități: mp, buc, ml, cutie, rolă.
6. Toate rândurile de 0,60 dubluvopsit sunt SSAB (etichetate ca atare), indiferent de codificarea Bilka (DPL / DPM 060 sau SPX / MPX 060).
