# Reguli de culori și disponibilitate — Bilka

9 septembrie 2026 · Anexă la fișa CATALOG ȘI PREȚURI · Sursa: textul lui Ionuț „Culori și modele Bilka" (09.09.2026)
Fișier de import: `docs/import/bilka/culori-finisaj-grosime.csv` (119 rânduri: finisaj × grosime × culoare)

## 1. Cum funcționează în soft

Două lucruri separate, ambele din date, niciunul din cod:

1. **Ce se poate produce** (model × finisaj × grosime) = **rândurile de preț** din listele PDF. Cascada model → finisaj → grosime arată doar ce are rând de preț; nu e nevoie de o listă separată. Textul tău de producție a fost folosit ca **verificare** a rândurilor de preț (vezi §3).
2. **Ce culori are fiecare finisaj la fiecare grosime** = tabelul din textul tău, importat ca atare (fișierul de mai sus). Culoarea se alege după grosime, din lista finisajului. RAL 8003 e finisaj separat cu culoarea 8003; Wood are culorile lui pe grosime; zincat = ZINC; Magnelis = MAGNELIS.
3. **Excepții pe produs** (pluvial, holțșuruburi, calote, benzi coamă, coș de ventilare, bandă bituminoasă colorată) rămân în coloana `culori_disponibile` a produsului și au prioritate față de tabelul general.

Matricea din formular (COMBCUL) rămâne referință tehnică — ce acceptă SAP-ul la comandă — nu sursa listelor de la ofertă: conține și culori la cerere, și câteva combinații atipice.

## 2. Textul tău față de matricea Bilka — decis 10.09.2026

| Finisaj / grosime | La tine | În matricea Bilka | Observație |
|---|---|---|---|
| dubluvopsit mat SSAB 0,60 | …, 9003 | …, 9005 | greșeală de tastare confirmată: **9005** |
| mat 0,45 | are 6005 | fără 6005 (6005 doar la 0,50) | **nu** există la 0,45 — scos |
| Wood 0,50 | Black Wood | Black Wood + Palisander Golden | rămâne **doar Black Wood** |
| lucios 0,60 | 7016, 9002 | + 9006, 9010 | nu se includ |
| lucios 0,70 | 9002, 9006 | + 7016, 9007, 2011 | nu se includ |
| lucios 0,50 | lista standard | + 1015, 3000, 7035, 7040, 9007 | la cerere — nu le punem |
| mat 0,60 | lista standard | + 9004 | la cerere — nu o punem |
| dubluvopsit lucios SSAB 0,60 | lista standard | + 9007 | la cerere — nu o punem |

Regulă: listele tale sunt cele de la ofertă; culorile în plus din matrice nu apar în liste (o culoare specială se cere prin observație pe linie).

## 3. Producția pe modele față de rândurile de preț

Am comparat fiecare model din textul tău cu rândurile din CSV-urile listelor (= PDF): **identic** la Clasic, Dacic (și grupul lui), Romanic, T8, T12, T18 / T35 / T45, Retro Plus, Retro Panel, fălțuită, Oslo, Haga / Berna / Sofia.

Decizii (10.09.2026):
1. **Sinus 18 zincat 0,70** nu se include (scos din lista 06).
2. **Dripstop la țiglă** doar la Clasic, Balcanic, Gotic, Iberic.
3. **Retro Duo** ca în PDF: fără dubluvopsit, Magnelis, soundcontrol.
4. **Fălțuita** fără dripstop și soundcontrol.

## 4. Consecință pentru CSV-uri

Toate rândurile de 0,60 mm dubluvopsit poartă acum eticheta „SSAB" în toate listele (înainte lipsea la S18, T8–T45 și Retro, unde codul Bilka e DPL / DPM 060 în loc de SPX / MPX).

## 5. Garanții și straturi (din tabelul tehnic Bilka)

Fișier: `docs/import/bilka/garantii-finisaj-grosime.csv` — ani de garanție, strat de zinc (g/mp), strat de vopsea (µm exterior / interior) pe finisaj × grosime, plus garanțiile pluvialului. Se afișează la ofertă (unde anume: fișa OFERTARE).
