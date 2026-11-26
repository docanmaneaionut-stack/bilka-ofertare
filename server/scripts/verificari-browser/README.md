# Verificări în browser

Scenariile de browser rulate la sfârșitul sesiunilor (puppeteer), ținute în proiect ca să poată fi rulate din nou la
fiecare schimbare de ecran. **Fără parole sau chei în fișiere**: adresa, contul și parola se dau ca argumente la rulare.

## Unde se rulează

- **Instanța de test** (baza de test, datele lăsate de suita automată): serverul pe portul 4010, ecranul pe 5175.
  Conturile sunt cele create de testele automate (`…@exemplu.local`), cu parola de test din `tests/helpers.ts`.
  Înainte de un scenariu se rulează fișierul de test care îi lasă datele (scris în capul fiecărui script).
- **Baza de lucru**: doar scripturile marcate „DOAR CITIRE”, cu contul de probă, pe ofertele lui de probă (TST-…).
  Nu se creează conturi, nu se schimbă parole, nu se ating date reale.

Pornirea instanței de test (din `server/`, respectiv `web/`):

```
DATABASE_URL=<adresa bazei de test> PORT=4010 DATE_DIR=data-test FRONTEND_ORIGIN=http://localhost:5175 npx tsx src/index.ts
VITE_API_PROXY=http://localhost:4010 npx vite --port 5175 --strictPort
```

## Rulare

```
node scripts/verificari-browser/<script>.cjs <adresa> <cont> <parola> <folder-capturi>
```

Fiecare script scrie `OK` / `PICA` pentru fiecare verificare și, la sfârșit, câte au trecut; iese cu cod diferit de
zero dacă a picat ceva. Capturile merg în folderul dat (de obicei `docs/verificari/Sxx-capturi/`).

## Scripturi

| Script | Ce verifică | Datele le lasă |
|---|---|---|
| `s29b-editor.cjs` | S29b — accesoriile la lungimi (rândurile adăugate ulterior, două poziții cu aceeași desfășurată, treapta salvată), salvarea refuzată la vedere (starea, banda cu clic spre rând, punctul roșu, oprirea la status / documente / „⋯”, avertizarea la plecare), rândul incomplet, coșul pe rând și eliminarea blocului cu confirmare (BUG-25), treapta la speciale 2 ML (BUG-26), sistemul pluvial (BUG-27) după redeschidere, formularul Bilka generat și citit înapoi (`citeste-formular.ts`), desktop și 390 px | `tests/ofe-s29b.test.ts` |
| `s29-bug20-21.cjs` | BUG-20 (rândul adăugat cu „+” rămâne fără cantitate, la locul lui), BUG-21 (lista de prețuri și PDF-ul în ordinea de pe ecran) | `tests/ofe-s29.test.ts` |
| `s29-m12.cjs` | M12 — pagina ofertei pe trei file: rândurile fixe, filele (poziția ținută, adresa, Alt + 1 / 2 / 3), benzile care se strâng, bara de rubrici, statusul dintr-un clic, saltul la filă și la câmp, „Salvează”, „Grupă %”, oferta comandată, telefonul | `tests/ofe-s29.test.ts` |
| `s25-s27-pagina-ofertei.cjs` | scenariile de pagina ofertei din S25–S27 (căsuța de cantitate, Tab / Enter, coșul, căutarea fără diacritice, modurile de cantitate, „fără telefon”, montator și recomandare, sugestiile pe nume, speciale 2 ML de sine stătătoare, montatorul reținut) | `tests/ofe-s29.test.ts` |
| `s26a-comenzi-livrare.cjs` | S26a — livrarea de la Bilka pe comandă, „telefon dublat” în lista de oferte | `tests/ofe-s26a.test.ts` |
| `s26b-ajustare-montator.cjs` | S26b — ajustarea prețului de vânzare pe comandă, montator și recomandare (ofertă și comandă) | `tests/ofe-s26b.test.ts` |
| `s27-tabel-comenzi.cjs` | S27 — tabelul de comenzi (M10), desktop și 390 px | `tests/ofe-s27.test.ts` |
| `s27b-comanda-manuala.cjs` | S27b — comanda manuală nu suprascrie fișa clientului (BUG-17), cu regulile din S28 | `tests/ofe-s27b.test.ts` |
| `s28-comenzi-clienti.cjs` | S28 — agentul vede toate comenzile (M11), adresa lucrării pe comanda manuală (BUG-18), coșul de pe fișa clientului (BUG-19) | `tests/com-s28.test.ts` |
| `inventar-oferta.cjs` | DOAR CITIRE: fotografia paginii ofertei (rubricile cu rândurile lor, în ordine, câmpurile, butoanele, mesajele) — se rulează înainte și după o schimbare de ecran | orice ofertă vizibilă contului |
| `compara-inventar.cjs` | compară două fotografii făcute cu `inventar-oferta.cjs`: aceleași rânduri în fiecare rubrică, nimic dispărut de pe pagină | — |
| `capturi-oferta.cjs` | DOAR CITIRE: capturile paginii ofertei pe fiecare filă, pe ecran lat și pe telefon | orice ofertă vizibilă contului |

Scripturile S26a–S28 primesc doar `<adresa> <parola> <folder-capturi>` (conturile lor de test sunt cele create de fișierul de test).

`comun.cjs` — ajutoarele comune (conectare, așteptare, capturi, lista de verificări).
