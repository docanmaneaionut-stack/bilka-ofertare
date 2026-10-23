# Verificarea achiziției pe facturi Bilka

Versiunea 1.1 · 23 octombrie 2026 · Scrisă de Claude (chat) din 21 de facturi Bilka reale trimise de Ionuț (23.10.2026: 16 + 5 pentru lămurirea §5) · Precondiția (a) a Etapei 2 din PLAN.
Fișiere: `docs/verificari/facturi-bilka-2026-10-randuri.csv` (toate cele 259 de rânduri), `docs/verificari/facturi-bilka-2026-10-totaluri.csv` (21 de facturi), unealta `docs/tools/verificare_facturi_bilka.py` (de rulat la fiecare listă nouă, cu facturi proaspete). Facturile PDF rămân la Ionuț, nu intră în depozit.

## 1. Concluzia

**Baza de pornire a ofertării este corectă.** Prețul de catalog (lista de achiziție Bilka, EUR fără TVA, `docs/import/Bilka/`) înmulțit cu cursul de pe factură (BNR + 1 %) dă **exact** prețul facturat în lei, la ban, pe **237 din 246** rânduri de produse; 2 rânduri diferă cu 1 ban (rotunjirea coalei de tablă plană, §4); 7 rânduri, toate pe o singură factură și toate accesorii RAL 8019 mat, sunt facturate **mai ieftin** decât catalogul — **eroare de facturare la Bilka**, dovedită de o altă factură cu aceleași produse la preț corect (§5); catalogul nu se schimbă. În afara celor 2 bani de rotunjire la coală, niciun rând nu e facturat mai scump decât catalogul. Nicio reducere, niciun adaos ascuns: **lista de achiziție = prețul plătit.**

Pe totaluri: 18 facturi din 21 identice la ban (după scăderea paleților), 2 cu 1 ban diferență (rotunjire), 1 cu −43,86 lei (−0,62 %, factura cu accesoriile 8019 mat).

| Ce s-a verificat | Rezultat |
|---|---|
| Facturi | 21, emise 13–22.10.2026 către Proroof Comp SRL, 259 de rânduri (246 produse + 13 paleți) |
| Produse distincte (coduri Bilka) | 101: țiglă (Clasic, Dacic, Iberic, Hellenic), tablă cutată T35 și T8, tablă plană (coală), accesorii standard (coamă, borduri, colector, opritor, dolie, fixarea plăcilor, set coș fum, capac coamă), accesorii speciale 2 ML (D02–D10), accesorii speciale ML (D07–D25), pluvial colorat, mat și Magnelis, fixare și etanșare (holțșuruburi, mastic, folie, benzi, spray), șipcă Oslo |
| Valoare produse (fără TVA, fără paleți) | 91.932,66 lei facturat · 91.976,50 lei așteptat după catalog · diferență −43,84 lei (−0,05 %): −43,86 din §5, +0,02 din rotunjirea coalei (§4) |
| Potrivirea pe cod | facturile Bilka **nu au coduri de material**, doar denumiri SAP (ex. `TIGLA METALICA CLASIC 35 RAL 8017MAT 0.50 MM`); potrivirea s-a făcut pe denumire → model / tip accesoriu / dimensiune / finisaj / grosime; toate cele 246 de rânduri s-au potrivit fără ambiguitate |
| Aritmetica facturii | valoare = preț unitar (2 zecimale) × cantitate, rotunjit la ban — corect pe toate rândurile, cu excepția coalei (§4); suma rândurilor = totalul facturii pe toate cele 21 |

## 2. Cursul de pe factură

Cursul Bilka = **cursul BNR × 1,01**, cu cursul BNR **cel mai recent publicat în momentul facturării** (BNR publică la ora 13:00; facturile de dimineață poartă cursul zilei precedente):

