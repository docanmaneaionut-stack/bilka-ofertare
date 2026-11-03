# Formularul de comandă Bilka — Excel ca arbitru (proba pe trei formulare)

Scris de `npm run verifica:formular` (S17c). Șablon: **70eb8c14-4cf8-4866-a5c8-bf3026f6ca88.xlsm (modificat 2026-10-20)**. Pornit 2026-11-03 11:20, actualizat 2026-11-03 11:21. Oferte rulate: 4 din 4 planificate; produse verificate: 37.

## Ce rulează automat în Excel (verificat în codul VBA, S17b / S17c)

La deschidere rulează `Workbook_Open`: adaugă bara de butoane Bilka și activează foaia FORMULAR COMANDA. La salvare rulează `Workbook_BeforeSave` → `ExportToPortal`: golește foaia „Portal” și o rescrie din celulele formularului (învelitoare, secundară, șipcă, accesorii, pluvial, speciale, ferestre), apelând doar funcțiile de calcul din registru (`CalcPretTigla`, `CalcPretSipca`, `getCheieAccesoriu`, `getValueFromTable`). Singurele apeluri în afara registrului din tot proiectul VBA sunt în `GetDataSap` și `SaveOfertaSap` (obiectele `SAP.LogonControl`, `SAP.Functions`), pornite numai din butoanele „Get Date SAP” / „Save Oferta SAP” / „Save Comanda SAP” și din butoanele foii (`Incarcaoferta_Click`, `Incarcacomanda_Click`); nicio procedură automată nu le apelează. Nu există apeluri de rețea, shell, fișiere sau e-mail în rest. Evenimentele de foaie (`Worksheet_Change` pe modelul E23, pe foaia Preturi, pe AUX1) lucrează doar pe celule. Concluzie: deschiderea și salvarea prin automatizare rulează doar rescrierea foii Portal și calculele; nimic nu pleacă nicăieri.

## Rezumat

| Categorie | Produse |
|---|---|
| Corecte | 33 |
| (a) Nu s-au exportat — se rezolvă în Referințe | 0 |
| (b) Se rezolvă în cod | 0 |
| (c) N-au loc în formular prin natura lui | 2 |
| (d) De clarificat cu Bilka | 2 |
| Erori de rulare (se reiau la următoarea rulare) | 0 |


## (d) De clarificat cu Bilka — 2

| Cod | Produs | Cheie | Ce s-a întâmplat | Preț catalog / Excel | Portal |
|---|---|---|---|---|---|
| ASCF4MAT050 | Set coș fum (4 piese × 1,25 m) – 4 piese × 1,25 m – mat – 0,50 mm | PROBA | E01 | în Portal sub codul (gol — macro-ul Bilka nu dă cod pentru numele „SET COS FUM ( 4 PIESE  )”), în catalog ASCF4MAT050 | 19.62 / 19.62 | Accesorii_Tinichigerie ·  · 1 |
| AXSPRMAT400 | Spray corector 400 ml – mat | PROBA | E01 | în Portal sub codul AXSPRMAT000, în catalog AXSPRMAT400 | 4.50 / 4.50 | Accesorii_Auxiliare · AXSPRMAT000 · 3 |

## (c) N-au loc în formular prin natura lui — 2

| Cod | Produs | Cheie | Ce s-a întâmplat | Preț catalog / Excel | Portal |
|---|---|---|---|---|---|
| ACI41LUC050 | Coamă unghiulară industrială – 417 mm / 2 m – lucios – 0,50 mm | PROBA | T35 | acoperis | două produse pe același rând al formularului (M4 la S17d) | 6.28 / — | — |
| ACI41LUC050 | Coamă unghiulară industrială – 417 mm / 2 m – lucios – 0,50 mm | PROBA | T35 | perete | două produse pe același rând al formularului (M4 la S17d) | 6.28 / — | — |

Starea completă, pe fiecare produs (inclusiv cele corecte): `formular-bilka-proba.json`.
