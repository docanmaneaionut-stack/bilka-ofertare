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
| `s29-bug20-21.cjs` | BUG-20 (rândul adăugat cu „+” rămâne fără cantitate, la locul lui), BUG-21 (lista de prețuri și PDF-ul în ordinea de pe ecran) | `tests/ofe-s29.test.ts` |

| `inventar-oferta.cjs` | DOAR CITIRE: fotografia paginii ofertei (rubricile cu rândurile lor, în ordine, câmpurile, butoanele, mesajele) — se rulează înainte și după o schimbare de ecran și se compară | orice ofertă vizibilă contului |

`comun.cjs` — ajutoarele comune (conectare, așteptare, capturi, lista de verificări).
