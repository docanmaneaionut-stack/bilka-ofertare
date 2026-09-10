# Verificare — prețurile din ListaPret (formular v10) față de listele PDF Bilka

4 septembrie 2026 · Anexă la fișa CATALOG ȘI PREȚURI

## Metodă
Textul fiecărui PDF a fost extras (cu păstrarea aliniamentului), fiecare poziție a fost tradusă în codul Bilka de 11 caractere (familie + variantă + finisaj + grosime) și căutată în foaia ascunsă ListaPret a formularului. Compararea e la nivel de cod, nu de denumire. Scriptul: `docs/tools/compara_pdf_listapret.py` (punct de plecare pentru verificarea de la fiecare actualizare).

## Rezultat

| Liste | Poziții | Identice | Diferite | Fără cod în ListaPret |
|---|---|---|---|---|
| 01 Rezidențial, 05 Retro / Fălțuită, 06 Industrial, 07 Șipcă, 08 Speciale 2 ML, 09 Speciale ML | 2.889 | 2.888 | 1 | 5 (+ 2 produse fără cod deloc) |
| 03 + 04 Pluvial (colorat, mat, Magnelis) | 138 | 138 | 0 | 0 |
| 02 Auxiliare (verificare pe preț în familia de produse) | 102 | 101 | — | 1 neregăsit |

## Diferențe reale
1. **ASCFRMAT050** — Set coș fum Retro, mat 0,50: PDF 19,62 € · ListaPret 23,26 €. Seria PDF (0,45 = 18,80 · 0,50 = 19,62 · 0,60 = 22,23) sugerează că ListaPret e greșit. De clarificat cu Bilka.

## În PDF, fără cod în ListaPret
- Bordură fronton sub țiglă 312 mm (toate finisajele) — nu există ca produs în ListaPret.
- Paravânt de bază 312 mm (toate finisajele) — nu există ca produs în ListaPret.
- Bordură la perete 178 / 208 / 250 mm, dubluvopsit lucios SSAB 0,60 (industrial) — lipsesc codurile DPL060 (există doar DPM060).
- Șipcă Oslo, SSAB 0,60 lucios (1,65 €) și mat (2,06 €) — familia SIPCA nu are codurile.
- Dispozitiv de fălțuit Retropanel 19,50 € — preț neregăsit în familia uneltelor.

## În ListaPret, de ignorat la import
- `REPROSSB060` — dublură a `REPROSPX060` cu preț `#VALUE!`.
- Prețuri 0: Cârlig răsucit Aluzinc 125 / 150, Sinus 18 lucios 0,70, T12 UZG 0,35, tablă plană UZG 0,35.

## Convenții de cod descoperite (necesare importului și exportului)
- SSAB 0,60: `DPL060` / `DPM060` la accesorii și la T45 (mat); `SPX060` / `MPX060` la Retro Plus / Panel, fălțuită, tablă plană, T8 / T18 / T35 / T45 (lucios); ambele convenții coexistă.
- Zincat: `ZNC` la accesorii și la T18 / S18 / T35 / T45; `ZN2` la T8 / T12 / tablă plană de 1,20 m; `ZN1` = uz gospodăresc (0,96 m, prețuri în RON).
- Pluvial: brida `…BRIDA0000`, prelungitor `…PRE09010M` / `…PRE10010M`, cârlig 150/300 `…C30150TAB`, derivație `DERIV…`.
- Retro: dolie `ADR41` / `ADR62`, semicoamă `ASR31` (PDF spune 370 mm), bordură streașină `ASTR2` / `ASTR3`, opritor tip bară `AOZRB2ML000`, piesă conectare `APCOZRB0000`.
- Accesorii coamă: `AXCAP…000` capac; `AXINC…000` închidere mare, `AXINC…MIC` închidere mică.

## Decizii Ionuț (04.09.2026)
- Sursa de import: ListaPret din formular; PDF-urile rămân verificare la fiecare actualizare (scriptul de mai sus).
- Doar modulul de țiglă 35 cm; 37,5 și 40 rămân în formular pentru cazuri rare.
- Fără Portal Bilka. Ferestrele (Fakro, Velux, Optilight) nu intră sub Bilka — compartimente separate. Profilele zincate nu intră în soft (prețuri verbale, săptămânale).
- Declanșatorul actualizării: primirea unui formular nou (la modificări generale de preț).
- Culorile disponibile pe grosimi și produse: text separat de la Ionuț; până atunci referința e matricea COMBCUL.

---

## Reconciliere: 3.183 poziții în PDF-uri față de 7.583 rânduri în ListaPret (05.09.2026)

Numărătoare exactă (nu estimare): cele 9 PDF-uri conțin **3.183** poziții de preț. ListaPret conține întreaga listă de prețuri SAP a contului, din care:

| Grup | Rânduri | În PDF | Intră în soft |
|---|---|---|---|
| Profile zincate Z / C / U / L / Sigma | 3.768 | nu | nu |
| Fakro 167 · Velux 102 · Optilight 37 | 306 | nu | nu (ferestrele rămân compartimente separate) |
| Pluvial Aluzinc | 37 | nu | de confirmat |
| Uz gospodăresc + T10 stoc marfă (RON) | 32 | nu | nu |
| T153 | 4 | nu | nu |
| Produsele din cele 9 liste PDF | 3.436 | da | da, minus unelte (17) |

Diferența 3.436 − 3.183 = 253, explicată: 149 accesorii speciale ML în grosimi 0,75–1,50 mm · 29 variante zincate suplimentare · 8 variante T12 (PDF are doar 0,40) · 8 variante șipcă (0,60 Berna / Sofia, 0,70, „SSAB 0,57") · ~25 diverse (accesorii 0,70, Sinus 0,70 cu preț 0, rând dublat) · ~35 poziții prezente în PDF dar neverificate automat (etichete rupte în tabel: Retro dripstop / soundcontrol, accesorii industriale zincate, opritor omega) — de verificat manual la listele respective.

Propunere de import: 3.419 coduri (3.436 − unelte), din care ~3.200 **active** (cele din PDF-uri) și ~210 **inactive** (doar în ListaPret; activabile la nevoie). Grupurile excluse nu se importă.

Decizii Ionuț (05.09.2026): produsele de uz gospodăresc și uneltele de tinichigerie nu apar în soft.
