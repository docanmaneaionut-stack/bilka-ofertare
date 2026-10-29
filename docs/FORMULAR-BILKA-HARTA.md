# Harta formularului de comandă Bilka (șablonul v10, 03.06.2026)

Scrisă de Claude Code în sesiunea S16b (29.10.2026), pasul 0 — analiză doar prin citire a arhivei XLSM, fără Excel, fără bibliotecă de Excel. Este singurul fișier din `docs/` pe care Code îl scrie direct (excepție explicită a lui Ionuț, S16b). Completează `docs/ANALIZA-FORMULAR-BILKA.md` (fișa din septembrie) cu **exact celulele în care softul scrie** și cu **cum e identificat produsul pe fiecare rând**.

Fișierul analizat: `docs/Liste/Bilka/2026-09/Formular comanda v10    03.06.2026.XLSM` — 153 de intrări în arhivă, 34 de foi, 723 de nume definite, `xl/vbaProject.bin` 976.896 octeți. Foile de interes: **FORMULAR COMANDA** (`xl/worksheets/sheet6.xml`), **SISTEM PLUVIAL** (`sheet8.xml`), **SISTEM PLUVIAL MAGNELIS** (`sheet10.xml`), **FORMULAR ACCESORII SPECIALE** (`sheet11.xml`); de citit, nu de scris: **SetariOferta** (`sheet30.xml`, ascunsă — configurația macro-urilor), **AUX / AUX1** (listele derulante), **Date Client** (contul firmei la Bilka), **Preturi / ListaPret** (codurile de ierarhie), **Portal** (formatul plat pe care îl produce macro-ul la trimitere).

---

## 1. Cum funcționează formularul (ce contează pentru scriere)

- Agentul completează **celule de intrare** (model, finisaj, culoare, grosime, lungimi × coli, cantități pe rânduri cu nume de produs). Tot restul sunt **formule** (prețuri, totaluri, chei) sau **macro-uri VBA** care, la trimitere, citesc celulele după configurația din SetariOferta și construiesc codurile SAP.
- Macro-ul **nu caută coduri în formular**: pentru tinichigerie și auxiliare citește **numele produsului** din coloana C sau M și **cantitatea** din F sau P, apoi derivă codul de ierarhie din nume + finisajul / grosimea / culoarea învelitorii principale (clasa produsului din SetariOferta K: `BK_ACCESORII` = nume + finisaj + grosime + culoare; `BK_AC_NUME` = doar nume; `BK_AC_NUME_CULOARE` = nume + culoare; `BK_AC_FINS_CULOARE` = finisaj + culoare). Regula nume → cod stă **numai în VBA** (nu există nicio foaie cu perechea nume ↔ prefix de ierarhie).
- La pluvial, macro-ul citește **cantitatea** din coloana E a rândurilor fixe, iar codul de ierarhie este **numele definit al celulei de preț** din coloana D (ex. `SPJGH1254ML` → `'SISTEM PLUVIAL'!$D$7`) — deci rândul se găsește **după cod**, exact.
- La accesoriile speciale la lungimi, produsul este **treapta** (`ACCESORIU SPECIAL D01…D25`), iar finisajul, culoarea, grosimea, lungimea și bucățile stau pe același rând.
- Toate foile au `sheetProtection` și registrul are `workbookProtection` (structura blocată). Scrierea direct în XML nu este afectată de protecție; celulele de intrare sunt cele pe care agentul le poate edita oricum în Excel.
- `xl/workbook.xml` are `<calcPr calcId="191029"/>` **fără** `fullCalcOnLoad` — valorile din celulele cu formule sunt cele salvate ultima dată în șablon (ex. „PROROOF COMP SRL”, 275,004 mp). La scriere se adaugă `fullCalcOnLoad="1"`, ca Excel să recalculeze totul la deschidere.
- Arhiva: toate intrările sunt deflate (`comp=8`, `flags=6`, fără data descriptor), deci mărimile și CRC-urile stau în antetele locale; `xl/calcChain.xml` există și rămâne neatins (nu adăugăm / nu ștergem formule).

---

## 2. FORMULAR COMANDA (`sheet6.xml`)

### 2.1 Antetul (rândurile 3–21)

