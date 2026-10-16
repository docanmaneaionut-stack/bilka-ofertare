# Fișa de modul — COMENZI (COM: comenzi, livrări, încasări, retururi)

Versiunea 0.2 · 13 octombrie 2026 · Status: ÎN LUCRU — capitolele se scriu și se închid unul câte unul, ca la OFERTARE
Se sprijină pe: FISA-CONTURI (cine ce poate), FISA-OFERTARE cap. 16 (ce intră automat în comandă), cap. 2b (lucrări și completări), cap. 19 (tabelul de vânzări), cap. 13 (documentele).
Machetă de ecran: `docs/design/ecran-tabel-comenzi.png` (+ `.pdf`, `.html`).

| Nr. | Capitol | Conținut | Status |
|---|---|---|---|
| 1 | Tabelul de comenzi (ecranul) | coloane, rândul desfășurat, filtre, ordine, cine vede ce | PROPUS (machetă) |
| 2 | Încasările | „+ Notează încasare": sumă · dată · ce reprezintă; statusul rezultat | PROPUS |
| 3 | Statusurile logistice | Comandat → Recepționat / Recepționat parțial → Livrat; livrarea | PROPUS (din OFERTARE 16) |
| 4 | Comisioanele | montator / recomandare: sumă cu istoric, „achitat"; legătura cu tabelul de vânzări | PROPUS |
| 4b | Comenzile manuale | „+ Comandă manuală": comenzi fără ofertă, urmărite pe tot parcursul; alocarea pe cont; „neidentificată" | ÎNCHIS (13.10) |
| 4c | Fișa șoferului | comenzi selectate → fișă PDF pentru încărcare și livrare, telefoane apelabile, trimisă pe WhatsApp cu locațiile; machetă `docs/design/macheta-fisa-soferului.pdf` | PROPUS (machetă) |
| 5 | Retururi și nota de retur | calcul la prețurile din ofertă, rând legat în vânzări, nota pentru client | de descris |
| 6 | Documentele comenzii | formularele Bilka (export), ofertă detaliată, tabel de facturare, FGO, aviz de marfă | de descris |
| 7 | Tabelul de vânzări | implementarea cap. 19 din OFERTARE | închis acolo |

---

## Capitolul 1 — Tabelul de comenzi — PROPUNERE (machetă, 13.10.2026)

