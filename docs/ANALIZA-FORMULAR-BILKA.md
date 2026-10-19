# Analiză — Formularul de comandă Bilka (Formular_comanda_v10, 03.06.2026)

Anexă la fișa CATALOG ȘI PREȚURI · versiunea 0.1 · 4 septembrie 2026
Fișier: `Formular_comanda_v10____03_06_2026.XLSM` · 2,4 MB · 34 de foi (13 vizibile, 21 ascunse) · proiect VBA de 818 KB · 723 de nume definite.

---

## 1. Ce este formularul

Nu un simplu formular, ci un client SAP în Excel: conține extrasul de prețuri al contului, matricele de culori, categoriile de adaos, un generator de ofertă pentru clientul final, formularele de comandă pe grupe de produse, și macro-uri care validează codurile și trimit comanda în SAP.

---

## 2. Foile

### Vizibile

| Foaie | Rol |
|---|---|
| FORMULAR COMANDA | comanda principală: antet furnizor / client, învelitoare principală, învelitoare secundară, șipcă de gard, accesorii de tinichigerie, auxiliare, totaluri cu discounturi pe grupe, TVA 21 % |
| SISTEM PLUVIAL | pluvial colorat / mat, cu selectarea culorii; rânduri fixe, cantitate pe rând |
| SISTEM PLUVIAL MAGNELIS | idem, Magnelis |
| FORMULAR ACCESORII SPECIALE | piese la comandă: cod, desfășurată, finisaj, culoare, grosime, lungime, bucăți → total ML, preț / ML |
| FAKRO, VELUX | ferestre de mansardă cu prețuri de listă Bilka (fără TVA), pe dimensiuni |
| FORMULAR TABLA SUBTIRE | profile Z / C / C+ / Sigma / U / L și tablă subțire de uz gospodăresc |
| Date Client | contul tău de client Bilka: cod client, contract, tip curs (BNR + 1 %), limită de credit, mod de plată, garanție, contactele Bilka |
| ADAOSURI, ADAOSURI AGENT | cele 23 de categorii de adaos ale Bilka și procentele pe care le completează distribuitorul |
| OFERTA MATERIALE, REZUMAT OFERTA | generatorul de ofertă al Bilka pentru clientul final (prețuri cu adaos) |
| LogSap | mesajele SAP la trimiterea comenzii (validarea codurilor de material) |

### Ascunse (cele care contează)