| Celulă | Nume definit | Ce este | Scrie softul? |
|---|---|---|---|
| F3, F4, F5, F6 | — | asistentul Bilka al firmei (formule din Date Client / COPERTA) | nu |
| F8 | `CURS_VALUTAR` | cursul euro al formularului (nr., ex. 5,10) | **nu** (e cursul Bilka, câmp de lucru al firmei) |
| F13 | `_OFERTA_DATA_OFERTA` | `=TODAY()` | nu |
| F14 | `_OFERTA_NUMAR_OFERTA` | numărul ofertei (liber) | **da**: `SERIE-NR` (+ ` F2` la al doilea formular) |
| F18 | `_OFERTA_TEXT_TRANSPORT` | „Observații” = formulă (culoare & finisaj & grosime) | nu |
| F19 | `_OFERTA_TEXT_FACTURA` | „Mesaj pt facturare” — listă (MESAJE!B1:B5) | nu |
| F20 | `_OFERTA_TEXT_PRODUCTIE` | „Mesaj pt producție” — text liber | **da**: `Oferta SERIE-NR, formular n din N — client <nume>, <localitate>` |
| F21 | `_OFERTA_TEXT_LIVRARE` | „Mesaj pt șofer” — listă (MESAJE!A1:A4) | nu |
| P3 | `_OFERTA_COD_CLIENT` | codul de client Bilka al **firmei** (ex. 1000003192) | nu (vine din șablonul firmei) |
| P4, P5, P6 | — | numele / județul / localitatea firmei (formule din Date Client) | nu |
| P7 | `_OFERTA_LIVRARE_CLIENT` | „Livrare direct la client (pct. lucru)” — gol în șablon (Date Client M7 = 0) | nu (regula de livrare o alege agentul în Excel) |
| P8, P9, P10 | — | persoana de contact a firmei (formule) | nu |
| P11 | `_OFERTA_NUME_DESTINATAR` | **locul descărcării**: listă cu destinatarii înregistrați la Bilka (Date Client A10:A100 — depozitele firmei) | nu (rămâne depozitul implicit al firmei; nu există destinatar „șantierul clientului”) |
| P12, P13, P15 | `_OFERTA_COD_DESTINATAR` … | formule din lista de destinatari | nu |
| P14 | — | telefon mobil destinatar (liber) | nu |
| P16 | `_OFERTA_COD_JUDET` | „Județ șantier” (liber) | nu — oferta noastră nu are județ |
| P17 | `_OFERTA_LOCALITATE` | „Localitate șantier” (liber) | **da**: localitatea de pe ofertă (sau a clientului) |
| P18 | `_OFERTA_CONTACT_LIVRARE` | „TELEFON” (liber; apare și pe foile de pluvial la „TELEFON :”) | **da**: telefonul clientului |

**Clientul final nu are celulă de nume**: formularul este comanda firmei către Bilka; numele clientului intră doar în „Mesaj pt producție” (F20). Adresa lucrării nu are celulă (doar localitate + telefon).

### 2.2 Învelitoarea principală (rândurile 22–33)

| Celulă | Nume definit | Ce este | Valori acceptate (listă derulantă) |
|---|---|---|---|
| H22 | — | tipul: `TIGLA_METALICA` / `TABLA_CUTATA` / `INVELITORI_PLATE` | AUX!I2:I5 (`TipInvelitoare`) |
| E23 (E23:H23 unite) | → `_FC_MODEL` = `'AUX1'!E1` (derivat) | **modelul** | `INDIRECT(H22)`: țiglă AUX!J2:J11 (ADRIATIC, BALCANIC, BRITANIC, BRITANIC RETRO, CLASIC, DACIC, GOTIC, HELLENIC, IBERIC, ROMANIC); tablă cutată AUX!K2:K15 (S18 SINUS, T 8 P, T 8 P VENTILAT, T 8 A, T 12 A, T 12 P, T 18 P, T 18 A, T 35 P, T 35 A, T 45 P, T 45 A, T 153 NEGATIV / POZITIV); plate AUX!L2:L13 (FALTUITA 360 MM, FALTUITA 560 MM, RETRO PLUS DOUBLE LINE / FLAT / MICRO-RIBS / STANDARD, RETRO DUO MICRORIBS, RETRODUO, RETROPANEL, RETROPANEL FLAT, RETROPANEL MICRO-RIBS, TABLA PLANA) |
| O22 | — | **modulul** țiglei | `INDIRECT(E23)`: „35 cm” (Dacic și „37.5 cm” / „40 cm”; celelalte „35 cm” / „40 cm”) |
| P22 | — | **membrana** | AUX!X1:X4: „Selecteaza Membrana” (= fără), `FARA MEMBRANA`, `CU DRIPSTOP`, `CU SOUNDCONTROL` |
| E24 (E24:F24) | `_FC_FINISAJ` | **finisajul** | `Listafinisaj` = AUX1!I2:I10: `LUCIOS`, `MAT`, `GDM`, `ZINCAT`, `RAL_8003`, `DPL`, `DPM`, `WOOD` (+ `MGNL`) |
| I24 (I24:L24) | `_FC_CULOARE` | **culoarea** — număr RAL (ex. 8019) sau text (`ZINC`, `MGNL`, `GWPA`…) | `INDIRECT($E$24)`: lista culorilor finisajului (AUX1 J…R) |
| S24 | `_FC_GROSIME` | **grosimea** — text `0.50` | AUX!D1:D11: `0.50`, `0.45`, `0.40`, `0.37`, `0.60`, `0.70`, 0.75, 0.88, `1.00`, 1.25, `1.50` |
| J25 | `_FC_COD_FURNIZOR` | codul furnizorului de materie primă (îl alocă macro-ul) | nu |
| R25 | `_FC_LINIE_FABRICATIE` | linia de producție | nu |
| M23 | `_FC_SUPRAFATA` | suprafața = `'AUX1'!D31` = Σ lungime × coli × lățime | formulă |
| P24 | `_FC_LATIME` | lățimea totală = `LATIME(E23,S24,E24)` (VBA) | formulă |
| R23 | `OFERTA_PRET_INVELITOARE` | preț / mp (VBA `neopret_wrapper`) | formulă |