| Data facturii | Curs factură | Curs BNR folosit | Ziua cursului BNR | BNR × 1,01 |
|---|---|---|---|---|
| 13.10 (marți) | 5,39067 | 5,3373 | 12.10 (ziua precedentă) | 5,390673 |
| 16.10 (vineri) | 5,39040 | 5,3370 | 15.10 (ziua precedentă) | 5,39037 → afișat rotunjit la 4 zecimale |
| 19.10 (luni) | 5,39017 | 5,3368 | 16.10 (ziua lucrătoare precedentă) | 5,390168 |
| 20.10 | 5,38179 | 5,3285 | 20.10 (aceeași zi) | 5,381785 |
| 21.10 | 5,38300 | 5,3297 | 21.10 | 5,382997 |
| 22.10 | 5,40198 | 5,3485 | 22.10 | 5,401985 |

Cursurile BNR sunt luate de pe curs-valutar-bnr.ro și bugetul.ro (verificate încrucișat pe 20 și 21.10). Rotunjirea cursului la Bilka nu e uniformă (4 zecimale pe 16.10, 5 în rest — probabil introdus manual), dar diferența (≤ 0,00003 lei / EUR) nu schimbă niciun preț de pe facturi.

**Pentru soft** (regula din FISA-CONTURI §7 și FISA-OFERTARE 11 e confirmată): preț de achiziție în lei = preț catalog EUR × (BNR × 1,01), cursul păstrat cu 4 zecimale, prețul rotunjit la 2 zecimale. Cursul BNR „al zilei" este cel publicat la 13:00: până la acea oră, cursul curent e cel din ziua precedentă — softul preia cursul după 13:00 (cu reîncercare) și între timp folosește ultimul curs preluat, exact ca practica Bilka. Pe ofertă rămâne cursul BNR brut (fără 1 %), conform fișei.

## 3. Cantitățile

- Țigla, tabla cutată și tabla plană la mp cu **3 zecimale** (ex. 131,406 mp Hellenic; 37,107 mp T35) — la fel ca regula din FISA-OFERTARE 3 (lungime × bucăți × lățime totală, 3 zecimale).
- Accesoriile standard și speciale 2 ML la bucată (2 m); accesoriile speciale la lungimi și șipca la **metru liniar cu 3 zecimale** (ex. 3,300 m; 119,000 m) — confirmă UM-urile din catalog (ML).
- Holțșuruburile la cutie (250 buc.), folia la bucată (= rolă), mastic / benzi / spray la bucată.
- Paleții: `PALET LEMN` 400,00 lei și `PALET LEMN -EURO` 30,00 lei, rânduri separate pe factură, fără TVA diferit — în soft rămân în afara catalogului (ambalaj), se scad la comparații.

## 4. Rotunjirea coalei de tablă plană (1 ban, acceptată)

Bilka calculează prețul coalei (1,25 × 2,00 m = 2,5 mp) ca **preț / mp rotunjit în lei × 2,5**, păstrat cu 3 zecimale în calculul valorii: lucios 0,45 → 5,86 × 5,38179 = 31,537 → 31,54 lei / mp × 2,5 = 78,85 lei (factura 9002503122); mat 0,50 → 6,54 × 5,40198 = 35,329 → 35,33 × 2,5 = 88,325 → afișat 88,33, valoare 2 buc. = 176,65 (factura 9002506296). Softul are coala ca produs propriu la 2,5 × prețul / mp în EUR (14,65 / 16,35 EUR), deci dă 78,84 / 88,32 — **1 ban diferență pe coală**, documentată; nu merită o regulă specială. Dacă se dorește identic cu Bilka, prețul coalei în lei = round(round(EUR/mp × curs, 2) × 2,5, 2).

## 5. Accesoriile RAL 8019 mat de pe factura 9002504593 — eroare de facturare la Bilka

Pe o singură factură (21.10, Hellenic 8019 mat), 7 accesorii standard `RAL 8019MAT 0.50MM` sunt facturate la **prețul de lucios 0,50**, deși țigla și tabla T8 de pe aceeași factură sunt la prețul de mat 0,50 (6,54 EUR, corect):

