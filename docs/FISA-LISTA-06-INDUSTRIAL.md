# Fișa listei 06 — INDUSTRIAL (Bilka)

Versiunea 1.0 · 9 septembrie 2026 · Status: ÎNCHISĂ (deciziile lui Ionuț din 09.09.2026)
Extrasul de import: `docs/import/bilka/06-industrial.csv` (892 de rânduri, 788 de coduri Bilka, 3 fără cod; separator „;")

Regulă aplicată aici: un cod apare o singură dată în catalog. Accesoriile de tinichigerie de 2 m sunt **aceleași produse** în lista rezidențială și în cea industrială (același cod, același preț), deci CSV-ul 06 conține doar ce **nu era deja în 01**: coloanele noi (0,70 mm, dubluvopsit, zincat) și familiile industriale.

---

## 1. Ce conține

| Grup | Familii | Rânduri | Unitate | Categorie de ofertă |
|---|---|---|---|---|
| Tablă cutată | T8 perete (18), T12 (4, doar 0,40), T18 (19) + dripstop (13), Sinus S18 (18), T35 (19) + dripstop (13), T45 (19) + dripstop (13); zincat: T8 (4), T12 (2), T18 / T35 / T45 (6 fiecare), S18 (5, fără 0,70), T35 / T45 dripstop zincat (6 fiecare) | 177 | mp | Învelitori |
| Tablă plană | ce nu era în 01: lucios 0,70; dubluvopsit lucios / mat 0,40 și 0,50; SSAB 0,60 lucios / mat; Magnelis; zincat 0,37–0,70 | 14 | mp | ca în lista 01: Învelitori plate (mp) + Accesorii standard (coală 2,5 mp) |
| Accesorii de tinichigerie industriale | coamă unghiulară industrială 417 / 312, subcoamă industrială 417 / 312, colțar exterior și interior 417 / 312 / 250, profil U pentru T8 / T12 / T18 / T35 / T45 — în lucios (0,70–0,40), mat, GDM / Wood / RAL 8003, dubluvopsit, zincat | 375 | buc | Accesorii standard |
| Accesorii de tinichigerie (coloane noi) | pentru cele 24 de familii rezidențiale: lucios 0,70, dubluvopsit (6 variante), zincat (6 grosimi), opritor omega zincat | 326 | buc | Accesorii standard |

Fără cod (3): bordură la perete 250 / 208 / 178 în SSAB lucios 0,60 — familia are în ListaPret doar varianta mat. Paravântul de bază (0,70 și dubluvopsit) a fost scos din catalog (10.09), la fel Sinus 18 zincat 0,70 (nu se produce / nu se vinde).

Toate cele 789 de coduri au prețul identic cu PDF-ul (verificat pe cod pentru 754, iar pentru cele ~35 pe care parserul nu le-a putut citi automat — tabelul zincat industrial cu etichete rupte, tabla zincată cu dripstop — verificat vizual, valoare cu valoare).

---

## 2. Reguli reținute

- **Lățimi totale**: T8 1,20 · T12 1,14 · T18 1,15 · S18 1,10 · T35 1,085 · T45 1,01 (în CSV, editabile în soft).
- **T8 perete / T8 perete ventilat**: un preț, două variante de profil — în `variante-profil.csv`.
- **Dripstop** la T18 / T35 / T45: produse separate (coduri TDT), **comandă minimă 40 mp** (observație în CSV; propun avertizare la ofertă).
- **0,70 mm** există doar la lucios (T18, T35, T45, tablă plană, accesorii) și la zincat.
- **T12** doar 0,40 (lucios, mat, dubluvopsit lucios / mat) + zincat 0,37 / 0,40.
- **Zincat**: la T8, T12 și tablă plană codurile sunt ZN2 (lățime 1,20 m), la restul ZNC — fără efect în soft.
- **Colțar exterior / interior industrial**: același cod Bilka — două produse pe același cod, ca la ruperea pantei.
- Tabla plană rezidențială și cea industrială sunt același produs (cod TPLAN); rândurile de bază sunt în 01, cele suplimentare aici.

---

## 3. Decizii (09.09.2026)

1. 0,70 mm și toate produsele zincate se vând ocazional — **toate active**.
2. Dripstop la T18 / T35 / T45 sub 40 mp: **avertizare** la ofertă, nu blocare.