**Cele 28 de sloturi lungime × coli** (`_FC_INVELITOARE_RL` = SetariOferta O2:O29 = rândurile 3…30 din AUX1, care citesc formularul):

| Sloturi | Lungime (m) | Nr. coli | Rânduri |
|---|---|---|---|
| 1–7 | D27:D33 | E27:E33 | 27–33 |
| 8–14 | G27:G33 (G:I unite) | J27:J33 | 27–33 |
| 15–21 | M27:M33 (M:N unite) | O27:O33 | 27–33 |
| 22–28 | Q27:Q33 (Q:R unite) | S27:S33 | 27–33 |

Lungimea e număr în metri cu 2 zecimale (șablonul are 229,17 în D27 — valoare veche, se golește), coli = număr întreg. Lățimea nu se scrie (o dă VBA după model). Mai mult de 28 de lungimi distincte → avertizare, restul nu intră.

### 2.3 Învelitoarea secundară (rândurile 35–46) — aceleași coloane, 13 rânduri mai jos

H35 tip, E36 model (`_FC_MODEL2`), O35 modul, P35 membrană, E37 finisaj (`_FC_FINISAJ2`), I37 culoare (`_FC_CULOARE2`, listă `INDIRECT(_FC_FINISAJ2)`), S37 grosime (`_FC_GROSIME2`), sloturi D40:E46 / G40:J46 / M40:O46 / Q40:S46 (`_FC_INVELITOARE_RL2` = AUX1 rândurile 79…106). Suprafața M36 = `'AUX1'!D107`.

### 2.4 Șipca de gard (rândurile 48–59)

E49 (E49:H49) model — listă `Listamodelsipca` = AUX1!F88:F95: `HAGA ROTUNDA`, `HAGA DREAPTA`, `OSLO ROTUND`, `OSLO DREPT`, `BERNA ROTUNDA`, `BERNA DREAPTA`, `SOFIA ROTUNDA`, `SOFIA DREAPTA`; E50 finisaj (`_SIPCA_FINISAJ`, lista `Listafinisaj`); I50 culoare (`_SIPCA_CULOARE`, `INDIRECT($E$50)`); S50 grosime (`_SIPCA_GROSIME`, AUX!D1:D6); sloturi lungime × bucăți D53:E59 / G53:J59 / M53:O59 / Q53:S59 (`_SIPCA_RL` = AUX1 rândurile 112…139; cantitatea M49 = `'AUX1'!D140` = Σ lungime × bucăți, în ml). Lățimea șipcii nu se scrie.

### 2.5 Accesoriile de tinichigerie (coloana C, rândurile 64–112) și auxiliarele (coloana M, aceleași rânduri)

Configurația macro-ului (SetariOferta): `_FC_ACCESORII_RL` = G2:G53 = **rândurile 64…112**; `_FC_ACCESORII_TAB_CANT_NUME` = H2:I3 = perechile (coloană cantitate, coloană nume) = **(F, C)** și **(P, M)**; `_FC_TAB_LISTA_ACCESORII` = J2:L278 = **lista celor 277 de nume acceptate**, cu clasa (K) și unitatea (L). Macro-ul ia fiecare rând 64–112, citește numele din C și cantitatea din F, apoi numele din M și cantitatea din P; un nume care nu e în listă nu are cod.

Rândurile nu sunt bătute în cuie: fiecare celulă de nume are o **listă derulantă pe familie** (validările foii), iar formulele de preț din H / R depind de numele ales. Deci softul poate **înlocui numele** din C / M cu cel de care are nevoie, cu condiția ca numele să fie în lista derulantă a acelui rând (sau rândul să nu aibă listă). Harta rândurilor, cu numele implicit din șablon și lista derulantă (toate din `sheet6.xml` + AUX1):

**Coloana C (cantitatea în F; prețul în H prin funcții VBA după finisajul E24 și grosimea S24)**

