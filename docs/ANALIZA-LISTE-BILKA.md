# Analiză — listele de preț Bilka (septembrie 2026)

Anexă la fișa CATALOG ȘI PREȚURI · versiunea 0.1 · 4 septembrie 2026
Scop: verificarea înțelegerii structurii înainte de fișă și de formatul de import.

---

## 1. Listele primite

| Fișier | Conținut |
|---|---|
| 01 Rezidențial | țiglă metalică (Dacic, Adriatic, Hellenic, Britanic / Britanic Retro, Clasic, Balcanic, Gotic, Iberic, Romanic), învelitori cu dripstop, tablă plană, coame, accesorii coamă, accesorii de tinichigerie (nuanțe lucioase / mate) |
| 02 Auxiliare | elemente de fixare (holțșuruburi lemn / metal, calote), folii, benzi de etanșare, adezive, bituminoase, mastic, corectoare, elemente de ventilare, kit ventilare, unelte |
| 03 Pluvial colorat | sistem pluvial colorat (SSAB) și mat, 125/90 și 150/100 |
| 04 Pluvial Magnelis | sistem pluvial Magnelis, 125/90 și 150/100 |
| 05 Retro / Fălțuită | Retro Plus (4 variante), Retro Panel (3 variante), Retro Duo (2 variante), tablă fălțuită 560 / 360, cleme, membrană cu covor de ventilație, accesorii tinichigerie Retro |
| 06 Industrial | tablă plană, tablă cutată T8 / T12 / T18 / S18 / T35 / T45 (+ dripstop), accesorii industriale, tot ce e zincat |
| 07 Șipcă gard | Haga, Oslo, Berna, Sofia |
| 08 Accesorii speciale 2 ML | piese la comandă, la bucată de 2 m, trepte D01–D25 |
| 09 Accesorii speciale configurabile | piese la comandă, la metru liniar, trepte D01–D25 |

---

## 2. Regulile generale ale listelor

- Prețuri în **EUR, fără TVA**; curs = BNR din ziua facturării **+ 1 %**.
- **Prețul e determinat de: familie de produs × finisaj × grosime (× opțiune).** Culoarea nu schimbă prețul; se alege din lista finisajului și grosimii.
- **RAL 8003 și Wood** sunt tratate de Bilka ca finisaje cu preț propriu (coloană separată), nu ca simple culori. În catalog se modelează ca finisaje.
- **Finisaje** întâlnite: lucios · mat · Grande Mat (GDM) · Wood · RAL 8003 · dubluvopsit lucios (DPL) · dubluvopsit mat (DPM) · dubluvopsit SSAB 0,60 lucios / mat · Magnelis · zincat.
- **Grosimi**: 0,37 (doar zincat) · 0,40 · 0,45 · 0,50 · 0,60 · 0,70 (industrial lucios, zincat, speciale).
- **Opțiuni**: dripstop (țiglă rezidențială, Retro, T18 / T35 / T45), soundcontrol (Retro Plus / Panel). Apar ca produse separate; observație: suplimente constante (+1,50 €/mp dripstop, +2,50 €/mp soundcontrol). Se importă ca produse separate, fără a presupune regula.
- **Culorile per finisaj + grosime** se repetă identic în toate listele → o singură listă la nivel de furnizor, cu excepții la nivel de produs (pluvial mat: 7016 / 7024 / 8017 / 8019 / 9005; coș de ventilare: culori per profil; benzi coamă; calote; holțșuruburi).
- **Restricții** notate în liste: 0,60 mm doar la Retro Plus Standard și Micro-Ribs; Romanic doar 0,60 / 0,50; Coamă unghiulară Britanic și Semicoamă Britanic „indisponibil" la 0,40; T18 / T35 / T45 dripstop „comandă minimă 40 mp"; accesorii marcate cu * obligatorii pentru Romanic; accesorii evidențiate = recomandate de producător.

---

## 3. Unități de măsură

