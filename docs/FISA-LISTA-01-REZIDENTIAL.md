# Fișa listei 01 — REZIDENȚIAL (Bilka)

Versiunea 1.1 · 10 septembrie 2026 · Status: ÎNCHISĂ (deciziile lui Ionuț din 10.09.2026 aplicate)
Extrasul de import: `docs/import/bilka/01-rezidential.csv` (522 de rânduri; separator „;", deschide direct în Excel)

---

## 1. Ce conține lista

| Grup | Familii | Rânduri | Unitate | Categorie de ofertă (propunere) |
|---|---|---|---|---|
| Țiglă metalică | Dacic, Adriatic, Hellenic, Britanic / Britanic Retro, Clasic, Balcanic, Gotic, Iberic, Romanic | 88 | mp | Învelitori |
| Țiglă cu dripstop | Clasic, Balcanic, Gotic, Iberic (opțiune = produs separat, +1,50 €/mp) | 42 | mp | Învelitori |
| Tablă plană cu folie protectoare 1,25 × 2,00 m | lucios, mat, Wood, RAL 8003, Grande Mat | 12 | mp | în două locuri: Învelitori plate (la mp, cu lungimi) și Accesorii standard (coală de 2,5 mp, la bucată) |
| Coame | coamă mică (inclusiv 0,40), coamă mare | 22 | buc | Accesorii standard |
| Accesorii coamă | capac coamă, închidere coamă mică / mare — doar pe finisaj (lucios / mat / Grande Mat), fără grosime | 9 | buc | Accesorii standard |
| Accesorii de tinichigerie | 20 de familii × desfășurată × finisaj × grosime, piese de 2,00 m (opritorul și setul coș fum și de 1,25 m) | 349 | buc | Accesorii standard |

Total: **522 de rânduri**, toate cu cod Bilka (498 de coduri unice — ruperea pantei convexă / concavă împart 24 de coduri). Bordura fronton sub țiglă și Paravântul de bază (doar în PDF, fără cod) au fost **scoase** din catalog la decizia lui Ionuț (10.09): la nevoie se ofertează ca accesoriu special.

---

## 2. Atributele fiecărui produs (coloanele CSV-ului)

`cod_furnizor` (codul Bilka de 11 caractere) · `grup` · `familie` · `varianta` (desfășurată / lungime) · `finisaj` · `grosime` · `optiune` (dripstop) · `denumire` (cum va apărea în soft) · `um` · `pret_eur` (fără TVA, din PDF = ListaPret) · `moneda` · `categorie_bilka` (categoria de adaos Bilka) · `categorie_oferta` · `latime_totala_m` (doar țiglă; câmp editabil în soft, cu istoric) · `modul_cm` (doar țiglă; 35) · `activ` · `sursa` · `observatii`.

Culorile **nu** sunt în acest fișier: vin din matricea de culori (finisaj × grosime × model), într-un fișier separat, după textul tău despre culori.

---

## 3. Reguli reținute din listă

- Finisajul dă prețul; culoarea nu. RAL 8003 și Wood sunt finisaje cu preț propriu.
- 0,40 mm există doar la Clasic (și șipcă); Romanic doar 0,60 / 0,50, Wood 0,50, Grande Mat 0,50.
- Dripstop e produs separat (cod TD…), listat pentru Clasic, Balcanic, Gotic, Iberic.
- Accesoriile de tinichigerie: prețul depinde de desfășurată × grosime × finisaj; piesele cu aceeași desfășurată au același preț.
- Coamă unghiulară Britanic și Semicoamă Britanic: „indisponibil" la 0,40 → nu există rând.
- Opritor zăpadă omega: un singur preț pe finisaj (grosimea nu contează; codul Bilka e pe 0,50).
- Set coș fum = 4 piese × 1,25 m, vândut ca set (1 buc = setul).
- Ruperea pantei convexă și concavă au **același cod Bilka**; în soft sunt două produse (agentul alege), la comandă se completează rândul corespunzător din formular.
- Accesoriile marcate cu * în PDF (obligatorii pentru Romanic) au observația în CSV: bordură streașină 250, fixarea plăcilor 250, bordură fronton 360, colector fronton 250, dolie 625, bordură la perete 250.
- Capacul și închiderile de coamă sunt clasificate de Bilka la „holțșuruburi" (categoria lor de adaos 5) — fără importanță pentru noi, doar de știut.

---

## 4. Stare la închidere (10.09.2026)

Lămurite prin deciziile ulterioare: ruperea pantei convexă / concavă = două produse pe același cod (regula „un cod, două produse", 09.09); toate cele 9 modele active (textul tău de producție le conține pe toate); lățimile totale rămân cele din CSV, editabile în soft; culorile din tabelul general (09.09).

Rămân de lămurit (nu blochează importul):
1. **Tabla plană**: subgrup la Învelitori (propunere) sau la Accesorii standard?
2. **Bordură fronton sub țiglă** și **Paravânt de bază**: rămân în catalog fără cod; cum le comanzi la Bilka (rând liber în formular, observație)?
3. **Accesoriile preiau automat** finisajul, grosimea și culoarea învelitorii alese (modificabil pe linie)? — se decide în fișa OFERTARE.

## 5. Decizii (10.09.2026)

1. **Tabla plană** apare la ofertă în două locuri, pe același cod și același preț / mp: ca **învelitoare** în grupa învelitorilor plate (mp, cu lungimi; prețul / mp e de regulă egal cu T8) și ca **accesoriu standard** — coala de 1,25 × 2,00 m, la bucată (1 buc = 2,5 mp × preț / mp). Regula „un cod, două produse".
2. Bordura fronton sub țiglă și paravântul de bază: scoase din catalog.
3. Accesoriile preiau automat finisajul, grosimea și culoarea învelitorii alese, modificabile pe linie.
4. Accesoriile marcate de Bilka ca recomandate / obligatorii rămân ca informație în CSV; lista de propuneri automate se detaliază la ofertare, pe categorii (țiglă Romanic / celelalte, învelitori plate, tablă cutată).
