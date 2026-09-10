# Fișa listei 05 — RETRO PLUS / RETRO PANEL / RETRO DUO / TABLĂ FĂLȚUITĂ (Bilka)

Versiunea 1.0 · 9 septembrie 2026 · Status: ÎNCHISĂ (deciziile lui Ionuț din 09.09.2026)
Extrasul de import: `docs/import/bilka/05-retro-faltuita.csv` (339 de rânduri, 325 de coduri Bilka, 0 fără cod; separator „;")

---

## 1. Ce conține

| Grup | Familii | Rânduri | Unitate | Categorie de ofertă |
|---|---|---|---|---|
| Învelitori plate | Retro Plus (standard 15 + dripstop 10 + soundcontrol 10), Retro Panel (15 + 10 + 10), Retro Duo (10 + dripstop 10), tablă fălțuită 560 mm (15) și 360 mm (15) | 120 | mp | Învelitori |
| Fixare Retro / fălțuită | șuruburi Retro Panel (cutie 500 buc), cleme inox fixe / mobile 25 / 32 mm | 5 | cutie / buc | Fixare și etanșare |
| Folii Retro / fălțuită | membrană 150 g cu covor de ventilație 300 g (rolă 37,5 mp), covor ventilație | 2 | rolă | Fixare și etanșare |
| Accesorii tinichigerie Retro | 13 familii × (lucios 5 + mat / GDM / 8003 5 + dubluvopsit 4 coloane), set coș fum Retro, opritor tip bară, piesă conectoare | 212 | buc | Accesorii standard |

Toate cele 325 de coduri au prețul identic în ListaPret, cu **o excepție**: Set coș fum Retro mat 0,50 — PDF 19,62 €, ListaPret 23,26 €. Decizie: **prețul din PDF (19,62)**, cu observație în CSV; de clarificat cu Bilka.

---

## 2. Reguli reținute

- **Retro Plus și Retro Panel au prețuri identice** pe toate finisajele; rămân produse separate (coduri diferite, profile diferite).
- **Variantele de profil** (Retro Plus: Standard / Micro-Ribs / Flat / Double Line; Retro Panel: Standard / Micro-Ribs / Flat; Retro Duo: Duo / Duo Micro-Ribs) nu schimbă prețul, dar sunt cerute la comandă. **Mecanism general (decis 09.09.2026)**: rândurile de preț rămân cele 120 ale Bilka; fiecare model are lista lui de variante, cu eventualele restricții, în fișierul `docs/import/bilka/variante-profil.csv` (întreținut de Admin general în zona tehnică). La ofertă, lista de modele e generată din model × variantă × opțiune („Retro Plus Flat — Dripstop", „Retro Duo Micro-Ribs"…), apoi cascada finisaj → grosime → culoare arată doar ce e posibil. Ce nu există ca rând de preț nu apare (dripstop fără dubluvopsit și Magnelis, Retro Duo fără soundcontrol); ce împarte un rând cu alte variante și nu se poate produce e restricție pe variantă — la Bilka una singură: Retro Plus Flat și Double Line fără lucios / mat 0,60. Același mecanism acoperă Britanic / Britanic Retro (lista 01) și T8 / T8 ventilat (lista 06).
- Dripstop și soundcontrol = produse separate, cu coduri proprii (REPDR / REPSC, RETDR / RETSC, RDDUO); nu au dubluvopsit și Magnelis.
- SSAB 0,60 la Retro și fălțuită e codificat în ListaPret ca **SPX060 / MPX060** (lucios / mat); CSV-ul poartă codul real.
- Fălțuita: două produse după lățimea totală (560 → utilă 550; 360 → utilă 345). Lățimile totale sunt în CSV (0,56 / 0,36); Retro Plus / Panel 0,542; Retro Duo 1,10.
- Accesoriile marcate în PDF ca **compatibile cu Retro Duo** (coamă, semicoamă, suport coamă, fronton, dolii, borduri perete, ruperea pantei, set coș fum) au observația în CSV.
- Ruperea pantei Retro concavă / convexă: un singur cod Bilka — două produse pe același cod, ca la rezidențial.
- Semicoamă Retro: PDF spune 370 mm, ListaPret 312 mm — codul e ASR31; în soft rămâne denumirea din PDF (370).

---

## 3. Decizii (09.09.2026)

1. Toate produsele listei rămân active.
2. Variantele de profil: mecanismul de mai sus, general pentru toate categoriile.
3. Set coș fum Retro mat 0,50: prețul din PDF.
4. Regula generală a ofertei: selecția merge model → finisaj → grosime → culoare, fiecare listă filtrată la ce e posibil; nicio combinație imposibilă nu poate fi aleasă.