| Unitate | Unde | Observație |
|---|---|---|
| mp | învelitori, tablă plană, membrană / covor ventilație | mp la lățime totală |
| buc | tinichigerie standard (piese de 2,00 m sau 1,25 m), coame, capace, închideri, pluvial, cleme, calote, benzi, mastic, ventilare, unelte | |
| ml | accesorii speciale configurabile, șipcă gard | |
| cutie | holțșuruburi (100 sau 250 buc / cutie) | necesar → cutii |
| rolă | folii (75 sau 30 mp / rolă), bandă bituminoasă (10 ml), benzi ventilare (5 m) | necesar → role |

---

## 4. Lățimi (din schițele tehnice ale listelor)

| Produs | Lățime totală | Lățime utilă |
|---|---|---|
| Retro Plus / Retro Panel | 542 mm | 500 mm |
| Retro Duo | 1100 mm | 1065 mm |
| Tablă fălțuită | 560 mm / 360 mm | 550 mm / 345 mm |
| T8 | 1200 mm | 1180 mm |
| T12 | 1140 mm | 1080 mm |
| T18 | 1150 mm | 1100 mm |
| Sinus S18 | 1100 mm | 1050 mm |
| T35 | 1085 mm | 1065 mm |
| T45 | 1010 mm | 980 mm |
| Șipcă Haga / Oslo / Berna / Sofia | 111,3 / 92,9 / 105 / 106 mm | = totală |

Țigla rezidențială: lățimile totale le avem din discuțiile anterioare (Clasic 1,20 · Dacic / Balcanic / Iberic / Gotic 1,18 · Adriatic 1,215 · Hellenic / Britanic 1,21 · Romanic 1,14); **lățimile utile** nu sunt lizibile în PDF — de confirmat din fișele tehnice.

---

## 5. Structura pe grupe

**Învelitori rezidențiale** — 9 modele × finisaj × grosime; Clasic are și 0,40; Romanic doar 0,60 / 0,50 (lucios, mat) + Wood 0,50 + GDM 0,50. Dripstop listat pentru Clasic, Balcanic, Gotic, Iberic.

**Retro** — Retro Plus (Standard, Micro-Ribs, Flat, Double Line — același preț pentru toate variantele) și Retro Panel (Standard, Micro-Ribs, Flat) au prețuri identice între ele; trei grupe: standard / cu dripstop / cu soundcontrol; grupa standard are și dubluvopsit (0,50; SSAB 0,60) și Magnelis. Retro Duo (Duo, Duo Microribs): standard / dripstop, fără dubluvopsit. Șuruburi Retro (500 buc / cutie).

**Fălțuită** — două lățimi (560, 360), inclusiv dubluvopsit și Magnelis; cleme inox fixe / mobile 25 / 32 mm la bucată.

**Tablă plană** (1,25 × 2,00 m) — pe mp, toate finisajele, inclusiv 0,70 lucios, dubluvopsit, Magnelis; și zincată 0,37–0,70.

**Coame** — coamă mică (cu 0,40) și coamă mare, la bucată, pe finisaj × grosime; accesorii coamă (capac, închidere mică / mare) la bucată, doar pe finisaj (lucios / mat / grandemat).

**Accesorii de tinichigerie standard** — la bucată, lungime 2,00 m (opritor zăpadă și set coș fum și la 1,25 m); prețul depinde de **desfășurată** (156 / 178 / 208 / 250 / 312 / 360 / 417 / 625 mm) × grosime × finisaj, nu de numele piesei. Familii: opritor zăpadă (+ omega), bordură streașină, fixarea plăcilor pe zid, bordură fronton (+ sub țiglă), paravânt de bază, colector fronton, ruperea pantei convexă / concavă, dolie, bordură la perete, coamă unghiulară, semicoamă, coamă unghiulară / semicoamă Britanic, set coș fum. Industrial adaugă: coamă unghiulară industrială, subcoamă industrială, colțar exterior / interior industrial, profil „U" pentru T8 / T12 / T18 / T35 / T45; și 0,70 mm; și versiuni zincate 0,37–0,70. Retro are propriul set (coamă Retro 417, semicoamă 370, suport coamă 125, dolie 417 / 625, borduri, elemente de suprapunere 60 / 80, opritor tip bară 2 m cu preț unic, piesă conectoare).

**Accesorii speciale (2 ML)** — piese la comandă, la bucată de 2 m; 25 de trepte de desfășurată (D01: 0–50 mm … D25: 1201–1250 mm) × finisaj × grosime; grupe: lucios (0,40–0,70), mat + GDM, dubluvopsit (0,40 / 0,50 DPL / DPM, SSAB 0,60), Wood + Magnelis + 8003, zincat (0,37–0,70).

