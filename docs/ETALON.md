# ETALON — ofertele-model ale motorului de calcul

Versiunea 1.3 · 28 octombrie 2026 (E01–E11 aprobate și **toate la zero în motor** după S10, commit a186ef9; R2 și R4 precizate la S9; R6 completată la S10 cu totalul în lei al facturii; E09 recalculat cu adaosul păstrat ca procent cu 4 zecimale; fișiere format v1.2) · Scris de Claude (chat) · Precondiția (b) a Etapei 2 din PLAN.
Fiecare ofertă-model are: intrările (produse reale din catalog, cantități, cont, client, țintă, mod de prezentare, curs), calculul pas cu pas după FISA-OFERTARE cap. 11 (v1.1) și rezultatul așteptat, cifră cu cifră. Când Ionuț o aprobă („așa aș vinde"), devine test pentru Code (`docs/etalon/E0x.json`). Statusuri: PROPUS → APROBAT (data) · corecturile schimbă întâi fișa, apoi exemplul. Calculul de referință e făcut de mână (Python, Decimal), independent de codul softului.

## 0. Regulile comune (toate exemplele) — deciziile lui Ionuț din 23.10.2026 sunt incluse

| Nr | Regula | Sursa |
|---|---|---|
| R1 | **Două cursuri, înghețate pe ofertă**: cursul **documentului** = cursul BNR al zilei (4 zecimale) — la el se afișează prețurile în euro și „Total în lei"; cursul **de achiziție** = BNR × 1,01 (4 zecimale) — la el se calculează achiziția contului. BNR publică la 13:00; până atunci cursul zilei e cel din ziua precedentă (practica Bilka). | FISA-OFERTARE 11.8 (v1.1); decizia D1 |
| R2 | **Achiziția contului** (EUR, fără TVA, pe unitate) = preț de bază × (1 + adaosul % al contului) × (1 + grupa %), **rotunjit la 2 zecimale**. E prețul „oficial" al contului: pe el stă garda, el e costul din tabelul de vânzări (fără grupă). Agentul îl vede **în lei, cu TVA**: achiziție × curs de achiziție × 1,21, **o singură rotunjire** la 2 zecimale (nu se rotunjește lei-ul fără TVA pe drum). Totalurile de achiziție = suma valorilor rotunjite pe linie (achiziție × cantitate, 2 zecimale) — aritmetica documentului se verifică linie cu linie. | FISA-CONTURI §7; FISA-OFERTARE 11.2, 11.3, 11.6; decizia D2 |
| R3 | **Ținta și marja se calculează în lei.** Achiziția totală în lei = Σ(achiziție × cantitate) × cursul de achiziție; ținta = suma discutată cu TVA (lei) sau achiziția × (1 + adaos %); adaos real = ținta ÷ achiziție − 1; marja = ținta − achiziția (lei cu TVA). Adaos implicit propus: 20 %. | FISA-OFERTARE 11.2 |
| R4 | **Documentul în euro la cursul documentului**, pornind de la lei-ul fără TVA: ținta fără TVA (lei) = ținta ÷ 1,21, 2 zecimale; total fără TVA (EUR) = ținta fără TVA ÷ curs BNR, 2 zecimale; TVA (EUR) = fără TVA × 21 %, 2 zecimale; total cu TVA (EUR) = suma lor. (Formulare precizată la S9: citirea „cu TVA = ținta ÷ curs, apoi fără TVA” dă la E11 3.280,34 în loc de 3.280,33.) | FISA-OFERTARE 11.8, 13.2 |
| R5 | **Prezentare simplă**: liniile cu **preț fix** rămân cum au fost scrise (fixul se poate da și ca „achiziție + x %"); liniile libere primesc preț = achiziție × coeficient, unde coeficientul = (total fără TVA EUR − valoarea liniilor fixe) ÷ achiziția EUR a liniilor libere; prețuri și valori la 2 zecimale. **Restul de rotunjire** (sub ~1,5 EUR) se repartizează +0,01 EUR/unitate pe liniile libere **la bucată** (niciodată pe mp sau ml), alese descrescător după cantitate, astfel încât suma cantităților alese = restul în cenți; apoi, pe linia cu cantitatea cea mai mică, câți cenți întregi pe unitate mai încap. Ce nu se poate plasa în cenți întregi (oferte mici, cantități pare — E06) rămâne **abatere**: totalul fără TVA al documentului diferă cu 1 cent de R4, iar totalul în lei afișat rămâne cel din R6. În rest, totalul fără TVA al documentului = R4, exact. | FISA-OFERTARE 11.2, 11.4, 11.5 |
| R6 | **Total în lei pe document**: ținta = sumă și liniile ating exact totalul în euro (fără abatere) → se afișează **suma discutată, exact** (total EUR × curs poate diferi cu 1–3 bani din conversia la 2 zecimale — acceptat, iar tabelul de facturare, în lei cu prețuri unitare la 4 zecimale, reproduce exact totalul); ținta = sumă dar restul nu s-a putut repartiza (abatere, R5) → totalul în lei **„cât iese"**, calculat din linii (Ionuț, 23.10: „o rotunjire care nu se poate matematic nu ajută — n-aș putea factura"); ținta = adaos % → total EUR × curs, cu bani, „cât iese". **Același principiu pe tabelul de facturare** (precizat la S10, E07): totalul în lei al facturii = totalul în lei al ofertei + liniile preluate din zona B, în lei cu TVA, așa cum au fost scrise (sau desfăcute din TVA) — **nu** totalul EUR al facturii × curs, care poate diferi cu câțiva bani; lei-ul e ce plătește clientul. | FISA-OFERTARE 11.8, 13.5; deciziile D3, din 23.10 seara și din 28.10 (S10) |
| R7 | **Garda**: niciun preț de pe document sub achiziția reală a contului (fără grupă) convertită la cursul documentului. | FISA-OFERTARE 11.6 |
| R8 | **Cantități**: mp = Σ(lungime × bucăți) × lățimea totală, 3 zecimale; accesorii la bucată; ml cu 3 zecimale. | FISA-OFERTARE 3.2, 3.6 |

Deciziile lui Ionuț (23.10.2026), scrise în FISA-OFERTARE v1.1: **D1** cursul documentului = BNR al zilei, achiziția la BNR + 1 % · **D2** achiziția contului la 2 zecimale · **D3** totalul în lei conform țintei (sumă → exact; procent → cât iese) · prețul fix „achiziție + x %" pe linie (țigla la cel mult + 5 % când clientul compară lei / mp) · adaos țintă ideal 20–25 %, după context.

---

## E01 — Acoperiș complet țiglă Iberic mat 0,50 RAL 3005 · client persoană fizică · agent 1 % · sumă discutată 17.000 lei · prezentare simplă — APROBAT (Ionuț, 23.10.2026: „prețul sună corect")

**De unde vine:** comanda reală de pe factura Bilka 9002506908 (22.10.2026) — produsele și cantitățile sunt exact cele cumpărate; panotajul l-am reconstruit (lungimi plauzibile care dau exact 180,481 mp). Culoarea e cea de pe factură (RAL 3005 mat; pluvial colorat 3005). Fișier: `docs/etalon/E01.json`. Ionuț, 23.10: „prețul sună corect".

### Intrări
- Data ofertei 22.10.2026 · **curs BNR 5,3485** (cursul documentului) · curs de achiziție **5,4020** · TVA 21 %.
- Cont: **Agent, adaos 1 %**; grupă: goală. Client: persoană fizică. Prezentare: **simplu**. Țintă: **17.000 lei cu TVA**.
- Învelitoarea principală: Țiglă metalică Iberic – mat – 0,50 mm – RAL 3005, **panotaj** 4,20 m × 15 · 3,10 m × 20 · 2,75 m × 8 · 1,19 m × 5 (48 de coli, 152,95 m) × lățime 1,18 m = **180,481 mp**.
- Învelitoare secundară (aceeași culoare → același pachet): Tablă cutată T8 (perete) – mat – 0,50 mm – RAL 3005, panotaj 2,50 m × 2 × lățime 1,20 m = **6,000 mp**.
- Accesorii standard, special 2 ML, fixare și etanșare (moștenesc 3005 mat 0,50), sistem pluvial 125/90 colorat 3005 — cantitățile din tabel.

### Pasul 1 — achiziția contului (ce vede agentul)
Pe fiecare linie: bază × 1,01, 2 zecimale (R2); afișat în lei cu TVA la cursul de achiziție. **Total achiziție cont: 2.193,52 EUR = 11.849,40 lei fără TVA = 14.337,77 lei cu TVA.** (Bilka a facturat efectiv 2.171,60 EUR; diferența e adaosul contului de 1 %.)

### Pasul 2 — ținta (în lei)
17.000 − 14.337,77 = **marjă 2.662,23 lei**; **adaos real 18,57 %** (17.000 ÷ 14.337,77 − 1).

### Pasul 3 — documentul în euro (la cursul BNR 5,3485)
17.000 ÷ 5,3485 = **3.178,46 EUR cu TVA** → fără TVA **2.626,83** (+ TVA 551,63) (R4). Coeficient de prezentare pe liniile libere: 2.626,83 ÷ 2.193,52 = **1,197541** (apare ca 19,75 % în euro, pentru că achiziția e la cursul de achiziție, mai mare). Rest de rotunjire 1,14 EUR → +0,01 EUR/buc pe cârlig jgheab (56), brida jgheab (50), element îmbinare (8). Total fără TVA = 2.626,83, exact.

| Nr | Rubrica | Produs | UM | Cant, | Bază EUR | Achiziție cont EUR | Achiziție lei cu TVA (ecran) | Preț document EUR | Valoare EUR |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Învelitori | Țiglă metalică Iberic – mat – 0,50 mm | mp | 180,481 | 6,79 | 6,86 | 44,84 | 8,22 | 1483,55 |
| 2 | Învelitori | Tablă cutată T8 (perete) – mat – 0,50 mm | mp | 6,000 | 6,54 | 6,61 | 43,21 | 7,92 | 47,52 |
| 3 | Accesorii standard | Coamă mică – mat – 0,50 mm | buc | 13 | 4,90 | 4,95 | 32,36 | 5,93 | 77,09 |
| 4 | Accesorii standard | Bordură fronton – 360 mm / 2 m – mat – 0,50 mm | buc | 17 | 6,54 | 6,61 | 43,21 | 7,92 | 134,64 |
| 5 | Accesorii standard | Colector fronton – 156 mm / 2 m – mat – 0,50 mm | buc | 16 | 2,45 | 2,47 | 16,14 | 2,96 | 47,36 |
| 6 | Accesorii standard | Bordură streașină – 208 mm / 2 m – mat – 0,50 mm | buc | 21 | 3,27 | 3,30 | 21,57 | 3,95 | 82,95 |
| 7 | Accesorii standard | Fixarea plăcilor pe zid – 250 mm / 2 m – mat – 0,50 mm | buc | 7 | 3,92 | 3,96 | 25,88 | 4,74 | 33,18 |
| 8 | Accesorii standard | Dolie – 417 mm / 2 m – mat – 0,50 mm | buc | 4 | 6,54 | 6,61 | 43,21 | 7,92 | 31,68 |
| 9 | Accesorii standard | Opritor zăpadă – 208 mm / 2 m – mat – 0,50 mm | buc | 12 | 3,27 | 3,30 | 21,57 | 3,95 | 47,40 |
| 10 | Accesorii standard | Set coș fum (4 piese × 1,25 m) – 4 piese × 1,25 m – mat – 0,50 mm | buc | 1 | 19,62 | 19,82 | 129,55 | 23,74 | 23,74 |
| 11 | Accesorii speciale 2 ML | Accesoriu special 2 ML – D05 (201–250 mm) – mat – 0,50 mm | buc | 2 | 4,41 | 4,45 | 29,09 | 5,33 | 10,66 |
| 12 | Fixare și etanșare | Holțșuruburi în culoare, lemn – 4,8 × 35 mm | cutie | 9 | 6,25 | 6,31 | 41,24 | 7,56 | 68,04 |
| 13 | Fixare și etanșare | Holțșuruburi în culoare, lemn – 4,8 × 20 mm | cutie | 1 | 6,25 | 6,31 | 41,24 | 7,56 | 7,56 |
| 14 | Fixare și etanșare | Spray corector 400 ml – mat | buc | 3 | 4,50 | 4,55 | 29,74 | 5,45 | 16,35 |
| 15 | Fixare și etanșare | Capac coamă – mat | buc | 4 | 3,94 | 3,98 | 26,01 | 4,77 | 19,08 |
| 16 | Fixare și etanșare | Bandă bituminoasă – 15 cm × 10 m | rolă | 3 | 11,35 | 11,46 | 74,91 | 13,72 | 41,16 |
| 17 | Fixare și etanșare | Mastic etanșare premium Bilka – 300 ml | buc | 3 | 6,05 | 6,11 | 39,94 | 7,32 | 21,96 |
| 18 | Sistem pluvial | Jgheab 125 / 4m – pluvial colorat (lucios) | buc | 10 | 8,71 | 8,80 | 57,52 | 10,54 | 105,40 |
| 19 | Sistem pluvial | Jgheab 125 / 2m – pluvial colorat (lucios) | buc | 1 | 4,36 | 4,40 | 28,76 | 5,27 | 5,27 |
| 20 | Sistem pluvial | Burlan 90 / 3m – pluvial colorat (lucios) | buc | 6 | 8,07 | 8,15 | 53,27 | 9,76 | 58,56 |
| 21 | Sistem pluvial | Cârlig jgheab 125 / 210 mm – pluvial colorat (lucios) | buc | 56 | 1,46 | 1,47 | 9,61 | 1,75 | 98,00 |
| 22 | Sistem pluvial | Brida jgheab – pluvial colorat (lucios) | buc | 50 | 0,68 | 0,69 | 4,51 | 0,82 | 41,00 |
| 23 | Sistem pluvial | Colier burlan 90 – pluvial colorat (lucios) | buc | 12 | 0,86 | 0,87 | 5,69 | 1,04 | 12,48 |
| 24 | Sistem pluvial | Capac jgheab 125 – pluvial colorat (lucios) | buc | 12 | 0,86 | 0,87 | 5,69 | 1,04 | 12,48 |
| 25 | Sistem pluvial | Element îmbinare jgheab 125 – pluvial colorat (lucios) | buc | 8 | 1,38 | 1,39 | 9,09 | 1,65 | 13,20 |
| 26 | Sistem pluvial | Racord jgheab – burlan 125 / 90 – pluvial colorat (lucios) | buc | 6 | 2,31 | 2,33 | 15,23 | 2,79 | 16,74 |
| 27 | Sistem pluvial | Cot de 60 grade 90 – pluvial colorat (lucios) | buc | 18 | 2,31 | 2,33 | 15,23 | 2,79 | 50,22 |
| 28 | Sistem pluvial | Prelungitor intermediar 90 / 1 m – pluvial colorat (lucios) | buc | 6 | 2,69 | 2,72 | 17,78 | 3,26 | 19,56 |

**Totaluri pe document:** Total fără TVA **2.626,83 EUR** · TVA 21 % **551,63 EUR** · Total cu TVA **3.178,46 EUR** · **Total în lei 17.000,00** (R6; 3.178,46 × 5,3485 = 16.999,99 — diferența de 1 ban e rotunjirea acceptată) · subsol: „Garanții: învelitoare 15 ani culoare și coroziune; sistem pluvial 15 ani culoare, 30 ani coroziune" · „Curs EURO – 5,3485".

### Ce intră în tabelul de vânzări (cap. 19) când oferta devine comandă
Preț vânzare 17.000,00 lei · Cost achiziție 14.337,77 lei (achiziția contului, cu TVA) · Adaos net 2.662,23 lei · Adaos brut 2.200,19 lei (net ÷ 1,21).

---

## E02 — Același acoperiș · ținta ca **adaos 20 %** · țigla cu **preț fix la achiziție + 5 %** · prezentare simplă — APROBAT (Ionuț, 23.10.2026)

Scopul: cazul descris de Ionuț — clientul compară prețul tablei pe mp, deci țigla nu poate purta mai mult de ~5 % adaos; restul liniilor poartă adaosul până la țintă. Fișier: `docs/etalon/E02.json`.

### Intrări
Identice cu E01 (aceleași produse, cantități, cont, cursuri), cu două schimbări: **ținta = adaos 20 %** (în loc de sumă) și **preț fix pe țiglă = achiziție reală + 5 %**.

### Calcul
- Achiziția contului, ca la E01: 14.337,77 lei cu TVA → **ținta = 14.337,77 × 1,20 = 17.205,32 lei cu TVA** („cât iese", R6) · marjă 2.867,55 lei.
- Documentul în euro: 17.205,32 ÷ 5,3485 = **3.216,85 EUR cu TVA** → fără TVA **2.658,55** (+ TVA 558,30).
- **Țigla, preț fix**: achiziția reală 6,86 EUR (la cursul de achiziție) = 6,93 EUR la cursul documentului; + 5 % = **7,28 EUR/mp** fără TVA (= 47,11 lei/mp cu TVA, față de 44,84 lei/mp achiziția contului și 44,38 lei/mp prețul de listă Bilka cu TVA la cursul lor) → valoare 1.313,90 EUR.
- Liniile libere trebuie să dea 2.658,55 − 1.313,90 = 1.344,65 EUR, de la o achiziție de 955,42 EUR → **coeficient 1,407392**: accesoriile, fixarea și pluvialul ies cu **+40,7 %** față de achiziția contului (în lei: +39,3 %). Rest de rotunjire 0,16 EUR → +0,01 pe colector fronton (16).

| Nr | Rubrica | Produs | UM | Cant, | Bază EUR | Achiziție cont EUR | Achiziție lei cu TVA (ecran) | Preț document EUR | Valoare EUR |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Învelitori | Țiglă metalică Iberic – mat – 0,50 mm | mp | 180,481 | 6,79 | 6,86 | 44,84 | 7,28 **(fix)** | 1313,90 |
| 2 | Învelitori | Tablă cutată T8 (perete) – mat – 0,50 mm | mp | 6,000 | 6,54 | 6,61 | 43,21 | 9,30 | 55,80 |
| 3 | Accesorii standard | Coamă mică – mat – 0,50 mm | buc | 13 | 4,90 | 4,95 | 32,36 | 6,97 | 90,61 |
| 4 | Accesorii standard | Bordură fronton – 360 mm / 2 m – mat – 0,50 mm | buc | 17 | 6,54 | 6,61 | 43,21 | 9,30 | 158,10 |
| 5 | Accesorii standard | Colector fronton – 156 mm / 2 m – mat – 0,50 mm | buc | 16 | 2,45 | 2,47 | 16,14 | 3,49 | 55,84 |
| 6 | Accesorii standard | Bordură streașină – 208 mm / 2 m – mat – 0,50 mm | buc | 21 | 3,27 | 3,30 | 21,57 | 4,64 | 97,44 |
| 7 | Accesorii standard | Fixarea plăcilor pe zid – 250 mm / 2 m – mat – 0,50 mm | buc | 7 | 3,92 | 3,96 | 25,88 | 5,57 | 38,99 |
| 8 | Accesorii standard | Dolie – 417 mm / 2 m – mat – 0,50 mm | buc | 4 | 6,54 | 6,61 | 43,21 | 9,30 | 37,20 |
| 9 | Accesorii standard | Opritor zăpadă – 208 mm / 2 m – mat – 0,50 mm | buc | 12 | 3,27 | 3,30 | 21,57 | 4,64 | 55,68 |
| 10 | Accesorii standard | Set coș fum (4 piese × 1,25 m) – 4 piese × 1,25 m – mat – 0,50 mm | buc | 1 | 19,62 | 19,82 | 129,55 | 27,89 | 27,89 |
| 11 | Accesorii speciale 2 ML | Accesoriu special 2 ML – D05 (201–250 mm) – mat – 0,50 mm | buc | 2 | 4,41 | 4,45 | 29,09 | 6,26 | 12,52 |
| 12 | Fixare și etanșare | Holțșuruburi în culoare, lemn – 4,8 × 35 mm | cutie | 9 | 6,25 | 6,31 | 41,24 | 8,88 | 79,92 |
| 13 | Fixare și etanșare | Holțșuruburi în culoare, lemn – 4,8 × 20 mm | cutie | 1 | 6,25 | 6,31 | 41,24 | 8,88 | 8,88 |
| 14 | Fixare și etanșare | Spray corector 400 ml – mat | buc | 3 | 4,50 | 4,55 | 29,74 | 6,40 | 19,20 |
| 15 | Fixare și etanșare | Capac coamă – mat | buc | 4 | 3,94 | 3,98 | 26,01 | 5,60 | 22,40 |
| 16 | Fixare și etanșare | Bandă bituminoasă – 15 cm × 10 m | rolă | 3 | 11,35 | 11,46 | 74,91 | 16,13 | 48,39 |
| 17 | Fixare și etanșare | Mastic etanșare premium Bilka – 300 ml | buc | 3 | 6,05 | 6,11 | 39,94 | 8,60 | 25,80 |
| 18 | Sistem pluvial | Jgheab 125 / 4m – pluvial colorat (lucios) | buc | 10 | 8,71 | 8,80 | 57,52 | 12,39 | 123,90 |
| 19 | Sistem pluvial | Jgheab 125 / 2m – pluvial colorat (lucios) | buc | 1 | 4,36 | 4,40 | 28,76 | 6,19 | 6,19 |
| 20 | Sistem pluvial | Burlan 90 / 3m – pluvial colorat (lucios) | buc | 6 | 8,07 | 8,15 | 53,27 | 11,47 | 68,82 |
| 21 | Sistem pluvial | Cârlig jgheab 125 / 210 mm – pluvial colorat (lucios) | buc | 56 | 1,46 | 1,47 | 9,61 | 2,07 | 115,92 |
| 22 | Sistem pluvial | Brida jgheab – pluvial colorat (lucios) | buc | 50 | 0,68 | 0,69 | 4,51 | 0,97 | 48,50 |
| 23 | Sistem pluvial | Colier burlan 90 – pluvial colorat (lucios) | buc | 12 | 0,86 | 0,87 | 5,69 | 1,22 | 14,64 |
| 24 | Sistem pluvial | Capac jgheab 125 – pluvial colorat (lucios) | buc | 12 | 0,86 | 0,87 | 5,69 | 1,22 | 14,64 |
| 25 | Sistem pluvial | Element îmbinare jgheab 125 – pluvial colorat (lucios) | buc | 8 | 1,38 | 1,39 | 9,09 | 1,96 | 15,68 |
| 26 | Sistem pluvial | Racord jgheab – burlan 125 / 90 – pluvial colorat (lucios) | buc | 6 | 2,31 | 2,33 | 15,23 | 3,28 | 19,68 |
| 27 | Sistem pluvial | Cot de 60 grade 90 – pluvial colorat (lucios) | buc | 18 | 2,31 | 2,33 | 15,23 | 3,28 | 59,04 |
| 28 | Sistem pluvial | Prelungitor intermediar 90 / 1 m – pluvial colorat (lucios) | buc | 6 | 2,69 | 2,72 | 17,78 | 3,83 | 22,98 |

**Totaluri pe document:** Total fără TVA **2.658,55 EUR** · TVA **558,30 EUR** · Total cu TVA **3.216,85 EUR** · **Total în lei 17.205,32** (cu bani — ținta e procent). Garda: toate liniile peste achiziția reală.

### Confirmarea lui Ionuț (23.10.2026)
„De cele mai multe ori facturăm la un minim de adaos țigla și diferența o distribuim pe celelalte produse. În cazuri specifice avem prețuri anume pentru anumite produse, când discuția cu beneficiarul a fost în această direcție. Atât timp cât avem un total acceptat de client și 1–2 produse cu preț specific, singura variantă este să distribuim pe celelalte produse adaosul." → **Regula rămâne exact așa** (R5): prețurile fixe sunt litera legii, restul liniilor absorb diferența până la țintă, fără plafon pe categorii. Accesoriile la +40 % sunt consecința normală, nu o anomalie.

---

## E03 — **Colaborator** (adaos cont 5 %) · T35 mat 0,50 RAL 9005 cu accesorii, pluvial și **accesorii speciale la lungimi** · țintă **adaos 12 %** · prezentare simplă — APROBAT (Ionuț, 23.10.2026)

Scopul: contul de Colaborator (FISA-CONTURI: adaosul lui negociat, aici 5 %, nu vede niciodată baza sau procentul), cantități la **metru liniar** (lungime × bucăți → ml, 3 zecimale) și o ofertă mică, unde rotunjirile se văd. Produsele: comanda reală T35 de pe factura 9002503131 (20.10.2026) plus două accesorii la lungimi din 9002506384. Fișier: `docs/etalon/E03.json`.

### Intrări
- Data ofertei 20.10.2026 · **curs BNR 5,3285** · curs de achiziție **5,3818** · TVA 21 %.
- Cont: **Colaborator, adaos 5 %**; grupă goală. Clientul colaboratorului: persoană fizică. Prezentare: simplu. Țintă: **adaos 12 %** (marja colaboratorului față de achiziția lui).
- Învelitoare: Tablă cutată T35 (acoperiș) – mat – 0,50 mm – RAL 9005, panotaj 5,70 m × 6 × lățime 1,085 m = **37,107 mp**.
- Accesorii standard și speciale 2 ML (moștenesc 9005 mat 0,50), fixare, pluvial 125/90 colorat 9005; **accesorii speciale la lungimi** cu culoare proprie pe rând (RAL 9002 lucios 0,50): D11 3,00 m × 4 = **12,000 ml**, D08 2,00 m × 4 = **8,000 ml**.

### Calcul
- Achiziția colaboratorului: bază × 1,05, 2 zecimale (T35: 6,94 → 7,29 EUR; colierul 0,86 → 0,90, adică +4,65 % din cauza rotunjirii — acceptat prin D2). **Total 576,16 EUR = 3.100,78 lei fără TVA = 3.751,94 lei cu TVA.**
- Ținta: 3.751,94 × 1,12 = **4.202,17 lei cu TVA** · marjă 450,23 lei.
- Documentul în euro: 4.202,17 ÷ 5,3285 = **788,62 EUR cu TVA** → fără TVA **651,75** (+ TVA 136,87); coeficient 651,75 ÷ 576,16 = **1,131196**; rest de rotunjire 0,06 EUR → +0,01 pe burlan (6). Total în lei „cât iese": 788,62 × 5,3285 = **4.202,16** (1 ban sub ținta calculată — rotunjire, R6).

| Nr | Rubrica | Produs | UM | Cant. | Bază EUR | Achiziție cont EUR | Achiziție lei cu TVA (ecran) | Preț document EUR | Valoare EUR |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Învelitori | Tablă cutată T35 (acoperiș / perete) – mat – 0,50 mm | mp | 37,107 | 6,94 | 7,29 | 47,47 | 8,25 | 306,13 |
| 2 | Accesorii standard | Bordură fronton – 312 mm / 2 m – mat – 0,50 mm | buc | 4 | 4,90 | 5,15 | 33,54 | 5,83 | 23,32 |
| 3 | Accesorii speciale 2 ML | Accesoriu special 2 ML – D08 (351–400 mm) – mat – 0,50 mm | buc | 5 | 7,06 | 7,41 | 48,25 | 8,38 | 41,90 |
| 4 | Accesorii speciale 2 ML | Accesoriu special 2 ML – D09 (401–450 mm) – mat – 0,50 mm | buc | 5 | 7,94 | 8,34 | 54,31 | 9,43 | 47,15 |
| 5 | Fixare și etanșare | Holțșuruburi în culoare, lemn – 4,8 × 35 mm | cutie | 1 | 6,25 | 6,56 | 42,72 | 7,42 | 7,42 |
| 6 | Fixare și etanșare | Bandă etanșare profilată T35 – coamă | buc | 10 | 1,10 | 1,16 | 7,55 | 1,31 | 13,10 |
| 7 | Sistem pluvial | Burlan 90 / 3m – pluvial colorat (lucios) | buc | 6 | 8,07 | 8,47 | 55,16 | 9,57 | 57,42 |
| 8 | Sistem pluvial | Colier burlan 90 – pluvial colorat (lucios) | buc | 12 | 0,86 | 0,90 | 5,86 | 1,02 | 12,24 |
| 9 | Sistem pluvial | Cot de 60 grade 90 – pluvial colorat (lucios) | buc | 6 | 2,31 | 2,43 | 15,82 | 2,75 | 16,50 |
| 10 | Sistem pluvial | Prelungitor intermediar 90 / 1 m – pluvial colorat (lucios) | buc | 3 | 2,69 | 2,82 | 18,36 | 3,19 | 9,57 |
| 11 | Accesorii speciale la lungimi (ML) | Accesoriu special la metru liniar – D11 (501–550 mm) – lucios – 0,50 mm | ml | 12,000 | 5,53 | 5,81 | 37,83 | 6,57 | 78,84 |
| 12 | Accesorii speciale la lungimi (ML) | Accesoriu special la metru liniar – D08 (351–400 mm) – lucios – 0,50 mm | ml | 8,000 | 4,02 | 4,22 | 27,48 | 4,77 | 38,16 |

**Totaluri pe document:** Total fără TVA **651,75 EUR** · TVA **136,87 EUR** · Total cu TVA **788,62 EUR** · **Total în lei 4.202,16** · „Curs EURO – 5,3285" · garanții: T35 mat 0,50 → 15 ani culoare și coroziune; pluvial colorat 15 / 30.

### Decizia lui Ionuț (23.10.2026), scrisă în FISA-OFERTARE cap. 19
„La colaboratori este esențial să își obțină prețul de achiziție; dacă au nevoie de ofertă, o construiesc la fel ca un agent, de la prețul de achiziție afișat. Ce vinde colaboratorul apare ca vânzare în contul Administratorului, iar adaosul din tabelul de vânzări este de la prețul de bază la prețul de achiziție al colaboratorului. Colaboratorul nu are nevoie de tabel de vânzări." → În E03, rândul din tabelul Administratorului: Preț vânzare **3.751,94 lei** (achiziția colaboratorului, cu TVA) · Cost achiziție **3.572,21 lei** (baza: 548,56 EUR × 5,3818 × 1,21) · Adaos net **179,73 lei** · Adaos brut 148,54 lei. Oferta lui către clientul final (4.202,16 lei) nu intră în vânzările firmei.

---

## E04 — Același acoperiș ca E01 · sumă discutată 17.000 lei · prezentare **„listă + discount general 25 %"** — APROBAT (Ionuț, 23.10.2026: „de regulă folosim 25 % sau 30 %")

Scopul: al doilea mod de prezentare (FISA-OFERTARE 11.4) — pe document apar **prețuri de listă** și **un singur discount, la total**; după discount, totalul e exact ținta din E01. Nimic nu se schimbă la achiziție, țintă sau marjă; doar cum arată documentul. Discountul afișat uzual: 25 % sau 30 % (Ionuț). Fișier: `docs/etalon/E04.json`.

### Calcul
- Achiziție, țintă, document în euro: identice cu E01 (14.337,77 lei achiziție; 17.000 lei țintă; 2.626,83 EUR fără TVA după discount).
- **Totalul de listă** L e cel pentru care L − round(L × 25 %) = 2.626,83 → **L = 3.502,44 EUR**, discount **875,61 EUR**.
- Prețurile de listă pe linii: achiziție × (3.502,44 ÷ 2.193,52 = **1,596721**), 2 zecimale; rest de rotunjire 0,74 EUR → +0,01 pe cârlig (56) și cot (18). Suma valorilor de listă = 3.502,44, exact.
- Garda se verifică pe prețul **net** (listă × 0,75), nu pe cel de listă: toate liniile peste achiziția reală.

| Nr | Rubrica | Produs | UM | Cant. | Bază EUR | Achiziție cont EUR | Achiziție lei cu TVA (ecran) | Preț listă EUR | Valoare listă EUR |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Învelitori | Țiglă metalică Iberic – mat – 0,50 mm | mp | 180,481 | 6,79 | 6,86 | 44,84 | 10,95 | 1976,27 |
| 2 | Învelitori | Tablă cutată T8 (perete) – mat – 0,50 mm | mp | 6,000 | 6,54 | 6,61 | 43,21 | 10,55 | 63,30 |
| 3 | Accesorii standard | Coamă mică – mat – 0,50 mm | buc | 13 | 4,90 | 4,95 | 32,36 | 7,90 | 102,70 |
| 4 | Accesorii standard | Bordură fronton – 360 mm / 2 m – mat – 0,50 mm | buc | 17 | 6,54 | 6,61 | 43,21 | 10,55 | 179,35 |
| 5 | Accesorii standard | Colector fronton – 156 mm / 2 m – mat – 0,50 mm | buc | 16 | 2,45 | 2,47 | 16,14 | 3,94 | 63,04 |
| 6 | Accesorii standard | Bordură streașină – 208 mm / 2 m – mat – 0,50 mm | buc | 21 | 3,27 | 3,30 | 21,57 | 5,27 | 110,67 |
| 7 | Accesorii standard | Fixarea plăcilor pe zid – 250 mm / 2 m – mat – 0,50 mm | buc | 7 | 3,92 | 3,96 | 25,88 | 6,32 | 44,24 |
| 8 | Accesorii standard | Dolie – 417 mm / 2 m – mat – 0,50 mm | buc | 4 | 6,54 | 6,61 | 43,21 | 10,55 | 42,20 |
| 9 | Accesorii standard | Opritor zăpadă – 208 mm / 2 m – mat – 0,50 mm | buc | 12 | 3,27 | 3,30 | 21,57 | 5,27 | 63,24 |
| 10 | Accesorii standard | Set coș fum (4 piese × 1,25 m) – 4 piese × 1,25 m – mat – 0,50 mm | buc | 1 | 19,62 | 19,82 | 129,55 | 31,65 | 31,65 |
| 11 | Accesorii speciale 2 ML | Accesoriu special 2 ML – D05 (201–250 mm) – mat – 0,50 mm | buc | 2 | 4,41 | 4,45 | 29,09 | 7,11 | 14,22 |
| 12 | Fixare și etanșare | Holțșuruburi în culoare, lemn – 4,8 × 35 mm | cutie | 9 | 6,25 | 6,31 | 41,24 | 10,08 | 90,72 |
| 13 | Fixare și etanșare | Holțșuruburi în culoare, lemn – 4,8 × 20 mm | cutie | 1 | 6,25 | 6,31 | 41,24 | 10,08 | 10,08 |
| 14 | Fixare și etanșare | Spray corector 400 ml – mat | buc | 3 | 4,50 | 4,55 | 29,74 | 7,27 | 21,81 |
| 15 | Fixare și etanșare | Capac coamă – mat | buc | 4 | 3,94 | 3,98 | 26,01 | 6,35 | 25,40 |
| 16 | Fixare și etanșare | Bandă bituminoasă – 15 cm × 10 m | rolă | 3 | 11,35 | 11,46 | 74,91 | 18,30 | 54,90 |
| 17 | Fixare și etanșare | Mastic etanșare premium Bilka – 300 ml | buc | 3 | 6,05 | 6,11 | 39,94 | 9,76 | 29,28 |
| 18 | Sistem pluvial | Jgheab 125 / 4m – pluvial colorat (lucios) | buc | 10 | 8,71 | 8,80 | 57,52 | 14,05 | 140,50 |
| 19 | Sistem pluvial | Jgheab 125 / 2m – pluvial colorat (lucios) | buc | 1 | 4,36 | 4,40 | 28,76 | 7,03 | 7,03 |
| 20 | Sistem pluvial | Burlan 90 / 3m – pluvial colorat (lucios) | buc | 6 | 8,07 | 8,15 | 53,27 | 13,01 | 78,06 |
| 21 | Sistem pluvial | Cârlig jgheab 125 / 210 mm – pluvial colorat (lucios) | buc | 56 | 1,46 | 1,47 | 9,61 | 2,36 | 132,16 |
| 22 | Sistem pluvial | Brida jgheab – pluvial colorat (lucios) | buc | 50 | 0,68 | 0,69 | 4,51 | 1,10 | 55,00 |
| 23 | Sistem pluvial | Colier burlan 90 – pluvial colorat (lucios) | buc | 12 | 0,86 | 0,87 | 5,69 | 1,39 | 16,68 |
| 24 | Sistem pluvial | Capac jgheab 125 – pluvial colorat (lucios) | buc | 12 | 0,86 | 0,87 | 5,69 | 1,39 | 16,68 |
| 25 | Sistem pluvial | Element îmbinare jgheab 125 – pluvial colorat (lucios) | buc | 8 | 1,38 | 1,39 | 9,09 | 2,22 | 17,76 |
| 26 | Sistem pluvial | Racord jgheab – burlan 125 / 90 – pluvial colorat (lucios) | buc | 6 | 2,31 | 2,33 | 15,23 | 3,72 | 22,32 |
| 27 | Sistem pluvial | Cot de 60 grade 90 – pluvial colorat (lucios) | buc | 18 | 2,31 | 2,33 | 15,23 | 3,73 | 67,14 |
| 28 | Sistem pluvial | Prelungitor intermediar 90 / 1 m – pluvial colorat (lucios) | buc | 6 | 2,69 | 2,72 | 17,78 | 4,34 | 26,04 |

**Totaluri pe document:** Total listă fără TVA **3.502,44 EUR** · **Discount 25 % −875,61 EUR** · Total fără TVA **2.626,83 EUR** · TVA **551,63 EUR** · Total cu TVA **3.178,46 EUR** · **Total în lei 17.000,00** · „Curs EURO – 5,3485". Pe document, țigla apare la **10,95 EUR/mp listă** (în E01, simplu: 8,22 net) — același ban încasat, altă poveste pe hârtie.

---

## E05 — Același acoperiș · oferta „la fabrică": agent 1 % + **grupă 5 %** · țintă **adaos 2 %** peste achiziția afișată · prezentare simplă — APROBAT (Ionuț, 23.10.2026, cu procedura de mai jos)

Scopul: „Grupa" din FISA-OFERTARE 11.3. **Procedura, în cuvintele lui Ionuț (23.10.2026):** „În zona de introducere produse agentul trece grupa cât consideră el. Pe zona de țintă apare ca și cost de achiziție: costul de achiziție al agentului + grupa (5 % de exemplu) — la un acoperiș de 10.000 lei, achiziția contului în zona de țintă 10.500. El se tocmește cu acel client la un preț de vânzare peste acel preț și introduce ținta, 10.800 să spunem. Clientul comunică că e de acord. Agentul poate șterge ulterior grupa și vedea costul de achiziție. În tabelul de vânzări apare costul de achiziție [real] și prețul de vânzare (ținta). Deci agentul poate vedea adaosul real; grupa e un instrument pentru el ca să maximizeze adaosul la anumite vânzări, și deci și comisionul lui." Grupa e deci un instrument **al agentului**, ascuns doar față de client; nimic nu se ascunde de agent. Fișier: `docs/etalon/E05.json`.

### Calcul
- Achiziția **afișată** agentului: bază × 1,01 × 1,05, 2 zecimale (țigla 6,79 → **7,20 EUR**, 47,06 lei/mp cu TVA) → **2.303,15 EUR = 15.054,36 lei cu TVA**. Achiziția **reală** a contului (fără grupă): 2.193,52 EUR = 14.337,77 lei cu TVA — pe ea stă garda și ea e costul din tabelul de vânzări.
- Ținta +2 %: 15.054,36 × 1,02 = **15.355,45 lei**; marja **afișată** agentului 301,09 lei. Marja **reală** a firmei: 15.355,44 − 14.337,77 = **1.017,67 lei = 7,10 %** (grupa + cei 2 %).
- Documentul: 15.355,45 ÷ 5,3485 = 2.870,98 EUR cu TVA → 2.372,71 fără TVA; coeficient 2.372,71 ÷ 2.303,15 = 1,030203; rest 0,45 EUR → +0,01 pe bordură streașină (21), cot (18), burlan (6). Total în lei „cât iese": **15.355,44**.

| Nr | Rubrica | Produs | UM | Cant. | Bază EUR | Achiziție cont EUR | Achiziție lei cu TVA (ecran) | Preț document EUR | Valoare EUR |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Învelitori | Țiglă metalică Iberic – mat – 0,50 mm | mp | 180,481 | 6,79 | 7,20 | 47,06 | 7,42 | 1339,17 |
| 2 | Învelitori | Tablă cutată T8 (perete) – mat – 0,50 mm | mp | 6,000 | 6,54 | 6,94 | 45,36 | 7,15 | 42,90 |
| 3 | Accesorii standard | Coamă mică – mat – 0,50 mm | buc | 13 | 4,90 | 5,20 | 33,99 | 5,36 | 69,68 |
| 4 | Accesorii standard | Bordură fronton – 360 mm / 2 m – mat – 0,50 mm | buc | 17 | 6,54 | 6,94 | 45,36 | 7,15 | 121,55 |
| 5 | Accesorii standard | Colector fronton – 156 mm / 2 m – mat – 0,50 mm | buc | 16 | 2,45 | 2,60 | 16,99 | 2,68 | 42,88 |
| 6 | Accesorii standard | Bordură streașină – 208 mm / 2 m – mat – 0,50 mm | buc | 21 | 3,27 | 3,47 | 22,68 | 3,56 | 74,76 |
| 7 | Accesorii standard | Fixarea plăcilor pe zid – 250 mm / 2 m – mat – 0,50 mm | buc | 7 | 3,92 | 4,16 | 27,19 | 4,29 | 30,03 |
| 8 | Accesorii standard | Dolie – 417 mm / 2 m – mat – 0,50 mm | buc | 4 | 6,54 | 6,94 | 45,36 | 7,15 | 28,60 |
| 9 | Accesorii standard | Opritor zăpadă – 208 mm / 2 m – mat – 0,50 mm | buc | 12 | 3,27 | 3,47 | 22,68 | 3,57 | 42,84 |
| 10 | Accesorii standard | Set coș fum (4 piese × 1,25 m) – 4 piese × 1,25 m – mat – 0,50 mm | buc | 1 | 19,62 | 20,81 | 136,02 | 21,44 | 21,44 |
| 11 | Accesorii speciale 2 ML | Accesoriu special 2 ML – D05 (201–250 mm) – mat – 0,50 mm | buc | 2 | 4,41 | 4,68 | 30,59 | 4,82 | 9,64 |
| 12 | Fixare și etanșare | Holțșuruburi în culoare, lemn – 4,8 × 35 mm | cutie | 9 | 6,25 | 6,63 | 43,34 | 6,83 | 61,47 |
| 13 | Fixare și etanșare | Holțșuruburi în culoare, lemn – 4,8 × 20 mm | cutie | 1 | 6,25 | 6,63 | 43,34 | 6,83 | 6,83 |
| 14 | Fixare și etanșare | Spray corector 400 ml – mat | buc | 3 | 4,50 | 4,77 | 31,18 | 4,91 | 14,73 |
| 15 | Fixare și etanșare | Capac coamă – mat | buc | 4 | 3,94 | 4,18 | 27,32 | 4,31 | 17,24 |
| 16 | Fixare și etanșare | Bandă bituminoasă – 15 cm × 10 m | rolă | 3 | 11,35 | 12,04 | 78,70 | 12,40 | 37,20 |
| 17 | Fixare și etanșare | Mastic etanșare premium Bilka – 300 ml | buc | 3 | 6,05 | 6,42 | 41,96 | 6,61 | 19,83 |
| 18 | Sistem pluvial | Jgheab 125 / 4m – pluvial colorat (lucios) | buc | 10 | 8,71 | 9,24 | 60,40 | 9,52 | 95,20 |
| 19 | Sistem pluvial | Jgheab 125 / 2m – pluvial colorat (lucios) | buc | 1 | 4,36 | 4,62 | 30,20 | 4,76 | 4,76 |
| 20 | Sistem pluvial | Burlan 90 / 3m – pluvial colorat (lucios) | buc | 6 | 8,07 | 8,56 | 55,95 | 8,81 | 52,86 |
| 21 | Sistem pluvial | Cârlig jgheab 125 / 210 mm – pluvial colorat (lucios) | buc | 56 | 1,46 | 1,55 | 10,13 | 1,60 | 89,60 |
| 22 | Sistem pluvial | Brida jgheab – pluvial colorat (lucios) | buc | 50 | 0,68 | 0,72 | 4,71 | 0,74 | 37,00 |
| 23 | Sistem pluvial | Colier burlan 90 – pluvial colorat (lucios) | buc | 12 | 0,86 | 0,91 | 5,95 | 0,94 | 11,28 |
| 24 | Sistem pluvial | Capac jgheab 125 – pluvial colorat (lucios) | buc | 12 | 0,86 | 0,91 | 5,95 | 0,94 | 11,28 |
| 25 | Sistem pluvial | Element îmbinare jgheab 125 – pluvial colorat (lucios) | buc | 8 | 1,38 | 1,46 | 9,54 | 1,50 | 12,00 |
| 26 | Sistem pluvial | Racord jgheab – burlan 125 / 90 – pluvial colorat (lucios) | buc | 6 | 2,31 | 2,45 | 16,01 | 2,52 | 15,12 |
| 27 | Sistem pluvial | Cot de 60 grade 90 – pluvial colorat (lucios) | buc | 18 | 2,31 | 2,45 | 16,01 | 2,51 | 45,18 |
| 28 | Sistem pluvial | Prelungitor intermediar 90 / 1 m – pluvial colorat (lucios) | buc | 6 | 2,69 | 2,85 | 18,63 | 2,94 | 17,64 |

**Totaluri pe document:** Total fără TVA **2.372,71 EUR** · TVA **498,27** · Total cu TVA **2.870,98 EUR** · **Total în lei 15.355,44**. Grupa nu apare nicăieri pe document. **Tabel de vânzări (al agentului și al Administratorului):** vânzare 15.355,44 · cost 14.337,77 (achiziția reală, fără grupă) · adaos net **1.017,67** · brut 841,05 lei — adaosul real, pe care agentul îl vede și pe care se calculează comisionul lui. În zona de țintă, cât timp grupa e completată, marja afișată e 301,09 lei (față de achiziția cu grupă); după ce șterge grupa, vede 1.017,67. Clientul vede țigla la 7,42 EUR/mp = 48,02 lei/mp cu TVA — „prețul de fabrică" așa cum i-l prezintă agentul.

---

## E06 — **Șipcă de gard Oslo** dreaptă mat 0,50 RAL 7016 · **varianta Calcul** · agent 1 % · sumă discutată 1.000 lei · prezentare simplă — APROBAT (Ionuț, 23.10.2026: la abatere, totalul în lei „cât iese")

Scopul: FISA-OFERTARE cap. 8 — bucăți = tronson ÷ (lățimea șipcii + distanța), rotunjit în sus; ml = bucăți × lungimea șipcii; și o ofertă **mică**, unde rotunjirile nu încap toate (R5, abaterea). Produsul e cel de pe factura 9002504589 (119 ml Oslo dreaptă 7016 mat). Fișier: `docs/etalon/E06.json`.

### Intrări
- Data 21.10.2026 · **curs BNR 5,3297** · achiziție la 5,3830 · agent 1 % · client PF · simplu · țintă **1.000 lei cu TVA**.
- Șipcă Oslo, capăt drept, mat 0,50, RAL 7016; lățimea șipcii din catalog **92,9 mm**. Tronsoane: (1) șipcă de 1,20 m, tronson 11,00 m, distanță 25 mm → 11.000 ÷ 117,9 = 93,3 → **94 buc** → 112,800 ml; (2) șipcă 1,20 m, tronson 0,70 m, distanță 25 mm → 5,9 → **6 buc** → 7,200 ml. Total **100 buc, 120,000 ml**. Plus 2 cutii holțșuruburi 4,8 × 35 în culoare.

### Calcul
- Achiziție: șipcă 1,11 → 1,12 EUR/ml (7,30 lei/ml cu TVA), holțșuruburi 6,31 → total **147,02 EUR = 957,61 lei cu TVA**.
- Ținta 1.000 lei → marjă **42,39 lei**, adaos **4,43 %**. Document: 1.000 ÷ 5,3297 = 187,63 EUR cu TVA → 155,07 fără TVA.
- Linii: șipcă 1,12 × 1,0547 = **1,18 EUR/ml** (141,60); holțșuruburi 6,66 → rest 0,15 EUR: +0,01 (×2) și încă +6 cenți/unitate pe holțșuruburi → **6,73**; rămâne **1 cent nerepartizabil** (singura linie la bucată are cantitate pară) → total fără TVA **155,06** în loc de 155,07 (abatere, R5); TVA 32,56; cu TVA 187,62 EUR; × 5,3297 = **999,96 lei** → pe document **Total în lei 999,96** („cât iese", R6 — ținta nu poate fi atinsă matematic cu prețuri la 2 zecimale pe aceste două linii). Softul îi arată agentului: „totalul rezultat 999,96 lei (ținta 1.000,00 nu se poate atinge exact)".

| Nr | Rubrica | Produs | UM | Cant. | Bază EUR | Achiziție cont EUR | Achiziție lei cu TVA (ecran) | Preț document EUR | Valoare EUR |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Șipcă gard | Șipcă Oslo – mat – 0,50 mm | ml | 120,000 | 1,11 | 1,12 | 7,30 | 1,18 | 141,60 |
| 2 | Fixare și etanșare | Holțșuruburi în culoare, lemn – 4,8 × 35 mm | cutie | 2 | 6,25 | 6,31 | 41,10 | 6,73 | 13,46 |

**Totaluri pe document:** Total fără TVA **155,06 EUR** · TVA **32,56** · Total cu TVA **187,62 EUR** · **Total în lei 999,96** · „Curs EURO – 5,3297" · garanție șipcă mat 0,50: 15 ani culoare și coroziune.

Decizia lui Ionuț (23.10.2026): „Abaterea de bani doar unde este posibilă; altfel oricum n-aș putea factura, deci nu ajută o rotunjire care nu se poate matematic." → R6 precizată: cu abatere pe linii, totalul în lei e cel calculat.

---

## E07 — Același acoperiș ca E01 + **zona B**: șipcă de lemn (preluată în factură) și manoperă prin terț (informativ) — APROBAT (Ionuț, 27.10.2026, cu nuanța de mai jos)

Scopul: FISA-OFERTARE cap. 9 — liniile libere din zona B, în lei, așa cum au fost scrise; „Supliment la ofertă" ca anexă; bifa „preia în factură"; nimic din zona B în tabelul de vânzări. Fișier: `docs/etalon/E07.json`.

### Intrări
Toate cele din E01 (17.000 lei materiale), plus două linii în zona B. **Nuanța lui Ionuț (27.10.2026):** liniile din zona B se completează integral manual — nimic precompletat; fiecare linie are **denumirea**, **unitatea de măsură** (scrisă manual: ml, mp, buc, lucrare…), **cantitatea**, **suma totală în lei** și, **separat pe fiecare linie**, opțiunile „conține TVA" și „preia în factură".
- „Șipcă lemn 4 × 5 cm, tratată" — UM **ml**, cantitate **320**, **1.850 lei**, „conține TVA": nu, **„preia în factură": da** (o furnizăm noi) → în factură: 320 ml × 5,78 lei (1.850 ÷ 320 = 5,7813 lei/ml fără TVA, 4 zecimale pe tabelul de facturare).
- „Manoperă montaj — prin terț colaborator" — UM **lucrare**, cantitate **1**, **9.500 lei**, „conține TVA": nu, „preia în factură": **nu** (informație pentru client; o facturează montatorul).

### Rezultat
- **Documentul de ofertă**: neschimbat față de E01 — totalul materialelor **17.000,00 lei**; pagina de **Supliment la ofertă** (anexă, doar pentru că există linii): șipcă lemn 1.850,00 lei · manoperă montaj 9.500,00 lei · **total supliment 11.350,00 lei**, cu precizările agentului.
- **Tabelul de facturare** (cap. 13.5): liniile ofertei + linia bifată, convertită la cursul documentului: 1.850 lei fără TVA ÷ 5,3485 = **345,89 EUR** → total factură fără TVA **2.972,72 EUR** · TVA **624,27** · cu TVA **3.596,99 EUR** = **19.238,50 lei**. **Regula totalului în lei al facturii** (precizată la S10, confirmată de Ionuț 28.10.2026): totalul în lei al ofertei + liniile preluate în lei cu TVA = 17.000 + 1.850 × 1,21 = **19.238,50**, la ban — nu totalul EUR al facturii × curs, care poate diferi cu câțiva bani din conversiile la 2 zecimale (aici, întâmplător, 3.596,99 × 5,3485 = 19.238,50 exact; pe oferta singură, 3.178,46 × 5,3485 = 16.999,99 față de 17.000,00 afișat — R6). Aceeași logică ca R6 — lei-ul e ce plătește clientul. Manopera nu intră.
- Dacă o linie ar avea „conține TVA" bifat (ex. manoperă 9.500 lei cu TVA), în factură ar intra 9.500 ÷ 1,21 = 7.851,24 lei fără TVA → 1.467,93 EUR; pe supliment rămâne 9.500 așa cum a fost scris.
- **Tabelul de vânzări**: identic cu E01 (vânzare 17.000 · cost 14.337,77) — zona B nu apare, nici linia preluată în factură.

---

## E08 — Același acoperiș ca E01 · prezentare **„discount per linie"**: 25 % pe toate liniile, **excepție** țigla 10 %, **preț fix** pe setul de coș de fum — APROBAT (Ionuț, 27.10.2026)

Scopul: al treilea mod de prezentare (FISA-OFERTARE 11.4 + 11.5): pe fiecare linie apar preț de listă, discount % și preț net; discountul e **presentare** (ancora), netul vine din calculul invers către țintă; excepțiile schimbă doar ancora liniei; prețul fix rămâne cum a fost scris (discount 0). Fișier: `docs/etalon/E08.json`.

### Calcul
- Setul de coș de fum fixat la **24,00 EUR** (în loc de 23,74 cât ar fi ieșit uniform) → liniile libere se împart la 2.626,83 − 24,00 = 2.602,83 EUR; coeficient 2.602,83 ÷ 2.173,70 = **1,197419**; rest 0,67 EUR → +0,01 pe cârlig (56), jgheab 4 m (10), holțșuruburi 4,8 × 20 (1).
- Preț listă = net ÷ (1 − discount), 2 zecimale: țigla 8,21 ÷ 0,90 = **9,12** (discount 10 %); coamă mică 5,93 ÷ 0,75 = **7,91** (25 %); setul fix: listă = net = 24,00, discount 0.
- Totalurile rămân cele din E01: fără TVA 2.626,83 · TVA 551,63 · cu TVA 3.178,46 EUR · **17.000,00 lei**.

| Nr | Rubrica | Produs | UM | Cant, | Achiziție cont EUR | Preț listă EUR | Discount % | Preț net EUR | Valoare EUR |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Învelitori | Țiglă metalică Iberic – mat – 0,50 mm | mp | 180,481 | 6,86 | 9,12 | 10 | 8,21 | 1481,75 |
| 2 | Învelitori | Tablă cutată T8 (perete) – mat – 0,50 mm | mp | 6,000 | 6,61 | 10,55 | 25 | 7,91 | 47,46 |
| 3 | Accesorii standard | Coamă mică – mat – 0,50 mm | buc | 13 | 4,95 | 7,91 | 25 | 5,93 | 77,09 |
| 4 | Accesorii standard | Bordură fronton – 360 mm / 2 m – mat – 0,50 mm | buc | 17 | 6,61 | 10,55 | 25 | 7,91 | 134,47 |
| 5 | Accesorii standard | Colector fronton – 156 mm / 2 m – mat – 0,50 mm | buc | 16 | 2,47 | 3,95 | 25 | 2,96 | 47,36 |
| 6 | Accesorii standard | Bordură streașină – 208 mm / 2 m – mat – 0,50 mm | buc | 21 | 3,30 | 5,27 | 25 | 3,95 | 82,95 |
| 7 | Accesorii standard | Fixarea plăcilor pe zid – 250 mm / 2 m – mat – 0,50 mm | buc | 7 | 3,96 | 6,32 | 25 | 4,74 | 33,18 |
| 8 | Accesorii standard | Dolie – 417 mm / 2 m – mat – 0,50 mm | buc | 4 | 6,61 | 10,55 | 25 | 7,91 | 31,64 |
| 9 | Accesorii standard | Opritor zăpadă – 208 mm / 2 m – mat – 0,50 mm | buc | 12 | 3,30 | 5,27 | 25 | 3,95 | 47,40 |
| 10 | Accesorii standard | Set coș fum (4 piese × 1,25 m) – 4 piese × 1,25 m – mat – 0,50 mm | buc | 1 | 19,82 | 24,00 | 0 | 24,00 **(fix)** | 24,00 |
| 11 | Accesorii speciale 2 ML | Accesoriu special 2 ML – D05 (201–250 mm) – mat – 0,50 mm | buc | 2 | 4,45 | 7,11 | 25 | 5,33 | 10,66 |
| 12 | Fixare și etanșare | Holțșuruburi în culoare, lemn – 4,8 × 35 mm | cutie | 9 | 6,31 | 10,08 | 25 | 7,56 | 68,04 |
| 13 | Fixare și etanșare | Holțșuruburi în culoare, lemn – 4,8 × 20 mm | cutie | 1 | 6,31 | 10,09 | 25 | 7,57 | 7,57 |
| 14 | Fixare și etanșare | Spray corector 400 ml – mat | buc | 3 | 4,55 | 7,27 | 25 | 5,45 | 16,35 |
| 15 | Fixare și etanșare | Capac coamă – mat | buc | 4 | 3,98 | 6,36 | 25 | 4,77 | 19,08 |
| 16 | Fixare și etanșare | Bandă bituminoasă – 15 cm × 10 m | rolă | 3 | 11,46 | 18,29 | 25 | 13,72 | 41,16 |
| 17 | Fixare și etanșare | Mastic etanșare premium Bilka – 300 ml | buc | 3 | 6,11 | 9,76 | 25 | 7,32 | 21,96 |
| 18 | Sistem pluvial | Jgheab 125 / 4m – pluvial colorat (lucios) | buc | 10 | 8,80 | 14,07 | 25 | 10,55 | 105,50 |
| 19 | Sistem pluvial | Jgheab 125 / 2m – pluvial colorat (lucios) | buc | 1 | 4,40 | 7,03 | 25 | 5,27 | 5,27 |
| 20 | Sistem pluvial | Burlan 90 / 3m – pluvial colorat (lucios) | buc | 6 | 8,15 | 13,01 | 25 | 9,76 | 58,56 |
| 21 | Sistem pluvial | Cârlig jgheab 125 / 210 mm – pluvial colorat (lucios) | buc | 56 | 1,47 | 2,36 | 25 | 1,77 | 99,12 |
| 22 | Sistem pluvial | Brida jgheab – pluvial colorat (lucios) | buc | 50 | 0,69 | 1,11 | 25 | 0,83 | 41,50 |
| 23 | Sistem pluvial | Colier burlan 90 – pluvial colorat (lucios) | buc | 12 | 0,87 | 1,39 | 25 | 1,04 | 12,48 |
| 24 | Sistem pluvial | Capac jgheab 125 – pluvial colorat (lucios) | buc | 12 | 0,87 | 1,39 | 25 | 1,04 | 12,48 |
| 25 | Sistem pluvial | Element îmbinare jgheab 125 – pluvial colorat (lucios) | buc | 8 | 1,39 | 2,21 | 25 | 1,66 | 13,28 |
| 26 | Sistem pluvial | Racord jgheab – burlan 125 / 90 – pluvial colorat (lucios) | buc | 6 | 2,33 | 3,72 | 25 | 2,79 | 16,74 |
| 27 | Sistem pluvial | Cot de 60 grade 90 – pluvial colorat (lucios) | buc | 18 | 2,33 | 3,72 | 25 | 2,79 | 50,22 |
| 28 | Sistem pluvial | Prelungitor intermediar 90 / 1 m – pluvial colorat (lucios) | buc | 6 | 2,72 | 4,35 | 25 | 3,26 | 19,56 |

**Pe document**, coloanele: Nr · Denumire · UM · Cantitate · Preț listă · Discount % · Preț net · Valoare; totalurile pe net. Un client care înmulțește listă × (1 − discount) regăsește netul (±1 cent din rotunjire — acceptat).

---

## E09 — **Varianta 2** a ofertei E01: Iberic **Grande Mat** în loc de mat, adaosul variantei de bază păstrat — APROBAT (Ionuț, 27.10.2026)

Scopul: FISA-OFERTARE 11.7 — „Creează variantă": aceeași ofertă, același număr (IB-0001, varianta 2), alt finisaj; accesoriile legate urmează cheia (Grande Mat 0,50), pluvialul rămâne (are culoarea lui); **adaosul % al variantei de bază**, păstrat ca **procent cu 4 zecimale** (E01: 17.000 ÷ 14.337,77 − 1 = 18,5680 %), se aplică pe noile prețuri de achiziție — lanțul de calcul e cel din R3 (achiziția în lei rotunjită, apoi × 1,185680) — și totul se recalculează. Fișier: `docs/etalon/E09.json`.

### Calcul
- Produsele Grande Mat: țigla 8,82 → achiziție 8,91 EUR (58,24 lei/mp cu TVA); coamă mică 6,43; bordură fronton 360 8,57; set coș fum 25,71; capac coamă Grande Mat 4,77; spray-ul rămâne cel mat (nu există Grande Mat). **Achiziție 2.706,11 EUR = 17.688,28 lei cu TVA** (față de 14.337,77 la mat).
- Adaosul păstrat 18,5680 % → **țintă 20.972,64 lei** (17.688,28 × 1,185680); marjă 3.284,36 lei. Documentul: 3.240,68 + TVA 680,54 = 3.921,22 EUR → **20.972,65 lei** („cât iese" — ținta e un procent). Rest 0,26 → +0,01 pe bordură streașină (21), dolie (4), set coș fum (1).

| Nr | Rubrica | Produs | UM | Cant. | Bază EUR | Achiziție cont EUR | Achiziție lei cu TVA (ecran) | Preț document EUR | Valoare EUR |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Învelitori | Țiglă metalică Iberic – Grande Mat – 0,50 mm | mp | 180,481 | 8,82 | 8,91 | 58,24 | 10,67 | 1925,73 |
| 2 | Învelitori | Tablă cutată T8 (perete) – Grande Mat – 0,50 mm | mp | 6,000 | 8,57 | 8,66 | 56,61 | 10,37 | 62,22 |
| 3 | Accesorii standard | Coamă mică – Grande Mat – 0,50 mm | buc | 13 | 6,43 | 6,49 | 42,42 | 7,77 | 101,01 |
| 4 | Accesorii standard | Bordură fronton – 360 mm / 2 m – Grande Mat – 0,50 mm | buc | 17 | 8,57 | 8,66 | 56,61 | 10,37 | 176,29 |
| 5 | Accesorii standard | Colector fronton – 156 mm / 2 m – Grande Mat – 0,50 mm | buc | 16 | 3,21 | 3,24 | 21,18 | 3,88 | 62,08 |
| 6 | Accesorii standard | Bordură streașină – 208 mm / 2 m – Grande Mat – 0,50 mm | buc | 21 | 4,29 | 4,33 | 28,30 | 5,18 | 108,78 |
| 7 | Accesorii standard | Fixarea plăcilor pe zid – 250 mm / 2 m – Grande Mat – 0,50 mm | buc | 7 | 5,14 | 5,19 | 33,92 | 6,22 | 43,54 |
| 8 | Accesorii standard | Dolie – 417 mm / 2 m – Grande Mat – 0,50 mm | buc | 4 | 8,57 | 8,66 | 56,61 | 10,36 | 41,44 |
| 9 | Accesorii standard | Opritor zăpadă – 208 mm / 2 m – Grande Mat – 0,50 mm | buc | 12 | 4,29 | 4,33 | 28,30 | 5,19 | 62,28 |
| 10 | Accesorii standard | Set coș fum (4 piese × 1,25 m) – 4 piese × 1,25 m – Grande Mat – 0,50 mm | buc | 1 | 25,71 | 25,97 | 169,75 | 31,09 | 31,09 |
| 11 | Accesorii speciale 2 ML | Accesoriu special 2 ML – D05 (201–250 mm) – Grande Mat – 0,50 mm | buc | 2 | 5,79 | 5,85 | 38,24 | 7,01 | 14,02 |
| 12 | Fixare și etanșare | Holțșuruburi în culoare, lemn – 4,8 × 35 mm | cutie | 9 | 6,25 | 6,31 | 41,24 | 7,56 | 68,04 |
| 13 | Fixare și etanșare | Holțșuruburi în culoare, lemn – 4,8 × 20 mm | cutie | 1 | 6,25 | 6,31 | 41,24 | 7,56 | 7,56 |
| 14 | Fixare și etanșare | Spray corector 400 ml – mat | buc | 3 | 4,50 | 4,55 | 29,74 | 5,45 | 16,35 |
| 15 | Fixare și etanșare | Capac coamă – Grande Mat | buc | 4 | 4,77 | 4,82 | 31,51 | 5,77 | 23,08 |
| 16 | Fixare și etanșare | Bandă bituminoasă – 15 cm × 10 m | rolă | 3 | 11,35 | 11,46 | 74,91 | 13,72 | 41,16 |
| 17 | Fixare și etanșare | Mastic etanșare premium Bilka – 300 ml | buc | 3 | 6,05 | 6,11 | 39,94 | 7,32 | 21,96 |
| 18 | Sistem pluvial | Jgheab 125 / 4m – pluvial colorat (lucios) | buc | 10 | 8,71 | 8,80 | 57,52 | 10,54 | 105,40 |
| 19 | Sistem pluvial | Jgheab 125 / 2m – pluvial colorat (lucios) | buc | 1 | 4,36 | 4,40 | 28,76 | 5,27 | 5,27 |
| 20 | Sistem pluvial | Burlan 90 / 3m – pluvial colorat (lucios) | buc | 6 | 8,07 | 8,15 | 53,27 | 9,76 | 58,56 |
| 21 | Sistem pluvial | Cârlig jgheab 125 / 210 mm – pluvial colorat (lucios) | buc | 56 | 1,46 | 1,47 | 9,61 | 1,76 | 98,56 |
| 22 | Sistem pluvial | Brida jgheab – pluvial colorat (lucios) | buc | 50 | 0,68 | 0,69 | 4,51 | 0,83 | 41,50 |
| 23 | Sistem pluvial | Colier burlan 90 – pluvial colorat (lucios) | buc | 12 | 0,86 | 0,87 | 5,69 | 1,04 | 12,48 |
| 24 | Sistem pluvial | Capac jgheab 125 – pluvial colorat (lucios) | buc | 12 | 0,86 | 0,87 | 5,69 | 1,04 | 12,48 |
| 25 | Sistem pluvial | Element îmbinare jgheab 125 – pluvial colorat (lucios) | buc | 8 | 1,38 | 1,39 | 9,09 | 1,66 | 13,28 |
| 26 | Sistem pluvial | Racord jgheab – burlan 125 / 90 – pluvial colorat (lucios) | buc | 6 | 2,31 | 2,33 | 15,23 | 2,79 | 16,74 |
| 27 | Sistem pluvial | Cot de 60 grade 90 – pluvial colorat (lucios) | buc | 18 | 2,31 | 2,33 | 15,23 | 2,79 | 50,22 |
| 28 | Sistem pluvial | Prelungitor intermediar 90 / 1 m – pluvial colorat (lucios) | buc | 6 | 2,69 | 2,72 | 17,78 | 3,26 | 19,56 |

**Totaluri pe document:** fără TVA **3.240,68 EUR** · TVA **680,54** · cu TVA **3.921,22 EUR** · **Total în lei 20.972,65** · garanții: Grande Mat 0,50 → 30 ani culoare și coroziune; pluvial colorat 15 / 30. Varianta e o versiune în istoricul ofertei; cea acceptată devine cea curentă.

---

## E10 — **Completare** la lucrarea E01, pe costul firmei (greșeală de măsurare): 2 coame, 1 cutie holțșuruburi, 10 cârlige, sumă de încasat **0** — APROBAT (Ionuț, 27.10.2026)

Scopul: FISA-OFERTARE 2b + 11.6 — completarea marcată (motiv: greșeală agent, pe costul nostru) e singura excepție de la gardă: poate fi sub achiziție, chiar 0; în tabelul de vânzări scade adaosul **lucrării** (oferta inițială + completările). Fișier: `docs/etalon/E10.json`.

### Calcul
- Liniile: coamă mică mat 0,50 × 2 (achiziție 4,95), holțșuruburi 4,8 × 35 × 1 (6,31), cârlig jgheab 125/210 × 10 (1,47) → **achiziție 30,91 EUR = 202,05 lei cu TVA**.
- Sumă de încasat **0 lei** → prețurile pe document 0,00; garda **nu se aplică** (pe o ofertă obișnuită aceleași linii la 0 ar fi refuzate). Document: 0,00 EUR, 0,00 lei; completarea poartă numărul ei și legătura „Completare la IB-0001".
- **Lucrarea E01 recalculată** în tabelul de vânzări: vânzare 17.000,00 + 0 = **17.000,00** · cost 14.337,77 + 202,05 = **14.539,82** · adaos net **2.460,18** (față de 2.662,23) · brut 2.033,21 lei. Comisionul agentului se calculează pe lucrare, deci scade și el.

---

## E11 — **Două pachete**: Clasic 8017 mat (casa) + Retro Plus 7016 mat cu accesorii proprii (garaj) · pluvial mat în **două culori** · agent 1 % · țintă 20 % — APROBAT (Ionuț, 27.10.2026)

Scopul: FISA-OFERTARE 3.3–3.5 — a doua învelitoare cu altă cheie **și** cu accesorii proprii = pachet separat; pluvialul: un formular per finisaj + culoare; **împachetarea o decide softul**, agentul vede doar „se vor genera 4 formulare" și de ce. Prețurile: ca de obicei (nimic special). Fișier: `docs/etalon/E11.json`.

### Intrări
- Învelitoarea principală: Clasic – mat – 0,50 – RAL 8017, panotaj 4,50 × 20 · 3,80 × 12 · 2,20 × 10, lățime 1,20 → **189,120 mp**; accesorii standard (coamă mică 12, bordură fronton 312 × 9, bordură streașină 23, opritor 10) și fixare (holțșuruburi 8 cutii, capac coamă 3) — moștenesc 8017 mat 0,50.
- Învelitoarea secundară: Retro Plus **Standard** – mat – 0,50 – RAL 7016, panotaj 5,10 × 11, lățime 0,542 → **30,406 mp**, cu **accesorii proprii** („Adaugă accesorii pentru învelitoarea secundară"): coamă Retro 417 × 4, bordură streașină Retro 312 × 6, holțșuruburi 2 cutii — moștenesc 7016 mat 0,50.
- Pluvial A: mat RAL 8017 (jgheab 4 m × 11, burlan × 7, cârlig × 56, colier × 14, racord × 7, cot × 21). Pluvial B („Adaugă sistem pluvial"): mat RAL 7016 (jgheab × 3, burlan × 2, cârlig × 15, colier × 4, cot × 6).

### Rezultat
- Prețuri: achiziție **2.236,81 EUR = 14.620,73 lei cu TVA** → țintă 20 % = 17.544,88 → document 2.711,02 + TVA 569,31 = 3.280,33 EUR → **17.544,85 lei**; rest 0,51 → +0,01 pe bordură streașină (23), cot (21), burlan (7).
- **Pachete** (decise de soft): **P1** Clasic 8017 + accesoriile și fixarea lui (7 linii, 1.525,35 EUR achiziție) · **P2** Retro Plus 7016 + accesoriile proprii (4 linii, 315,66 EUR) · **Pluvial A** 8017 (6 linii, 313,59 EUR) · **Pluvial B** 7016 (5 linii, 82,21 EUR).
- **Formulare Bilka la export**: 1) Clasic 8017 mat ca principală + P1; 2) Retro Plus Standard 7016 mat ca principală + accesoriile Retro — pachet separat (altă cheie **și** accesorii proprii); 3) pluvial mat 8017; 4) pluvial mat 7016. Dacă Retro ar fi fost tot 8017 mat, sau 7016 fără accesorii proprii, ar fi intrat ca secundară pe formularul 1 → 3 formulare.

| Nr | Rubrica | Produs | UM | Cant. | Bază EUR | Achiziție cont EUR | Achiziție lei cu TVA (ecran) | Preț document EUR | Valoare EUR |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Învelitori | Țiglă metalică Clasic – mat – 0,50 mm | mp | 189,120 | 6,54 | 6,61 | 43,21 | 8,01 | 1514,85 |
| 2 | Învelitori | Retro Plus (Standard, Micro-Ribs, Flat, Double Line) – mat – 0,50 mm | mp | 30,406 | 8,04 | 8,12 | 53,08 | 9,84 | 299,20 |
| 3 | Accesorii standard | Coamă mică – mat – 0,50 mm | buc | 12 | 4,90 | 4,95 | 32,36 | 6,00 | 72,00 |
| 4 | Accesorii standard | Bordură fronton – 312 mm / 2 m – mat – 0,50 mm | buc | 9 | 4,90 | 4,95 | 32,36 | 6,00 | 54,00 |
| 5 | Accesorii standard | Bordură streașină – 208 mm / 2 m – mat – 0,50 mm | buc | 23 | 3,27 | 3,30 | 21,57 | 4,01 | 92,23 |
| 6 | Accesorii standard | Opritor zăpadă – 208 mm / 2 m – mat – 0,50 mm | buc | 10 | 3,27 | 3,30 | 21,57 | 4,00 | 40,00 |
| 7 | Accesorii standard (învelitoarea secundară) | Coamă Retro – 417 mm / 2 m – mat – 0,50 mm | buc | 4 | 6,54 | 6,61 | 43,21 | 8,01 | 32,04 |
| 8 | Accesorii standard (învelitoarea secundară) | Bordură streașină Retro – 312 mm / 2 m – mat – 0,50 mm | buc | 6 | 4,90 | 4,95 | 32,36 | 6,00 | 36,00 |
| 9 | Fixare și etanșare | Holțșuruburi în culoare, lemn – 4,8 × 35 mm | cutie | 8 | 6,25 | 6,31 | 41,24 | 7,65 | 61,20 |
| 10 | Fixare și etanșare | Capac coamă – mat | buc | 3 | 3,94 | 3,98 | 26,01 | 4,82 | 14,46 |
| 11 | Fixare și etanșare (învelitoarea secundară) | Holțșuruburi în culoare, lemn – 4,8 × 35 mm | cutie | 2 | 6,25 | 6,31 | 41,24 | 7,65 | 15,30 |
| 12 | Sistem pluvial | Jgheab 125 / 4m – pluvial mat | buc | 11 | 8,71 | 8,80 | 57,52 | 10,67 | 117,37 |
| 13 | Sistem pluvial | Burlan 90 / 3m – pluvial mat | buc | 7 | 8,07 | 8,15 | 53,27 | 9,89 | 69,23 |
| 14 | Sistem pluvial | Cârlig jgheab 125 / 210 mm – pluvial mat | buc | 56 | 1,46 | 1,47 | 9,61 | 1,78 | 99,68 |
| 15 | Sistem pluvial | Colier burlan 90 – pluvial mat | buc | 14 | 0,86 | 0,87 | 5,69 | 1,05 | 14,70 |
| 16 | Sistem pluvial | Racord jgheab – burlan 125 / 90 – pluvial mat | buc | 7 | 2,31 | 2,33 | 15,23 | 2,82 | 19,74 |
| 17 | Sistem pluvial | Cot de 60 grade 90 – pluvial mat | buc | 21 | 2,31 | 2,33 | 15,23 | 2,83 | 59,43 |
| 18 | Sistem pluvial (al doilea) | Jgheab 125 / 4m – pluvial mat | buc | 3 | 8,71 | 8,80 | 57,52 | 10,67 | 32,01 |
| 19 | Sistem pluvial (al doilea) | Burlan 90 / 3m – pluvial mat | buc | 2 | 8,07 | 8,15 | 53,27 | 9,88 | 19,76 |
| 20 | Sistem pluvial (al doilea) | Cârlig jgheab 125 / 210 mm – pluvial mat | buc | 15 | 1,46 | 1,47 | 9,61 | 1,78 | 26,70 |
| 21 | Sistem pluvial (al doilea) | Colier burlan 90 – pluvial mat | buc | 4 | 0,86 | 0,87 | 5,69 | 1,05 | 4,20 |
| 22 | Sistem pluvial (al doilea) | Cot de 60 grade 90 – pluvial mat | buc | 6 | 2,31 | 2,33 | 15,23 | 2,82 | 16,92 |

---

**Setul etalon e complet pentru S7**: E01–E11 aprobate (23 și 27.10.2026); acoperă sumă / procent / adaos păstrat ca țintă, cele trei moduri de prezentare, prețuri fixe (sumă și „achiziție + x %"), grupa, colaboratorul, cantități mp / buc / ml / șipcă Calcul, zona B, completarea, variantele și pachetele.
