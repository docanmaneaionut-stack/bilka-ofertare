# Fișa de modul — CATALOG ȘI PREȚURI (CAT / LP / ADM)

Versiunea 1.1 · 16 octombrie 2026 · Status: ÎNCHISĂ (aprobată de Ionuț 10.09.2026; regula 12 adăugată 16.10.2026)
Sursa: deciziile lui Ionuț din 04–10.09.2026, listă cu listă. Anexe: fișele listelor 01–09, ANALIZA-LISTE-BILKA, ANALIZA-FORMULAR-BILKA, VERIFICARE-PRETURI-BILKA, REGULI-CULORI-BILKA, fișierele din `docs/import/bilka/`.

---

## 1. Structura catalogului

- **Un catalog, în compartimente pe furnizor**: Bilka (acum), Novatik, Metigla și alții (când vin), Fakro, Velux (ferestre), **Stoc** (produsele proprii). Fiecare compartiment are produsele lui, versiunile lui de listă de preț, moneda, modul de preț și formatul lui de import. O actualizare într-un compartiment nu atinge celelalte; un furnizor nou = un compartiment nou, nu o modificare a softului.
- **Rubricile ofertei** (comune tuturor compartimentelor; un produs din Stoc sau Novatik intră în aceeași rubrică, fără ca rubrica să apară de două ori):
  în ordinea decisă (19.10.2026): Învelitori (țiglă metalică, învelitori plate — inclusiv tabla plană la mp —, tablă cutată) · Accesorii standard (tinichigerie, coame, tabla plană la coală) · Accesorii speciale 2 ML · Fixare și etanșare (inclusiv folii, ventilare, coș de ventilare) · Sistem pluvial · **Șipcă gard** (rubrică proprie) · Accesorii speciale la lungimi (ML) · Ferestre (compartimentele Fakro / Velux, cu discount pe linie) · Zona B (lemn, feronerie, manoperă — cu preluare în factură).

## 2. Modurile de preț

- **Listă de achiziție** (Bilka, Novatik dacă dă listă, Stoc): prețul de bază e achiziția; vânzarea se construiește în sus (adaosul contului → țintă → prezentare).
- **Catalog public cu discount** (Fakro, Velux): prețul de bază e catalogul fără TVA; discountul tău e pe categorie; achiziția = catalog − discount; la ofertă discountul clientului se dă pe fiecare linie, cu achiziția și ținta afișate separat; niciodată sub achiziție.
- Prețul de achiziție al fiecărui cont = bază + adaosul % al contului (fișa CONTURI §7). Regula absolută rămâne: nicio linie sub achiziția contului.

## 3. Ce știe softul despre un produs

`cod furnizor` (poate lipsi la produse noi) · grup · familie · variantă · finisaj · grosime · opțiune (dripstop / soundcontrol) · unitate (mp, buc, ml, cutie, rolă) · preț de bază, fără TVA, în moneda produsului · categoria de ofertă · lățime totală (învelitori; editabilă de Admin general, cu istoric) · modul 35 (țiglă) · variantele de profil ale modelului, cu restricțiile lor · activ / inactiv · observații.
Culorile: tabelul general finisaj × grosime (`culori-finisaj-grosime.csv`), cu excepții pe produs (pluvial, holțșuruburi, calote, benzi, coș de ventilare). Garanții și straturi: `garantii-finisaj-grosime.csv`.

## 4. Reguli

1. **Listele PDF ale furnizorului definesc ce intră în soft**; formularul dă codurile și confirmă prețurile. Excepție decisă explicit: pluvialul Aluzinc (doar în formular). Nu se importă: module 37,5 / 40, profile zincate, ferestre prin Bilka, uz gospodăresc, T153, unelte, accesorii speciale în grosimi 0,75–1,50, variantele existente doar în formular.
2. **Prețul de referință e cel din PDF**; diferențele față de formular se notează (una singură azi: set coș fum Retro mat 0,50).
3. **Un cod apare o singură dată** în catalog. **Un cod, două produse** acolo unde Bilka dă un singur cod: ruperea pantei convexă / concavă, colțar exterior / interior industrial, benzi profilate streașină / coamă, tabla plană (învelitoare la mp și accesoriu la coală de 2,5 mp).
4. **Produse noi fără cod** sunt acceptate (corectorul colorat); la importul următor, ecranul de diferențe propune potrivirea codurilor apărute.
5. **Ce se poate produce = ce are rând de preț.** Cascada de la ofertă: model → finisaj → grosime → culoare, fiecare listă filtrată la ce e posibil; nicio combinație imposibilă nu poate fi aleasă. Restricțiile care nu se pot exprima prin rânduri stau pe variantele de profil (`variante-profil.csv`; azi una singură: Retro Plus Flat și Double Line fără 0,60).
6. **Actualizarea** (detaliată în ANALIZA-FORMULAR §6 și în discuția din 09.09): formular nou → citire automată → ecran de diferențe (prețuri, produse noi, dispărute, culori) → confirmare → versiune nouă de listă, cu dată de valabilitate; versiunile vechi rămân; ofertele existente nu se schimbă; cele „În lucru" pot fi recalculate la cerere; verificarea PDF ↔ formular (scriptul) la fiecare actualizare. Doar Admin general, totul în jurnal.
7. **Stoc**: prețul de bază îl introduce Admin general manual (cum a cumpărat), în lei sau euro; aceleași reguli de ofertare; se modifică manual.
8. **Monede**: setate pe produs (implicit cea a compartimentului). Bilka și Fakro în euro; Velux și Stoc în lei. Pe ofertă, prețurile în lei se convertesc în euro la cursul ofertei.
9. **Curs BNR + 1 %**: preluat automat zilnic, înghețat pe ofertă la creare, reîmprospătabil manual cât e „În lucru"; offline se folosește ultimul curs preluat.
10. **TVA**: setare generală, aplicată la finalul ofertei; prețurile din catalog sunt mereu fără TVA.
11. Dripstop la T18 / T35 / T45 sub 40 mp: avertizare. Fără date de ambalare în soft.

12. **Contactul furnizorului** (adăugat 16.10.2026): fiecare compartiment are setările lui de contact pentru comenzi — la Bilka: agentul de vânzări alocat firmei (nume, telefon, e-mail) și directorul zonal; exportul formularelor pleacă pe e-mail către acest contact. Se modifică de Admin general când Bilka schimbă persoanele (cum s-a întâmplat în 10.2026), fără să atingă catalogul.

## 5. Catalogul Bilka la zi (septembrie 2026)

| Fișier | Rânduri | Coduri | Fără cod |
|---|---|---|---|
| 01 rezidențial | 522 | 498 | 0 |
| 02 auxiliare | 88 | 78 | 2 |
| 03-04 pluvial | 138 | 138 | 0 |
| 04b pluvial Aluzinc | 37 (2 inactive) | 37 | 0 |
| 05 Retro / fălțuită | 339 | 325 | 0 |
| 06 industrial | 892 | 788 | 3 |
| 07 șipcă gard | 83 | 83 | 0 |
| 08 speciale 2 ML | 650 | 650 | 0 |
| 09 speciale ML | 650 | 650 | 0 |
| **Total** | **3.399** | **3.247** | **5** |

## 6. Amânate pentru fișa OFERTARE

Cele două variante de calcul la șipcă · lista de încadrare a desfășuratelor (pop-up la accesoriile speciale) · schița atașată pe linia de accesoriu special · accesoriile recomandate pe categorii (țiglă Romanic / celelalte, învelitori plate, tablă cutată) · afișarea garanției pe ofertă · preluarea automată a finisajului / grosimii / culorii la accesorii.