| Rând | Nume implicit | Lista derulantă |
|---|---|---|
| 64 | COAMA MICA | — |
| 65 | COAMA MARE | — |
| 66 | COAMA UNGHIULARA 312 MM | AUX1!AQ2:AQ5: COAMA UNGHIULARA 312 MM / 417 MM, COAMA RETRO 417MM, COAMA BRITANIC 417MM |
| 67 | BORDURA FRONTON 312 MM | `TIPFRONTON`: BORDURA FRONTON 360 / 312 / 250 MM, BORDURA FRONTON RETRO 312MM |
| 68 | COLECTOR FRONTON 156 MM | AUX1!U2:U4: COLECTOR FRONTON 156 / 250 MM, SUPORT COAMA RETRO 125MM |
| 69 | FRONTON SUB TIGLA 312 MM | AUX1!DC2:DC3: FRONTON SUB TIGLA 312 MM, ELEMENT MIC SUPRAP. RETRO 60MM |
| 70 | PARAVANT DE BAZA 312MM | AUX1!DD2:DD3: PARAVANT DE BAZA 312MM, ELEMENT MARE SUPRAP.RETRO 80MM |
| 71 | BORDURA STREASINA 208 MM | `streasina`: BORDURA STREASINA 208 / 178 / 250 / 156 MM, BORD. STREASINA RETRO 312MM / 250 MM |
| 72 | BORDURA LA PERETE 208 MM | `bordper`: BORDURA LA PERETE 208 / 250 / 178 MM, BORD. PER. ORIZ. RETRO 312MM |
| 73 | FIXAREA PLACILOR PE ZID 208 MM | `Fixari`: FIXAREA PLACILOR PE ZID 250 / 208 MM, BORD. PER. LATERAL RETRO 250MM |
| 74 | DOLIE 417 MM | `dolii`: DOLIE 417 / 625 / 312 MM, DOLIE RETRO 417MM / 625MM |
| 75 | RUPEREA PANTEI CONVEXA 250 MM | `CONVEXE`: 208 MM, 250 MM, RUP. PANTA CONV. RETRO 312MM |
| 76 | RUPEREA PANTEI CONCAVA 250 MM | `CONCAVE`: 208 MM, 250 MM, RUP. PANTA CONC. RETRO 312MM |
| 77 | SEMICOAMA 312 MM | AUX1!AI2:AI4: SEMICOAMA 312 MM, SEMICOAMA RETRO 370MM, SEMICOAMA BRITANIC 417MM |
| 78 | OPRITOR ZAPADA 2 ML | `Opritor`: OPRITOR ZAPADA 2 ML, OPRITOR ZAPADA 1.25 ML, OPRITOR ZAPADA RETRO TIP BARA |
| 79 | OPRITOR ZAPADA OMEGA | `Omega`: OPRITOR ZAPADA OMEGA, PIESA CONEC. OPR. ZAPADA RETRO |
| 80 | SET COS FUM ( 4 PIESE  ) | `cosfum`: SET COS FUM ( 4 PIESE  ), SET COS FUM ( 4 PIESE  ) RETRO |
| 81–105 | ACCESORIU SPECIAL D01 … D25 (câte unul pe rând, în ordine) | `SPECIALE` (toate cele 25) — **accesoriile speciale de 2 ML**, pe treaptă |
| 106 | (gol) | AUX1!AQ6:AQ7: COAMA UNG. INDUSTRIALA 417MM / 312MM |
| 107 | (gol) | `Subcoame`: SUBCOAMA INDUSTRIALA 417MM / 312MM, SUPORT COAMA RETRO 125MM |
| 108 | (gol) | AUX1!AW2:AW4: COLTAR INT. INDUSTRIAL 417 MM / 312MM / 250 MM |
| 109 | (gol) | AUX1!AU2:AU4: COLTAR EXT. INDUSTRIAL 417 MM / 312MM / 250 MM |
| 110 | (gol) | AUX1!CZ2:CZ6: PROFIL U TABLA CUTATA T8 45MM / T12 / T18 60MM / T35 100MM / T45 110MM |
| 111 | (gol) | AUX1!EI1:EI6: CALOTA T18 / T35 / T45 -DPL / -DPM 0.60 |
| 112 | TABLA PLANA 2.00*1.25 | — (tabla plană ca accesoriu, la coală) |

**Coloana M (cantitatea în P; prețul în R)** — multe formule din R conțin **chiar codul de ierarhie**, deci pentru aceste rânduri legătura nume ↔ cod e vizibilă în șablon:

| Rând | Nume implicit | Lista derulantă | Codul din formula R |
|---|---|---|---|
| 64 | HOLTS. PT LEMN 250 BUC 4.8*35 | — | `SUCLE408035` (sau `SUZLE408035` dacă E23 = ZINCAT) |
| 65 | HOLTS. PT LEMN 250 BUC 4.8*20 | — | `SUCLE408020` / `SUZLE408020` |
| 66 | HOLTS. PT LEMN 100 BUC 4.8*70 | — | `SUCLE408070` / `SUZLE…` |
| 67 | HOLTS. PT LEMN 100 BUC 4.8*55 | — | `SUCLE408055` |
| 68 | HOLTS. PT METAL 250 BUC 4.8*35 | — | `SUCME408035` |
| 69 | HOLTS. PT METAL 250 BUC 4.8*19 | — | `SUCME408019` |
| 70 | HOLTS. RETRO PANEL 500 BUC | — | `SURLINOX000` |
| 71 | SPRAY RETUS | AUX1!DR1:DR2: SPRAY RETUS, CORECTOR | `AXSPRLUC400` / `AXSPRMAT400` după E24 |
| 72 | CLEMA FIXA FALT VERTICAL 25*30 | AUX1!BU1:BU2 (25*30 / 32*30) | `AXCLEFIX25X` / `AXCLEFIX32X` |
| 73 | CLEMA MOBILA FALT VERT. 25*55 | AUX1!BW1:BW2 | `AXCLEMOB25X` / `AXCLEMOB32X` |
| 74 | CAPAC DE COAMA | — | `AXCAPLUC000` / `AXCAPMAT000` / `AXCAPGDM000` după E24 |
| 75 | INCHIDERE DE COAMA MICA | AUX1!AZ2:AZ3 (MICA / MARE) | VBA `inchidere` |
| 76 | BANDA ETANSARE UNIVERSALA | — | `BANDAETAUNI` |
| 77 | BANDA ETANSARE COAMA CLASIC | AUX1!DI1:DI8 (COAMA CLASIC / BALCANIC / IBERIC / GOTIC / ROMANIC / T18 / T35 / T45) | VBA `etancoa` |
| 78 | BANDA ETANSARE STREAS.CLASIC | AUX1!DI9:DI16 (STREAS. idem) | VBA `etanstr` |
| 79 | BANDA COS FUM 5M*290MM 7016 | AUX1!ED1:ED3 (7016 / 8004 / 8017) | `BANDAFUM529` |
| 80–83 | BANDA BITUMINOASA 7,5CM / 10CM / 15CM / 30CM*10M | AUX1!BP…BS (fiecare: neagră + RAL 8004 / 8017 / 9006) | VBA `bitum`… |
| 84 | BANDA BUTILICA DUBLU ADEZIVA | — | `BANDABUT315` |
| 85 | SNUR BUTILIC 6MM*8M | — | `AXSNR6MM8ML` |
| 86 | MASTIC ETANSARE PREMIUM | AUX1!BY1:BY2 (PREMIUM / simplu) | `AXMAS300PRE` / `AXMAS300UNI` |
| 87 | PISTOL MASTIC | — | `AXMASPISTOL` |
| 88 | BANDA COAMA 310MM RAL 8017 | AUX1!CO1:CO5 (310MM în 5 culori) | `BANDABCO531` |
| 89 | BANDA COAMA 230MM RAL 8017 | AUX1!CO6:CO10 | `BANDABCO523` |
| 90 | BANDA COAMA 150MM | — | `BANDABCO515` |
| 91 | PIEPTENE STREASINA 8004 | AUX1!DL1:DL4 (8004 / 8017 / 9005 / VENTILATIE) | `AXPIESTRUNI` / `AXPIESTRVEN` |
| 92 | BANDA AERISIRE STREASINA 8004 | AUX1!DP1:DP3 | `BANDAAER501` |
| 93 | BANDA ANTIPASARI | AUX1!DN1:DN3 (policarbonat / INOX 60 / 80 TEPI) | `BANDAANT345` / `160` / `180` |
| 94 | COS VENTILARE BALCANIC 8017 | AUX1!CL1:CL22 (UNIVERSAL / CLASIC / BALCANIC / IBERIC / GOTIC / ROMANIC / RETROPANEL × culori) | VBA `cosvent` |
| 95 | FOLIE SOFT | — | `FOL75SFT000` |
| 96 | FOLIE ANTIDROP 100GR.-75MP | — | `FAN75BLK100` |
| 97–102 | FOLIE ANTICONDENS BILKA 95 / 120 / 140 / 150 / 180 / 200 G. | fiecare rând: BILKA / fără BILKA | `FOL75BLK095` … `FOL75BLK200` |
| 103 | FOLIE BILKA ALUM. -90GR. -75MP | AUX1!CW2:CW3 (75MP / 30MP) | `FAL75BLK090` / `FAL30BLK090` |
| 104 | FOLIE BILKA ALUM. -150GR.-75MP | — | `FAL75BLK150` |
| 105 | FOLIE BILKA METAL ALU 50 MP | — | `FOL50METALU` |
| 106–108 | FOLIE ANTIC. 30MP BILKA 180 / 95 / 95 | AUX1!BI6:BI12 (30MP BILKA 95 … 200) | VBA `FOLIE` → `FOL30BLK…` |
| 109 | MEMBRANA 150 G.RETRO/FALTUITA | — | `FOLVE150300` |
| 110 | COVOR VENTILATIE RETRO/FALT. | — | `COVVENTL300` |
| 111–112 | CLESTE … (unelte) | AUX1!BG1:BG18 | VBA `unelte` (uneltele nu sunt în catalogul nostru) |

Totalurile (G113:Q117, O118:O120) și discounturile (O113:O117, nume `_OFERTA_DISCOUNT_*`) sunt formule / celule ale agentului — nu se scriu.

---

## 3. SISTEM PLUVIAL (`sheet8.xml`) și SISTEM PLUVIAL MAGNELIS (`sheet10.xml`)

Două blocuri pe foaia SISTEM PLUVIAL — **colorat (lucios)** rândurile 7–54 și **mat** rândurile 69–116 — și un bloc pe foaia MAGNELIS, rândurile 7–54. Fiecare bloc: 125/90 pe rândurile 7–29 (respectiv 69–91), 150/100 pe rândurile 31–54 (93–116); rândul 30 (92) e gol. Coloanele: A mod ambalare, C denumire, **D preț (celula poartă numele definit = codul de ierarhie)**, **E cantitate** (de scris), F u.m., G total.

