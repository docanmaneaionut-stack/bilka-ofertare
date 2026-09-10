# Fișa listei 02 — AUXILIARE (Bilka)

Versiunea 1.0 · 9 septembrie 2026 · Status: ÎNCHISĂ (răspunsurile lui Ionuț din 09.09.2026)
Extrasul de import: `docs/import/bilka/02-auxiliare.csv` (88 de rânduri, 78 de coduri Bilka, 2 rânduri fără cod; separator „;")

---

## 1. Ce conține lista (fără unelte)

| Grup | Familii | Rânduri | Unitate | Categorie de ofertă (propunere) |
|---|---|---|---|---|
| Elemente de fixare | holțșuruburi lemn (4,8 × 20 / 35 / 55 / 70) și metal (4,8 × 19 / 35), în culoare și zincate | 12 | cutie (100 sau 250 buc) | Fixare și etanșare |
| Elemente de fixare | calote T18 / T35 / T45, dubluvopsit lucios / mat | 6 | buc | Fixare și etanșare |
| Folii | soft, anticondens 95–200 g (role de 75 și 30 mp), antidrop, Metal-Aluminiu, Aluminiu 90 / 150 g | 18 | rolă (sul) | Fixare și etanșare (ca până acum) |
| Corectoare | spray corector 400 ml lucios / mat; corector colorat lucios / mat | 4 | buc | Fixare și etanșare |
| Benzi de etanșare | universală, expandabilă, profilată streașină / coamă pentru Clasic, Balcanic, Gotic, Iberic, Romanic, T18, T35, T45; bandă coș fum | 19 | buc | Fixare și etanșare |
| Benzi adezive | bandă butilică 15 × 3 mm (15 m), șnur butilic 6 mm (8 m) | 2 | rolă | Fixare și etanșare |
| Bandă bituminoasă | 7,5 / 10 / 15 / 30 cm × 10 m, standard și colorată (8017, 8004) | 8 | rolă | Fixare și etanșare |
| Mastic | mastic Bilka, mastic premium (300 ml), pistol | 3 | buc | Fixare și etanșare |
| Elemente de ventilare | bandă aerisire streașină (5 m), antipăsări (policarbonat 345 mm, inox 60 / 80 țepi), bandă coamă 310 / 230 / 150 mm (5 m), piepteni | 9 | rolă / buc | Fixare și etanșare |
| Kit ventilare | coș de ventilare cu boloboc integrat: universal, Clasic, Balcanic, Iberic, Gotic, Romanic, Retropanel | 7 | buc | Fixare și etanșare |

Uneltele de tinichigerie (17 poziții) nu se importă (decizia ta din 05.09).

Toate cele 78 de coduri au prețul din ListaPret identic cu PDF-ul.

---

## 2. Atribute noi în această listă

- Unitatea de vânzare este cea din ofertă: holțșuruburile la **cutie**, foliile la **rolă (sul)**, restul la bucată. Detaliile de ambalare din Excel nu se importă (decizia ta din 09.09).
- **`culori_disponibile`** — pentru produsele cu listă proprie de culori: holțșuruburi (16 culori + zincat), calote (12 lucios + 5 mat + Magnelis), bandă coș fum (7016, 8004, 8017), bandă coamă (8004, 8017, 7024, 9005; cea de 150 mm doar 8019), bandă aerisire și pieptene (8004, 8017, 9005), coș de ventilare (culori pe profil; altele la cerere, 15 zile), bandă bituminoasă colorată (8017, 8004).

---

## 3. Observații din corelarea cu formularul

- **Benzile de etanșare profilate** au în ListaPret **un singur cod pe model** (fără distincția streașină / coamă); PDF-ul le listează separat, cu același preț. În CSV sunt două produse pe același cod, ca la „ruperea pantei".
- **Corectorul colorat** (lucios / mat, 4,05 / 4,50 €) nu are cod în ListaPret; doar spray-ul de 400 ml are (același preț). Rămân două rânduri fără cod, de lămurit.
- În formular, toate auxiliarele sunt puse la categoria de adaos **5 (holțșuruburi)** — categoriile 6 și 7 nu sunt alocate în ListaPret. Fără importanță pentru soft; gruparea noastră e cea din tabelul de mai sus.
- PDF-ul are o greșeală de tipar la folia de 200 g cu 2 benzi: scrie „1,50*50 m (30 mp/rolă)"; 30 mp înseamnă 1,50 × 20 m. Prețul (31,60) corespunde rolei de 30 mp.
- Bandă aerisire streașină 5 m × 100 mm: în PDF eticheta rândului e ruptă pe două linii; prețul 3,08 e al ei (cod BANDAAER501).

---

## 4. Decizii (09.09.2026)

1. Foliile, ventilarea și coșul de ventilare rămân unde erau: **Fixare și etanșare**. Nu apare o rubrică nouă.
2. **Corectorul colorat** e produs nou, diferit de spray; Bilka nu i-a alocat încă un cod. Rămâne în catalog **fără cod furnizor**; codul se completează la o actualizare viitoare. Regulă generală pentru soft: un furnizor poate avea produse noi fără cod — catalogul le acceptă, iar la importul următor ecranul de diferențe propune potrivirea codurilor noi cu produsele fără cod.
3. Când Bilka alocă un singur cod pentru două produse (benzi profilate streașină / coamă, ruperea pantei convexă / concavă), softul folosește acel cod pentru amândouă.
4. Holțșuruburile la cutie, foliile la rolă (sul); foliile de aluminiu se vând — toate active.
5. Ambalarea din Excel nu se importă.