| Produs | Facturat | = EUR | Catalog mat 0,50 | Catalog lucios 0,50 |
|---|---|---|---|---|
| Coamă mică | 25,35 lei | 4,709 | 4,90 | 4,71 |
| Bordură fronton 250 mm | 20,29 lei | 3,769 | 3,92 | 3,77 |
| Colector fronton 156 mm | 12,70 lei | 2,359 | 2,45 | 2,36 |
| Bordură streașină 208 mm | 16,90 lei | 3,140 | 3,27 | 3,14 |
| Bordură la perete 250 mm | 20,29 lei | 3,769 | 3,92 | 3,77 |
| Fixarea plăcilor pe zid 250 mm | 20,29 lei | 3,769 | 3,92 | 3,77 |
| Opritor zăpadă 208 mm / 2 m | 16,90 lei | 3,140 | 3,27 | 3,14 |

**Dovada (23.10, a doua tranșă de facturi):** factura **9002499007 din 16.10.2026** conține exact aceleași produse — Hellenic 8019 mat 0,50 cu coamă mică, bordură fronton 312, bordură streașină 208 și bordură la perete 208, toate `RAL 8019MAT 0.50MM` — facturate la prețul de **mat** 0,50, identic cu catalogul (26,41 lei = 4,90 EUR; 17,63 lei = 3,27 EUR). Deci 8019 mat nu are un preț special: pe factura din 21.10 Bilka a aplicat din greșeală prețurile de lucios la accesoriile mat (−43,86 lei, în favoarea noastră). Pe celelalte 19 facturi, aceleași accesorii mat 0,50 în RAL 8017, 3005, 7016, 9005 și 8019 sunt la prețul de catalog mat (4,90, 3,92, 2,45, 3,27). **Catalogul rămâne pe prețul de listă**; e o eroare punctuală de facturare, de semnalat (sau nu) la Bilka — decizia lui Ionuț.

## 6. Alte confirmări utile

- **Set coș fum mat 0,50** (standard): facturat 105,99 lei = 19,62 EUR × 5,40198 → confirmă prețul din PDF (19,62), nu pe cel din formularul v10 (23,26) — același caz ca la setul Retro notat în `VERIFICARE-PRETURI-BILKA.md`; setul Retro nu apare pe aceste facturi, dar are același preț de listă.
- **Pluvial**: codurile de culoare Bilka cu sufix (`RAL 8019-387`, `3005-781`, `8017-434`, `9005-015`) și cele cu `MAT` sunt facturate la același preț, egal cu prețul de catalog pentru pluvial colorat și pluvial mat (identice în listă). Magnelis la prețul lui propriu (ex. jgheab 125 / 4 m 7,41 EUR).
- **Accesorii speciale**: 2 ML facturate pe intervalul de desfășurată (`101-150MM` = D03), la lungimi pe treapta D (`ML D10`), ambele la prețul exact din listele 08 / 09 pentru finisaj × grosime; Grande Mat există doar la 0,50 (fără grosime pe factură) — regula din catalog se confirmă.
- **Denumirile SAP Bilka** urmează un tipar stabil: `<produs> <dimensiune> RAL <culoare><finisaj> <grosime>`, fără finisaj = lucios, `GDM` / `GRANDEMAT` = Grande Mat, `DPM` / `DPL` = dubluvopsit mat / lucios, `MAGNELIS`. Unealta din `docs/tools/` le recunoaște pe toate cele întâlnite; la un tip nou de produs, rândul apare „NEPOTRIVIT" și se adaugă o regulă.

## 7. Ce urmează

1. §5 e lămurit: eroare punctuală la Bilka, nu regulă; Ionuț decide dacă o semnalează.
2. Precondiția (b) a Etapei 2: ofertele-model (`docs/ETALON.md`), construite pe produse și prețuri de aici — verificarea de față le dă baza de achiziție certă.
3. La fiecare listă Bilka nouă: după import, 5–10 facturi proaspete prin `docs/tools/verificare_facturi_bilka.py` — raportul trebuie să dea din nou „exact" pe toate rândurile.