**Accesorii speciale configurabile (la lungimi)** — aceleași trepte și grupe, preț **la metru liniar**, orice lungime.

**Sistem pluvial** — 125/90 și 150/100; colorat (SSAB) și mat au prețuri identice; Magnelis separat; ~47 de repere per sistem, la bucată, cu mod de ambalare.

**Fixare și etanșare** — holțșuruburi în culoare / zincate, lemn (4,8×70 / 55 / 35 / 20) și metal (4,8×19 / 35), la cutie; calote T18 / T35 / T45 la bucată; benzi de etanșare (universală, expandabilă, profilată streașină / coamă per profil), benzi adezive, bituminoase (rolă 10 m), mastic, pistol, corectoare.

**Folii și ventilare** — folie soft / anticondens 95–200 g (role 75 sau 30 mp), antidrop, termoreflexivă; bandă aerisire streașină, antipăsări, bandă coamă (role 5 m, 310 / 230 / 150 mm), pieptene; coș de ventilare per profil (31,90 €), culori per profil.

**Șipcă gard** — 4 profile, preț / ml pe finisaj × grosime (inclusiv zincat, Magnelis, dubluvopsit); Haga = Berna = Sofia, Oslo diferit.

**Unelte tinichigerie** — la bucată.

---

## 6. Consecințe pentru catalog

Un produs se descrie complet prin: **compartiment (furnizor) · categorie · familie · variantă (desfășurată / lungime / dimensiune / sistem) · finisaj · grosime · opțiune · unitate · preț**. Culorile vin din lista finisaj + grosime a furnizorului, cu excepții pe produs.

Tipuri de calcul necesare, așa cum reies din liste:
1. **mp din panelare** — învelitori (lățime totală pentru cantitate, lățime utilă pentru panelare).
2. **buc din ml** — tinichigerie standard: lungimea piesei (2,00 sau 1,25 m) minus suprapunerea → rotunjit în sus (divizorii de până acum 1,85 / 1,80 / 1,90 sunt exact „2 m − suprapunere").
3. **ml cu lungimi per piesă** — speciale configurabile: desfășurată în mm → treapta D, apoi lista lungimilor.
4. **buc direct** — coame, capace, pluvial, benzi, unelte, speciale 2 ML.
5. **cutie / rolă din necesar** — holțșuruburi (buc / cutie, consum per mp sau ml), folii (mp / rolă), dacă se dorește calcul automat.
6. **procent din valoare** — zona B / servicii, ca până acum.

Volum estimat: **~3.500 de poziții de preț** → importul din CSV cu ecran de diferențe e obligatoriu; introducerea manuală rămâne pentru corecturi și produse izolate. PDF-urile Bilka se transformă în CSV canonic (de Claude în conversație, până când merită un adaptor).

Lămurit din liste: Clasic mat 0,50 = 6,54 € (nu 6,46).

---

## 7. Întrebări deschise

1. Categorii: unde intră foliile și ventilarea, șipca de gard, tabla plană, uneltele — propunere: „Folii și ventilare", „Șipcă gard" ca rubrici noi; tabla plană la învelitori; uneltele doar dacă se vând.
2. Accesoriile preiau automat finisajul, grosimea și culoarea acoperișului (modificabil pe linie)?
3. Holțșuruburi și folii: cantitate calculată din necesar (norme de consum) sau introdusă direct?
4. Piese speciale la comandă: introducere = desfășurată (mm) → treaptă D + bucăți de 2 m sau lungimi per piesă la ml; schița profilului se atașează liniei?
5. Suprapunere per produs în loc de divizor ml → buc?
6. Comandă minimă 40 mp și „indisponibil": avertizare sau blocare?
7. Accesorii recomandate / obligatorii per model, ca listă de propuneri automate la ofertă?
8. Pluvial: comandă la bucată sau rotunjire la pachet?
9. Moneda setată pe produs (implicit a compartimentului) — pentru Stoc și Velux în lei.
10. Liste complete? (T153 lipsește); lățimile utile ale țiglelor rezidențiale.