**Capul paginii:** „Comenzi" cu numărătoarea (active · de recepționat · neîncasate complet · comisioane neachitate · neidentificate); căutare într-o singură căsuță (client, telefon, număr, localitate, montator); butoanele „🚚 Fișa șoferului (n)" (activ când sunt bifate comenzi) și „+ Comandă manuală". Fiecare rând are o **căsuță de selecție** pentru fișa șoferului.
**Filtre:** statusul logistic ca șir de butoane (Toate · Comandat · Recepționat · Recepționat parțial · Livrat); încasarea (toate / neîncasat / parțial / încasat); perioada; agentul (Administrator) și firma (Contabilitate, Gestiune, Admin general, după setarea de acces la firme); „Comisioane neachitate (n)"; „Arată și comenzile închise".
**Coloanele (un rând = o comandă):** Nr. și data comenzii, cu **responsabilul** dedesubt — contul care a trimis comanda la furnizor: „trimisă de Ionuț B."; la comenzile manuale: „adăugat de Maria P. pentru: Dănuț S. (colaborator)" (decis 13.10.2026) · Client (nume, localitate, telefon; la completări: „completare la IB-0147") · **Rezumat comandă** (linia generată, cap. 16) · Montator (nume, telefon; comisionul și bifa „achitat") · Total (lei mare, euro dedesubt) · **Încasat** (suma încasată, restul, eticheta neîncasat / încasat parțial / încasat) · Status logistic (etichetă; la „Recepționat parțial" asteriscul roșu și nota lipsurilor) · Livrare (indicațiile; după livrare, data) · acțiuni: **Deschide ▾** (desfășoară rândul), **Doc. ▾**, **⋯**.
**Rândul desfășurat** (patru casete, toată lumea vede același lucru): **Încasări** — lista încasărilor și „+ Notează încasare", restul de încasat; **Livrare și facturare** — indicațiile de livrare (cu cine și când le-a scris), datele de facturare dacă diferă, formularele Bilka trimise; **Statusuri** — fiecare status cu data și cine l-a pus, comisionul montatorului cu „achitat"; **Observații** — cu istoric (cine, ce, când), atașamente, locația pe WhatsApp.
**Ordine (decisă 13.10.2026):** invers cronologic după **data intrării în tabel**, cele mai noi sus; toate comenzile cu statusul **Livrat și încasat** trec la sfârșitul listei, în aceeași ordine invers cronologică (ascunse implicit, „Arată și comenzile închise"). Orice coloană se poate sorta altfel, temporar.
**Cine vede / cine face** (fișa CONTURI): Administratorul agentului — încasările și bifa „achitat"; Administratorii și Gestiunea — statusurile logistice, livrarea, observațiile; Contabilitatea — doar vizualizare și documente; agentul — comenzile firmei, cu modificări doar pe detaliile comenzilor lui (contacte, observații, comision montator cu istoric); colaboratorul — doar comenzile lui.
**Pe telefon:** număr, client, rezumat, total, status, încasare; restul la desfășurare.

## Capitolul 2 — Încasările — PROPUNERE (acceptată în principiu 13.10.2026)

Pe fiecare comandă, butonul **„+ Notează încasare"**: **suma**, **data** și **un text cu ce reprezintă** (avans luat de agent, tranșa 2 numerar, transfer bancar, rest la livrare…). Doar **Administratorul agentului** înregistrează și certifică încasările (fișa CONTURI); fiecare încasare are autorul și momentul, se poate corecta doar cu istoric.
Statusul încasării **rezultă singur**: nimic înregistrat = **neîncasat**; mai puțin decât totalul = **încasat parțial** (suma încasată și restul la vedere); tot = **încasat**. Avansul de la „Avans luat" (ofertă) apare ca prima încasare propusă, de confirmat de Administrator când banii ajung la birou (bifa „avans încasat" din CONTURI devine această confirmare).
*De lămurit:* încasările în euro (rar?) se notează în lei la cursul zilei; o încasare mai mare decât restul (avans pentru o completare) — se leagă de completare sau rămâne pe comanda inițială?

## Capitolul 3 — Statusurile logistice — PROPUS (din OFERTARE cap. 16)

Inițial **Comandat**; → **Recepționat** sau **Recepționat parțial** (mai mulți furnizori sau lipsuri; asterisc roșu + nota lipsurilor); → **Livrat**. Le pun Administratorii și Gestiunea, cu istoric. Livrarea: indicații text (ex. „marți 20.10.2026 după 14:00"), programată de Gestiune după discuția cu clientul; locația pe WhatsApp și panotajul se trimit din comandă.
*De lămurit:* o comandă de la mai mulți furnizori (Bilka + Fakro) are un singur rând cu „Recepționat parțial" până vine tot, sau rânduri per furnizor?

## Capitolul 4 — Comisioanele — PROPUS

Comisionul montatorului / al recomandării: sumă fixă, cu istoric (asterisc roșu, „Vezi istoric"); bifa **„achitat"** o pune Administratorul; Gestiunea vede sumele (adesea plătește ea). Comisionul agentului se lucrează în tabelul de vânzări (OFERTARE cap. 19), nu pe comandă.

## Capitolul 4b — Comenzile manuale — ÎNCHIS (13.10.2026)

Multe comenzi nu trec prin soft (necesaruri trimise de colaboratori, comenzi telefonice, comenzi făcute direct la fabrică); ele trebuie urmărite la fel: statusuri, livrare, încasări, comisioane, vânzări.
- Le introduc **Administratorii sau Gestiunea**, din butonul **„+ Comandă manuală"**: clientul (nume, telefon, localitate — din baza comună dacă există), rezumatul comenzii (text liber, în forma celui generat), total și avans, montator și comision, indicații de livrare, observații, atașamente (necesarul primit, formularul trimis).
- **Contul alocat** („pentru: …"): orice cont — colaborator, agent sau chiar Administratorul însuși; **alocarea o pot schimba doar Administratorii**. O comandă poate rămâne **fără cont alocat = „neidentificată"** (colaboratori care comandă direct la fabrică și uită să anunțe) până se află a cui e și în sarcina cui se află colaboratorul; apare marcată vizibil și numărată în capul paginii.
- În tabel: „adăugat de «cont» pentru: «contul alocat»" sau „neidentificată"; numerotare proprie (serie CM) și marcajul „manuală". De la creare încolo, totul e identic cu o comandă din ofertă.
- **În tabelul de vânzări** comanda manuală apare **fără sume** (cost de achiziție / preț de vânzare); le completează manual **Administratorul contului alocat**, ca să intre în adaos și comisioane. O comandă neidentificată rămâne în tabel fără sume până la alocare.

## Capitolul 4c — Fișa șoferului — PROPUNERE (machetă din 13.10.2026: `docs/design/macheta-fisa-soferului.pdf`)

Pentru Gestiune și logistică (acces identic pentru Administratori): în tabelul de comenzi se **bifează una sau mai multe comenzi** → **„Fișa șoferului"** deschide un ecran cu fișa generată și, de acolo:
- **fișa, ca PDF**: pe fiecare comandă un bloc cu numărul, **clientul și telefonul (apelabil din PDF)**, adresa cu **link la locație** (dacă există), marfa — rezumatul comenzii, colile cu lungimi × bucăți și numărul de piese pe categorii —, indicațiile de livrare, montatorul cu telefonul (apelabil), **de încasat** (restul, mare), căsuțe „predat: marfă · bani · aviz semnat"; sus: data, numărul de livrări, mașina, telefonul Gestiunii; ordinea blocurilor = ordinea propusă a traseului (rearanjabilă);
- **tipărirea** avizului de marfă și / sau a tabelului de facturare pentru fiecare comandă din fișă;
- **trimiterea pe WhatsApp** a fișei (PDF) și a locațiilor disponibile, către șofer.
Telefoanele: puse în PDF ca legături `tel:` (se apelează cu o atingere din WhatsApp sau din orice vizualizator) și scrise și ca text, pentru vizualizatoarele care recunosc singure numerele.
*De lămurit:* fișa se salvează pe comenzi (cine a livrat, când) și marchează automat livrarea ca „programată"? Șoferii sunt conturi în soft (primesc fișa în aplicație) sau rămân pe WhatsApp? Ce date lipsesc pe machetă?

## Capitolele 5–6 — de descris de Ionuț

Retururile (cine le calculează — orice cont —, la prețurile din ofertă; nota de retur pentru client; rândul legat din tabelul de vânzări; marfa returnată intră în Stoc?) și documentele comenzii (exportul formularelor Bilka — un formular per pachet; FGO; avizul de marfă din OFERTARE cap. 22).