| Bloc | Culoarea (o singură celulă pe bloc) | Lista de culori | Cantități | Nume definite |
|---|---|---|---|---|
| colorat (lucios) | D5 (`_OFERTA_CULOARE_SP`) | SetariOferta T2:T14, text ca „MARO - (434) -RAL 8017” (RAL în U2:U14) | E7:E29, E31:E54 | `SP…` (46 de coduri, ex. `SPJGH1254ML` → D7, `SPCEV100000` → D54) |
| mat | D67 (`_OFERTA_CULOARE_SM`) | SetariOferta T15:T19: „RAL 7016 MAT”, „RAL 7024 MAT”, „RAL 8017 MAT”, „RAL 8019 MAT”, „RAL 9005 MAT” | E69:E91, E93:E116 | `SM…` (46, ex. `SMJGH1254ML` → D69) |
| Magnelis | A5 = „MAGNELIS” (`_OFERTA_CULOARE_SA`, fixă) | — | E7:E29, E31:E54 (foaia MAGNELIS) | `SN…` (46, ex. `SNJGH1254ML` → D7) |

Toate cele **138** de coduri de pluvial din catalog (listele 03-04: 46 lucios + 46 mat + 46 Magnelis) au un nume definit în șablon, deci rândul se găsește după `cod_furnizor`, fără nicio tabelă. Piesele comune („125 / 90 și 150 / 100”: brida) au un singur rând în blocul 125/90 (ex. `SPBRIDA0000` → D16; rândul D41 din 150/100 e o formulă `=SPBRIDA0000`, nu are nume) — se scriu pe rândul cu nume. Cele **37** de coduri Aluzinc (`SA…`, lista 04b) **nu au loc**: nu există foaie de pluvial Aluzinc → avertizare.

Culoarea se scrie ca **textul din lista șablonului** (SetariOferta T), găsit după numărul RAL din U (lucios) sau din text (mat); o culoare care nu e în listă → avertizare, blocul rămâne fără culoare.

Discounturile E57 / E119 / E57 (Magnelis) nu se scriu. Formulele de pe rândurile fără nume definit (`cell_getname`) rămân neatinse.

---

## 4. FORMULAR ACCESORII SPECIALE (`sheet11.xml`) — accesoriile la lungimi

35 de rânduri libere, **21–55**. Coloanele (antetul pe rândul 20):

| Coloană | Ce este | Lista derulantă | Scrie softul |
|---|---|---|---|
| B (B:E unite) | „COD” = treapta: `ACCESORIU SPECIAL D01…D25` (`SPECIALE` = AUX1!AK2:AK26; `_AML_CC`) | da | treapta produsului (`Produs.treapta`, codul `AML<nn>…`) |
| F (F:G) | finisaj | AUX1!I2:I9 (LUCIOS, MAT, GDM, ZINCAT, RAL_8003, DPL, DPM, WOOD) | finisajul liniei |
| H | culoare | `INDIRECT($F21)` (culorile finisajului) | RAL-ul liniei |
| I | grosime | AUX!D1:D11 (text `0.50`) | grosimea liniei |
| J (J:K) | lungime (m) | — | lungimea poziției |
| L | bucăți | — | bucățile poziției |
| M | total ml = J × L | formulă | — |
| O | preț / ml = `SPML(B,F,I,H,"")` (VBA) | formulă | — |
| R | desfășurata = `VLOOKUP(B, SetariOferta!BA2:BB26, 2)` | formulă | — |
| T21:W45 | tabelul treptelor D01…D25 (1–50 mm … 1201–1250 mm) — coincide cu `trepte-desfasurata.csv` | referință | — |

**O poziție (lungime × bucăți) = un rând.** Un produs cu trei lungimi ocupă trei rânduri. Peste 35 de rânduri pe un formular → avertizare, restul nu intră. `_ASP_RL` = SetariOferta AY2:AY36 confirmă rândurile 21–55; `_ASP_RC` = 12 = coloana L (bucăți).

---

## 5. Identificarea produsului pe rând — concluzia analizei

| Zonă | Cum se găsește locul | Sursa | Sigur? |
|---|---|---|---|
| Pluvial | **cod_furnizor = nume definit** pe celula de preț | șablonul (nume definite) | da, exact — 138 / 138 |
| Accesorii speciale 2 ML (`ASP…`) | rândul `ACCESORIU SPECIAL D<treapta>` din C81:C105 | șablonul + `Produs.treapta` | da |
| Accesorii la lungimi (`AML…`) | rând liber pe foaia lor + treapta | șablonul + `Produs.treapta` | da |
| Învelitori, șipcă | model (listă), finisaj, culoare, grosime, lungimi | catalog (familie, finisaj, grosime, culoare, panotaj) + listele șablonului | model: **prin corespondență** (vezi mai jos) |
| Tinichigerie, auxiliare | **numele Bilka** din coloana C / M | — | **nu direct**: numele noastre nu sunt numele Bilka |

