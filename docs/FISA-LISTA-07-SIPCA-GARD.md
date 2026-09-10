# Fișa listei 07 — ȘIPCĂ METALICĂ DE GARD (Bilka)

Versiunea 1.0 · 10 septembrie 2026 · Status: ÎNCHISĂ (deciziile lui Ionuț din 10.09.2026)
Extrasul de import: `docs/import/bilka/07-sipca-gard.csv` (83 de rânduri, 83 de coduri Bilka, 0 fără cod; separator „;")

## 1. Ce conține

| Profil | Lățime totală = utilă | Rânduri | Unitate |
|---|---|---|---|
| Haga | 111,3 mm | 20 | ml |
| Oslo | 92,9 mm | 23 (are și 0,60 la lucios, mat, zincat) | ml |
| Berna | 105 mm | 20 | ml |
| Sofia | 106 mm | 20 | ml |

Finisaje: lucios (0,50 / 0,45 / 0,40), lucios dublu vopsit (0,50 / 0,40), RAL 8003 (0,45), Wood (0,50 / 0,45), mat (0,50 / 0,45 / 0,40), mat dublu vopsit (0,50 / 0,40), Grande Mat 0,50, Magnelis 0,50, zincat (0,50 / 0,45 / 0,40), SSAB lucios / mat 0,60.
Haga, Berna și Sofia au **prețuri identice**; Oslo diferă. Toate cele 83 de coduri au prețul identic în ListaPret. Oslo SSAB (1,65 / 2,06) are în ListaPret codurile `SIPCADPL057` / `SIPCADPM057`: Bilka le codifică pe grosimea reală a tablei SSAB, 0,57 mm, în timp ce PDF-ul scrie 0,60 — același produs, același preț.

Reconciliere cu ListaPret: 11 coduri de șipcă există doar în formular și nu se importă (Berna și Sofia în 0,60 lucios / mat / zincat, Oslo Aluzinc 0,50, Oslo lucios 0,70 și zincat 0,70) — decizia din 05.09; în PDF nu există nimic fără cod.

## 2. Reguli reținute

- Vânzare la **metru liniar**. La ofertă vor exista **două variante de calcul**, care se detaliază în fișa OFERTARE (calculul din v4.1 nu se preia ca atare); lățimile din CSV rămân disponibile pentru ele.
- Capăt drept sau rotund: același preț, se alege la ofertă (informație pentru comandă).

## 3. Decizii (10.09.2026)

1. **Rubrică proprie „Șipcă gard"** la ofertă.
2. Două variante de calcul, detaliate la ofertare.