## Anexă — totalurile pe factură (lei, fără TVA)

| Factura | Data | Curs | Rânduri produse | Total factură | Paleți | Produse facturat | Produse după catalog | Diferență | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| 9002492128 | 13.10.2026 | 5,39067 | 16 | 12.606,16 | 400,00 | 12.206,16 | 12.206,16 | 0,00 | identic |
| 9002492139 | 13.10.2026 | 5,39067 | 16 | 2.354,50 | 400,00 | 1.954,50 | 1.954,50 | 0,00 | identic |
| 9002498989 | 16.10.2026 | 5,39040 | 5 | 686,08 | 0,00 | 686,08 | 686,08 | 0,00 | identic |
| 9002499002 | 16.10.2026 | 5,39040 | 3 | 2.276,10 | 0,00 | 2.276,10 | 2.276,10 | 0,00 | identic |
| 9002499007 | 16.10.2026 | 5,39040 | 7 | 4.353,37 | 400,00 | 3.953,37 | 3.953,37 | 0,00 | identic |
| 9002499646 | 19.10.2026 | 5,39017 | 8 | 1.433,70 | 0,00 | 1.433,70 | 1.433,70 | 0,00 | identic |
| 9002500681 | 19.10.2026 | 5,39017 | 24 | 10.524,57 | 400,00 | 10.124,57 | 10.124,57 | 0,00 | identic |
| 9002500699 | 19.10.2026 | 5,39017 | 32 | 12.953,96 | 400,00 | 12.553,96 | 12.553,96 | 0,00 | identic |
| 9002503122 | 20.10.2026 | 5,38179 | 7 | 721,91 | 0,00 | 721,91 | 721,90 | 0,01 | 1 ban (coală, §4) |
| 9002503131 | 20.10.2026 | 5,38179 | 10 | 2.822,08 | 400,00 | 2.422,08 | 2.422,08 | 0,00 | identic |
| 9002503134 | 20.10.2026 | 5,38179 | 2 | 4.283,41 | 400,00 | 3.883,41 | 3.883,41 | 0,00 | identic |
| 9002503138 | 20.10.2026 | 5,38179 | 1 | 151,20 | 0,00 | 151,20 | 151,20 | 0,00 | identic |
| 9002503140 | 20.10.2026 | 5,38179 | 10 | 578,76 | 0,00 | 578,76 | 578,76 | 0,00 | identic |
| 9002504589 | 21.10.2026 | 5,38300 | 1 | 741,62 | 30,00 | 711,62 | 711,62 | 0,00 | identic |
| 9002504593 | 21.10.2026 | 5,38300 | 21 | 7.469,96 | 400,00 | 7.069,96 | 7.113,82 | -43,86 | eroare Bilka la 8019 mat (§5) |
| 9002504600 | 21.10.2026 | 5,38300 | 14 | 2.227,48 | 400,00 | 1.827,48 | 1.827,48 | 0,00 | identic |
| 9002504610 | 21.10.2026 | 5,38300 | 1 | 221,25 | 0,00 | 221,25 | 221,25 | 0,00 | identic |
| 9002506296 | 22.10.2026 | 5,40198 | 22 | 10.899,30 | 400,00 | 10.499,30 | 10.499,29 | 0,01 | 1 ban (coală, §4) |
| 9002506384 | 22.10.2026 | 5,40198 | 6 | 4.586,60 | 0,00 | 4.586,60 | 4.586,60 | 0,00 | identic |
| 9002506907 | 22.10.2026 | 5,40198 | 12 | 2.739,79 | 400,00 | 2.339,79 | 2.339,79 | 0,00 | identic |
| 9002506908 | 22.10.2026 | 5,40198 | 28 | 12.130,86 | 400,00 | 11.730,86 | 11.730,86 | 0,00 | identic |
| **Total** | | | **246** | **96.762,66** | **4.830,00** | **91.932,66** | **91.976,50** | **-43,84** | |