Am verificat pe tot catalogul (listele 01, 02, 05, 06 — 164 de familii + variante) potrivirea automată a numelui nostru (familie + variantă, fără diacritice) cu lista de 277 de nume a formularului: se potrivesc exact ~50 (bordurile, doliile, colectoarele, coamele, fixarea plăcilor, semicoamele, câteva Retro); restul **nu**, din cauze de netrecut printr-o regulă: prescurtări SAP („BORD. PER. ORIZ. RETRO 312MM”, „COAMA UNG. INDUSTRIALA 312MM”, „COLTAR EXT. INDUSTRIAL”, „RUP. PANTA CONV. RETRO”, „PIESA CONEC. OPR. ZAPADA RETRO”), cutia în nume („HOLTS. PT LEMN **250 BUC** 4.8*35”), culoarea în nume (benzile de coamă, coșurile de ventilare, pieptenii, benzile bituminoase colorate), lățimea lipsă („OPRITOR ZAPADA 2 ML” pentru 208 mm / 2 m), „BILKA” în nume la folii, „CALOTA T18 -DPL 0.60”. Regula nume → cod a Bilka stă în VBA (proiect binar, nu în foi). Prin urmare:

**Hotărât (Ionuț, 29.10.2026, S16b):** o **tabelă de corespondență** în baza de date — referință configurabilă, nu cod — `corespondenta_formular_bilka` (migrarea 13): `cheie` = codul de ierarhie întreg sau prefixul familiei de 5 caractere (finisajul și grosimea vin din cheia pachetului) + `cuvant` de deosebire când un cod are două produse (convexă / concavă, exterior / interior, coamă / streașină, `BUC` la tabla plană ca accesoriu; la învelitori cuvântul se caută **doar** în varianta de profil, opțiune și unitate — denumirea familiei Retro înșiră toate variantele; la șipcă în modelul rubricii; la linii în opțiune, unitate, denumire, familie) → `nume_formular` (poate conține `{RAL}` = culoarea liniei, pentru numele cu culoarea în ele), `stare` (`automat` = potrivire sigură / `de_verificat` = hotărâtă de Code, de controlat de Ionuț), `observatie`. Valorile inițiale: `docs/import/configurare/corespondenta-formular-bilka.csv` (214 rânduri, 46 „de verificat”), încărcate prin `npm run seed` (idempotent), editabile în Zona tehnică → Referințe → „Formular Bilka”. Harta celulelor rămâne derivată din șablon la fiecare generare; tabela dă doar numele, iar potrivirea numelor ignoră spațiile în plus (Bilka are spații fixe duble în „HOLTS. PT LEMN 250 BUC  4.8*35”). La generare, fiecare nume din tabelă se verifică în lista șablonului încărcat (SetariOferta J) și pe listele derulante ale rândurilor — un nume care nu există → avertizare „Nu au loc în formularul Bilka”, niciodată un formular greșit (așa se simte o versiune nouă a formularului). Rândul produsului: cel cu numele deja scris, altfel un rând liber din aceeași familie (lista derulantă), cu numele rescris; două produse pe același rând → al doilea în avertizări.

Aceeași tabelă dă **modelul de învelitoare** (`TMCLS` → CLASIC; `REPRO` + varianta de profil → `RETRO PLUS STANDARD`; `TFALT` → `FALTUITA 560 MM`; `TPLAN` → `TABLA PLANA`) și **modelul de șipcă** („Haga, capăt rotund” → `HAGA ROTUNDA`). **Tabla cutată** („T 35”): litera A / P vine din câmpul nou **„Montaj”** de pe învelitoare (acoperiș / perete, implicit acoperiș; afișat doar la familiile „(acoperiș / perete)”; `T8 (perete)` e perete fix), coloană aditivă `montaj` pe `oferta_invelitoare` (migrarea 13) — fără implicit tăcut, motorul neatins. Tipul (H22) se deduce din lista în care e modelul; modulul din `modul_cm` al catalogului; membrana din opțiune (dripstop / soundcontrol) sau prefixul `TD`.

**Finisajul** se traduce din cele 3 litere ale codului de ierarhie (poziţiile 6–8) în textul listei șablonului: LUC → LUCIOS, MAT → MAT, GDM → GDM, ZNC → ZINCAT, 803 → RAL_8003, DPL / SPX → DPL, DPM / MPX → DPM, WOD → WOOD, MGN → MGNL (lista AUX1!I2:I10 + H10); fără cod (formular fără învelitoare) din textul finisajului. **Grosimea**: cifrele 9–11 (`050`) → textul `0.50` din lista AUX!D. **Culoarea**: numărul RAL ca număr (ZINCAT → `ZINC`, Magnelis → `MGNL`; Wood → avertizare dacă culoarea nu e în lista finisajului).

---

## 6. Ce se completează automat și ce nu are loc

**Se completează** (pe fiecare formular R10, din pachetele și formularele motorului):
- învelitoarea principală: tip, model, modul, membrană, finisaj, culoare, grosime, până la 28 de lungimi × coli (panotajul motorului); învelitoarea secundară la fel (prima secundară a pachetului; a doua → avertizare, formularul are un singur loc);
- tinichigeria și auxiliarele pachetului (și ale secundarei, pe cheia principalei) pe rândurile C / M cu cantitățile în F / P — rândul cu numele deja scris sau un rând liber din aceeași familie (lista derulantă), numele rescris;
- accesoriile speciale de 2 ML pe rândurile D01–D25; accesoriile la lungimi pe foaia lor (un rând per poziție, cu finisaj, culoare, grosime, lungime, bucăți);
- pluvialul pe cele trei blocuri (culoarea blocului + cantitățile pe rândurile codurilor), după locurile R10 ale formularului;
- blocul de șipcă (model, finisaj, culoare, grosime, lungimi × bucăți din poziții sau din tronsoanele calculate);
- antetul: numărul ofertei (F14 = SERIE-NR), localitatea lucrării (P17), telefonul clientului (P18); „Mesaj pt producție” (F20) rămâne gol — e al agentului (hotărât 29.10.2026).