| Foaie | Conținut |
|---|---|
| **Preturi** | extras SAP de condiții de preț (ZPRL – preț listă): 7.606 rânduri cu cod ierarhie, sumă, monedă, unitate, valabil de la / până la, descriere |
| **ListaPret** | lista derivată: 7.583 rânduri — Ierarhie · Suma · Moneda · UM · Descriere · **Categorie Adaos** · Formula Adaos |
| Preturi Adaos | prețurile cu adaosul distribuitorului aplicat |
| **COMBCUL** | combinații valide de culori: învelitori (model × finisaj × grosime × culoare, 3.028 rânduri) și accesorii speciale (finisaj × grosime × culoare, 123 rânduri); plus conversie DPM ↔ DPL |
| SetariOferta | configurația macro-urilor: rândul fiecărui accesoriu în formular, coloanele de cantitate, clasele de produse (BK_ACCESORII…), codurile de culoare cu nume (ex. „MARO – (434) – RAL 8017") |
| AUX1 | calculul suprafeței (lungime × bucăți × lățime) și lista învelitorilor cu module: Dacic 35 / 37,5 / 40; celelalte 35 / 40; Retro cu variantele; T8–T45 A / P; T153 pozitiv / negativ |
| MATRICE | dimensiunile profilelor zincate |
| **Portal** | format plat de export: un rând per produs (grup, ierarhie, UM, marcă, model, grosime, lățime, finisaj, culoare, tip accesoriu, cod furnizor, cantitate, Lungime_01 / Bucati_01 … Lungime_23 / Bucati_23) |
| MESAJE, COPERTA, Jurnal de modificari, Clienti, RULOURI TABLA, TAXA FASIERE RULOURI, RULOURI FASIATE, PROFILE, AUX, Discounturi, Sheet1, Sheet2 | auxiliare ale macro-urilor, texte, coperta dosarului de prețuri |

---

## 3. Codul de produs

**Ierarhia** (11 caractere) = familie (3) + variantă (2) + finisaj (3) + grosime (3):

- `ABF25LUC050` → Accesoriu Bordură Fronton · 250 mm · lucios · 0,50 mm
- `TMCLSGDM050` → Țiglă Metalică Clasic · Grande Mat · 0,50
- `AML01803045` → Accesoriu special ML · D01 · RAL 8003 · 0,45
- `SIHAGDPL060` → Șipcă Haga · dubluvopsit lucios · 0,60

Coduri de finisaj: LUC lucios · MAT mat · GDM Grande Mat · WOD Wood · 803 RAL 8003 · DPL / DPM dubluvopsit lucios / mat · MGN Magnelis · ZNC zincat (și ZN1 / ZN2 variante) · UZG / UZM uz gospodăresc · SPX / MPX (de lămurit).
Coduri de grosime: 037 · 040 · 045 · 050 · 060 · 070 (și 075 / 088 / 100 / 125 la T153, 025–035 la uz gospodăresc).

**Codul de material SAP** (la comandă) = ierarhie + modul (țiglă: `M35`, `M40`) sau `C` + codul furnizorului de materie primă (accesorii: `C33`) + culoarea RAL: `TMCLSLUC045M353005`, `ACMICLUC045C333005`. Macro-ul validează fiecare cod în SAP și scrie rezultatul în LogSap.

---

## 4. ListaPret — ce conține

- 7.583 de produse; unități: M 4.659 (profile, ML), BUC 2.403, M2 502, CUT 19; monedă: EUR 7.551, RON 32 (uz gospodăresc, T10 stoc marfă).
- Familii Bilka din PDF-uri: țiglă TM* / dripstop TD*, Retro RET / REP / RED / RDD, fălțuită TFA, tablă cutată TCT / TDT / SIN, tablă plană TPL, accesorii A**, speciale AML (ML) / ASP (2 ML), pluvial SP* (lucios) / SM* (mat) / SN* (Magnelis) / SA* (Aluzinc), fixare SUC / SUZ / SUR, calote CLT, folii FOL / FAL / FAN, benzi BAN / AX*, șipcă SIP / SIH / SIB / SIS, unelte SCU, ventilare.
- În plus față de PDF-uri: profile zincate PU / L / C / Z / Sigma (~3.700 rânduri), T153 (TC1), T55 (o combinație), uz gospodăresc (UZG / UZM / ZN1), pluvial Aluzinc (câteva cu preț 0), Fakro (FAE rame, FAF FTP-V, FAP PTP-V, FAX kituri, FAW acces), Velux (VEG, VEE, VEV), Optilight (OPT), T10 stoc marfă (MFT).
- Valabilitate: 3.917 rânduri de la 08.10.2025, 3.380 de la 01.06.2026, 169 de la 14.07.2026 — deci extrasul e mai nou decât data din numele fișierului.
- Fiecare rând are **Categorie Adaos** (Adaosuri1 … Adaosuri23) — clasificarea Bilka a produsului.

Cele 23 de categorii: 1 țiglă metalică, tablă cutată până la T45, Retropanel, fălțuită · 2 tablă plană · 3 accesorii de tinichigerie (inclusiv coame) / 2 ML · 4 accesorii speciale ML · 5 holțșuruburi · 6 membrane + folii anticondens · 7 elemente de etanșare + auxiliare (inclusiv ventilație) · 8 pluvial colorat · 9 pluvial Magnelis · 10 fixare Retro / fălțuită · 11 membrane Retro / fălțuită · 12 unelte · 13 șipcă gard · 14 tablă cutată subțire uz gospodăresc · 15 ferestre și rame · 16 scări de acces mansardă · 17 luminatoare și acces acoperiș · 18 Optilight · 19 (gol) · 20 ferestre de mansardă și rame · 21 luminatoare VLT · 22 T153 · 23 profile zincate.

---

## 5. COMBCUL — tabelul de culori

- Învelitori: cod combinație = model (5) + finisaj (3) + grosime (3) + culoare (4), ex. `TMCLSLUC0453005`. 3.028 combinații pe 39 de coduri de model (țiglă, dripstop, Retro cu variante, fălțuită 560 / 360, tablă cutată A / dripstop, tablă plană, T153).
- Accesorii speciale: finisaj + grosime + culoare, 123 combinații (ex. `LUC0403011`).
- Finisaje întâlnite în combinații: LUC, MAT, GDM, WOD, ZNC, SPX, DPM, DPL, 803, MPX, ZN2, 000, ZN1, MGN.

---

## 6. Consecințe

1. **Import**: sursa principală devine ListaPret (+ COMBCUL pentru culori); PDF-urile rămân pentru verificare încrucișată. Formatul CSV canonic primește coloanele: cod furnizor (ierarhia), familie, variantă, finisaj, grosime, unitate, monedă, preț, categorie Bilka, categorie ofertă.
2. **Actualizare**: la fiecare versiune nouă a formularului, extragerea ListaPret + ecran de diferențe. Dacă Bilka schimbă foaia, rămâne calea PDF.
3. **Catalog**: țigla poartă lista modulelor disponibile (35 / 37,5 / 40); accesoriile poartă codul furnizorului de materie primă doar la comandă (îl alocă macro-ul, după țiglă).
4. **Export comandă**: fie completarea formularului (rânduri fixe cunoscute din SetariOferta, 28 de sloturi lungime × coli), fie formatul Portal (un rând per produs, 23 de perechi lungime / bucăți). Ambele plecă din aceleași date.
5. Produsele care nu se vând (profile, Aluzinc, uz gospodăresc) se importă ca **inactive**, ca să nu apară la ofertă, dar să existe dacă vreodată e nevoie.

---

## 7. Întrebări

1. Portal B2B Bilka — există acces? (formatul din foaia Portal)
2. Fakro / Velux / Optilight — prin Bilka sau direct de la producători?
3. Formularul se actualizează din SAP la deschidere?
4. Finisajele SPX / MPX — semnificație?
5. Aluzinc și profilele zincate — se vând?
6. „Suma" din ListaPret = prețul de achiziție de la Bilka, înainte de +1 %?

## Verificare 16.10.2026 — formularul „FORMULAR_PROROOF_COMP.XLSM"

Comparat celulă cu celulă cu formularul de referință (v10, 03.06.2026): **toate foile de date sunt identice** — ListaPret (7.580 de coduri, aceleași prețuri și descrieri), Preturi, Preturi Adaos, MATRICE, COMBCUL, Fakro, Velux, sistem pluvial Magnelis. Nu există cod nou, cod dispărut sau preț schimbat. Diferă doar: persoanele de contact Bilka din copertă (agentul de vânzări și directorul zonal alocați firmei), cursul euro din antetul formularului (5,41 față de 5,10 — câmp de lucru, nu de listă), data, și conținutul unei comenzi completate (Iberic Grande Mat 0,50 RAL 8019 + pluvial), plus jurnalul SAP al acelei comenzi. Câteva foi ascunse (ListaPret, Preturi, COMBCUL, SetariOferta, Portal) sunt vizibile în această copie. **Concluzie:** aceeași versiune de prețuri; catalogul și fișierele de import rămân cele actuale, nimic de reimportat. Scriptul `docs/tools/compara_pdf_listapret.py` rămâne verificarea de rulat la o listă nouă.
