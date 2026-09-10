# Fișa listelor 03 + 04 — SISTEM PLUVIAL (Bilka)

Versiunea 1.0 · 9 septembrie 2026 · Status: ÎNCHISĂ (confirmată de Ionuț 09.09.2026)
Extrasul de import: `docs/import/bilka/03-04-pluvial.csv` (138 de rânduri, 138 de coduri Bilka, toate cu prețul identic în ListaPret; separator „;")

---

## 1. Ce conține

| Finisaj | Sisteme | Familii | Rânduri | Unitate | Categorie de ofertă |
|---|---|---|---|---|---|
| Colorat (lucios, SSAB) — lista 03 | 125 / 90 și 150 / 100 | 23 per sistem | 46 | buc | Sistem pluvial |
| Mat — lista 03 | 125 / 90 și 150 / 100 | 23 per sistem | 46 | buc | Sistem pluvial |
| Magnelis — lista 04 | 125 / 90 și 150 / 100 | 23 per sistem | 46 | buc | Sistem pluvial |

Familiile (identice în toate cele trei finisaje): jgheab 4 / 3 / 2 m, burlan 3 m, cârlig jgheab 210 mm / 160 mm / combi / răsucit / reglabil, cârlig 150/300 cu tăbliță (doar la 150), bridă jgheab, colier burlan, brățară burlan, capac jgheab, element îmbinare jgheab, racord jgheab – burlan, cot 60°, pâlnie, prelungitor intermediar 1 m, colțar exterior 90°, colțar interior 90°, ramificație burlan, derivație evacuare, cot de evacuare.

PDF-ul are 47 × 3 = 141 de poziții; CSV-ul are 138 pentru că **brida de jgheab** e același produs (același cod, același preț) la ambele sisteme — apare o singură dată pe finisaj.

---

## 2. Atribute

- **`sistem`** — 125 / 90 sau 150 / 100 (jgheab / burlan). La ofertă, agentul alege sistemul și finisajul o dată, apoi cantitățile.
- **`culori_disponibile`** — colorat: 3005, 3009, 3011, 6020, 7011, 7016, 8003, 8004, 8017, 8019, 9005, 9006, 9010 · mat: 7016, 7024, 8017, 8019, 9005 (disponibilitate în stoc conform informării) · Magnelis: fără culoare.
- Colorat și mat au **prețuri identice**; Magnelis diferă. Garanții din PDF (informativ, pentru ofertă): colorat 15 ani culoare / 30 coroziune; mat 20 / 30; Magnelis 10 ani coroziune.

---

## 3. Observații din corelare

- Coduri cu sufix propriu în ListaPret (fără efect asupra prețului): bridă `…BRIDA0000`, prelungitor `…PRE09010M` / `…PRE10010M`, cârlig 150/300 `…C30150TAB`, derivație `DERIVLUC` / `DERIVMAT` / `DERIVMGN` + 090 / 100.
- Ambalarea („5 buc / pachet", „100 buc / cutie") nu se importă (decizia ta din 09.09): comanda se face la bucată.

---

## 4. Decizii (10.09.2026)

1. Toate cele trei finisaje și ambele sisteme: active.
2. **Pluvialul Aluzinc** (nu are listă PDF; există doar în formular, 37 de coduri) intră în soft la decizia lui Ionuț: extras separat `docs/import/bilka/04b-pluvial-aluzinc.csv`, prețuri din ListaPret; două coduri cu preț 0 în formular (cârlig răsucit 125 / 150) sunt inactive până apare un preț.