**Nu au loc** (→ avertizare listată agentului, niciodată omise tăcut): pluvialul Aluzinc (`SA…`); holțșuruburile zincate pe un formular cu învelitoare colorată (codul `SUZ…` îl alege macro-ul doar când formularul e ZINCAT); corectorul colorat (fără cod Bilka); banda de etanșare expandabilă (`BANDAETAEXP`, fără nume în listă); orice produs fără rând în tabela de corespondență sau al cărui nume nu e în șablonul firmei; lungimile peste 28 de sloturi, pozițiile peste 35 de rânduri, a doua învelitoare secundară, o culoare de pluvial care nu e în lista șablonului, două produse diferite care cer același rând cu nume (al doilea → avertizare).

**Nu intră, prin regulă**: zona B, ferestrele, Stocul, uneltele, discounturile, cursul, destinatarul, mesajele de facturare / șofer.

---

## 7. Tehnica de scriere (fără bibliotecă, fără Python)

1. Șablonul firmei se citește ca zip (directorul central → intrări; `inflateRawSync` pe intrările care se modifică).
2. Se modifică **doar**: `xl/workbook.xml` (`<calcPr … fullCalcOnLoad="1"/>`), `xl/worksheets/sheet6.xml`, `sheet8.xml`, `sheet10.xml`, `sheet11.xml` — **numai valorile** celulelor de intrare: numere `<v>`, texte ca `t="inlineStr"` (`<is><t>…</t></is>`), stilul `s` al celulei păstrat; celulele goale (`<c r="E28" s="676"/>`) primesc valoarea; celulele de intrare cu valori vechi din șablon (D27, E27, F64, P64, E7 la pluvial…) se **golesc** înainte. Rândurile 27–33 au toate celulele deja prezente (`spans="1:25"`), deci nu se creează celule noi; dacă totuși lipsește una, se inserează în ordinea coloanelor.
3. Arhiva se rescrie **în aceeași ordine a intrărilor**: intrările neatinse se copiază **octet cu octet** (antet local + date comprimate + intrarea din directorul central, cu offset-urile recalculate); cele 5 modificate se comprimă din nou (deflate) cu CRC-ul și mărimile noi. `xl/vbaProject.bin`, `sharedStrings.xml`, `styles.xml`, `calcChain.xml`, `SetariOferta`, relațiile, `[Content_Types].xml` — identice.
4. Testul (`server/tests/ofe-formular-bilka.test.ts`): hash SHA-256 pe datele comprimate ale fiecărei intrări neatinse și CRC-ul identic cu șablonul; `vbaProject.bin` identic (976.896 octeți); valorile din arhiva rezultată la adresele hărții (E01, E11, E12, E03); `fullCalcOnLoad` prezent; produs fără loc → avertizare; firmă fără șablon → 409; colaborator → 403; „Comandat” din rezultatul salvat. Codul: `server/src/modules/ofe/formularBilka/` — `zip.ts` (arhiva), `sablon.ts` (harta derivată), `continut.ts` (umplerea), `scrie.ts` (celulele), `index.ts` (ruta `POST /api/oferte/:id/formulare-bilka`, fișierele ca documente ale ofertei).
5. Harta celulelor se derivă la fiecare generare din șablonul încărcat: numele definite din `workbook.xml` (`_FC_*`, `_SIPCA_*`, `_OFERTA_*`, `SP…`/`SM…`/`SN…`, `_ASP_RL`, `_FC_ACCESORII_RL`, `_FC_TAB_LISTA_ACCESORII`, `_SPC_TAB_CULORI`), foaia SetariOferta (rândurile și coloanele accesoriilor, lista numelor, culorile de pluvial), validările foii FORMULAR COMANDA (listele derulante pe rând) și listele din AUX / AUX1 la care trimit. Un șablon care nu mai are un nume definit așteptat → generarea se oprește cu mesaj clar („șablonul nu are …”), nu cu un formular greșit.

---

## 8. Versiunea șablonului

Fișierul nu are o celulă „versiune” (foaia „Jurnal de modificari” are o singură intrare, din 04.03.2022 — nu e ținută la zi). La încărcare, versiunea se compune din numele fișierului încărcat (Bilka pune versiunea și data în nume: „Formular comanda v10 03.06.2026”) și data modificării din `docProps/core.xml` (`dcterms:modified`, ex. 2026-09-10). Se afișează pe firmă: „Șablon formular Bilka: *nume fișier* (modificat *data*) — încărcat la *data* de *cine*”. Numărul de nume definite și prezența celor așteptate se verifică la încărcare; un fișier care nu le are e refuzat cu mesaj clar.
