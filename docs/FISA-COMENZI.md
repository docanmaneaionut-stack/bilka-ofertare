# Fișa de modul — COMENZI (COM: comenzi, livrări, încasări, retururi)

Versiunea 1.2 · 16 octombrie 2026 · Status: ÎNCHISĂ (capitolele 1–9; un singur punct deschis, la cap. 3, nu blochează). Se reia doar printr-o cerere explicită de MODIFICARE.
Se sprijină pe: FISA-CONTURI (cine ce poate), FISA-OFERTARE cap. 16 (ce intră automat în comandă), cap. 2b (lucrări și completări), cap. 19 (tabelul de vânzări), cap. 13 (documentele).
Machetă de ecran: `docs/design/ecran-tabel-comenzi.png` (+ `.pdf`, `.html`).

| Nr. | Capitol | Conținut | Status |
|---|---|---|---|
| 1 | Tabelul de comenzi (ecranul) | coloane, rândul desfășurat, filtre, ordine, cine vede ce | ÎNCHIS (13.10, machetă acceptată) |
| 2 | Încasările | „+ Notează încasare": sumă · dată · ce reprezintă; statusul rezultat; încasările în euro | ÎNCHIS (16.10) |
| 3 | Statusurile logistice | Comandat → Recepționat / Recepționat parțial → Livrat; livrarea | ÎNCHIS (din OFERTARE 16); 1 punct deschis |
| 4 | Comisioanele | montator / recomandare: sumă cu istoric, „achitat"; legătura cu tabelul de vânzări | ÎNCHIS (din CONTURI + OFERTARE 12) |
| 4b | Comenzile manuale | „+ Comandă manuală": comenzi fără ofertă, urmărite pe tot parcursul; alocarea pe cont; „neidentificată" | ÎNCHIS (13.10) |
| 4c | Fișa șoferului | comenzi selectate → fișă PDF pentru încărcare și livrare, telefoane apelabile, trimisă pe WhatsApp cu locațiile; machetă `docs/design/macheta-fisa-soferului.pdf` | ÎNCHIS (16.10) |
| 5 | Retururi și nota de retur | calcul la prețurile din ofertă, rând legat în vânzări, nota pentru client | ÎNCHIS (16.10) |
| 6 | Documentele comenzii | formularele Bilka (export), ofertă detaliată, tabel de facturare, FGO, aviz de marfă | ÎNCHIS (consolidare, nimic nou de decis) |
| 7 | Tabelul de vânzări | implementarea cap. 19 din OFERTARE | închis acolo |
| 8 | Evidența paleților | „Notă palet" pe comandă, care alimentează rubrica „Evidența paleților" cu statusul recuperat / nerecuperat | ÎNCHIS (16.10) |
| 9 | Avizul de însoțire a mărfii | documentul de livrare: detaliata fără valori, căsuță pe rând, semnătura de recepție, dublu exemplar; machetă `docs/design/macheta-aviz.pdf` | ÎNCHIS (16.10, machetă aprobată) |

---

## Capitolul 1 — Tabelul de comenzi — ÎNCHIS (13.10.2026; machetă acceptată, cu completările lui Ionuț: responsabil, comenzi manuale, ordine)

**Capul paginii:** „Comenzi" cu numărătoarea (active · de recepționat · neîncasate complet · comisioane neachitate · neidentificate); căutare într-o singură căsuță (client, telefon, număr, localitate, montator); butoanele „🚚 Fișa șoferului (n)" (activ când sunt bifate comenzi) și „+ Comandă manuală". Fiecare rând are o **căsuță de selecție** pentru fișa șoferului.
**Filtre:** statusul logistic ca șir de butoane (Toate · Comandat · Recepționat · Recepționat parțial · Livrat); încasarea (toate / neîncasat / parțial / încasat); perioada; agentul (Administrator) și firma (Contabilitate, Gestiune, Admin general, după setarea de acces la firme); „Comisioane neachitate (n)"; „Arată și comenzile închise".
**Coloanele (un rând = o comandă):** Nr. și data comenzii, cu **responsabilul** dedesubt — contul care a trimis comanda la furnizor: „trimisă de Ionuț B."; la comenzile manuale: „adăugat de Maria P. pentru: Dănuț S. (colaborator)" (decis 13.10.2026) · Client (nume, localitate, telefon; la completări: „completare la IB-0147") · **Rezumat comandă** (linia generată, cap. 16) · Montator (nume, telefon; comisionul și bifa „achitat") · Total (lei mare, euro dedesubt) · **Încasat** (suma încasată, restul, eticheta neîncasat / încasat parțial / încasat) · Status logistic (etichetă; la „Recepționat parțial" asteriscul roșu și nota lipsurilor) · Livrare (indicațiile; după livrare, data) · acțiuni: **Deschide ▾** (desfășoară rândul), **Doc. ▾**, **⋯**.
**Rândul desfășurat** (patru casete, toată lumea vede același lucru): **Încasări** — lista încasărilor și „+ Notează încasare", restul de încasat; **Livrare și facturare** — indicațiile de livrare (cu cine și când le-a scris), datele de facturare dacă diferă, formularele Bilka trimise; **Statusuri** — fiecare status cu data și cine l-a pus, comisionul montatorului cu „achitat"; **Observații** — cu istoric (cine, ce, când), atașamente, locația pe WhatsApp.
**Ordine (decisă 13.10.2026):** invers cronologic după **data intrării în tabel**, cele mai noi sus; toate comenzile cu statusul **Livrat și încasat** trec la sfârșitul listei, în aceeași ordine invers cronologică (ascunse implicit, „Arată și comenzile închise"). Orice coloană se poate sorta altfel, temporar.
**Cine vede / cine face** (fișa CONTURI): Administratorul agentului — încasările și bifa „achitat"; Administratorii și Gestiunea — statusurile logistice, livrarea, observațiile; Contabilitatea — doar vizualizare și documente; agentul — comenzile firmei, cu modificări doar pe detaliile comenzilor lui (contacte, observații, comision montator cu istoric); colaboratorul — doar comenzile lui.
**Pe telefon:** număr, client, rezumat, total, status, încasare; restul la desfășurare.

## Capitolul 2 — Încasările — ÎNCHIS (16.10.2026)

Pe fiecare comandă, butonul **„+ Notează încasare"**: **suma**, **data** și **un text cu ce reprezintă** (avans luat de agent, tranșa 2 numerar, transfer bancar, rest la livrare…). Doar **Administratorul agentului** înregistrează și certifică încasările (fișa CONTURI); fiecare încasare are autorul și momentul, se poate corecta doar cu istoric.
Statusul încasării **rezultă singur**: nimic înregistrat = **neîncasat**; mai puțin decât totalul = **încasat parțial** (suma încasată și restul la vedere); tot = **încasat**. Avansul de la „Avans luat" (ofertă) apare ca prima încasare propusă, de confirmat de Administrator când banii ajung la birou (bifa „avans încasat" din CONTURI devine această confirmare).
**Încasările în euro** sunt rare; le gestionează Administratorul alocat, după situație: notează „încasat X lei" (echivalentul), iar dacă rămâne o diferență o notează ca atare, altfel trece statusul în încasat. O încasare aparține comenzii pe care e notată; textul „ce reprezintă" lămurește cazurile speciale (ex. avans pentru completare).

## Capitolul 3 — Statusurile logistice — ÎNCHIS (din OFERTARE cap. 16)

Inițial **Comandat**; → **Recepționat** sau **Recepționat parțial** (mai mulți furnizori sau lipsuri; asterisc roșu + nota lipsurilor); → **Livrat**. Le pun Administratorii și Gestiunea, cu istoric. Livrarea: indicații text (ex. „marți 20.10.2026 după 14:00"), programată de Gestiune după discuția cu clientul; locația pe WhatsApp și panotajul se trimit din comandă.
*Punct deschis (nu blochează; se decide când apar ferestrele):* o comandă de la mai mulți furnizori (Bilka + Fakro) — un singur rând cu „Recepționat parțial" până vine tot, sau rânduri per furnizor.

## Capitolul 4 — Comisioanele — ÎNCHIS (reguli din CONTURI și OFERTARE 12)

Comisionul montatorului / al recomandării: sumă fixă, cu istoric (asterisc roșu, „Vezi istoric"); bifa **„achitat"** o pune Administratorul; Gestiunea vede sumele (adesea plătește ea). Comisionul agentului se lucrează în tabelul de vânzări (OFERTARE cap. 19), nu pe comandă.

## Capitolul 4b — Comenzile manuale — ÎNCHIS (13.10.2026)

Multe comenzi nu trec prin soft (necesaruri trimise de colaboratori, comenzi telefonice, comenzi făcute direct la fabrică); ele trebuie urmărite la fel: statusuri, livrare, încasări, comisioane, vânzări.
- Le introduc **Administratorii sau Gestiunea**, din butonul **„+ Comandă manuală"**: clientul (nume, telefon, localitate — din baza comună dacă există), rezumatul comenzii (text liber, în forma celui generat), total și avans, montator și comision, indicații de livrare, observații, atașamente (necesarul primit, formularul trimis).
- **Contul alocat** („pentru: …"): orice cont — colaborator, agent sau chiar Administratorul însuși; **alocarea o pot schimba doar Administratorii**. O comandă poate rămâne **fără cont alocat = „neidentificată"** (colaboratori care comandă direct la fabrică și uită să anunțe) până se află a cui e și în sarcina cui se află colaboratorul; apare marcată vizibil și numărată în capul paginii.
- În tabel: „adăugat de «cont» pentru: «contul alocat»" sau „neidentificată"; numerotare proprie (serie CM) și marcajul „manuală". De la creare încolo, totul e identic cu o comandă din ofertă.
- **În tabelul de vânzări** comanda manuală apare **fără sume** (cost de achiziție / preț de vânzare); le completează manual **Administratorul contului alocat**, ca să intre în adaos și comisioane. O comandă neidentificată rămâne în tabel fără sume până la alocare.

## Capitolul 4c — Fișa șoferului — ÎNCHIS (16.10.2026; machetă: `docs/design/macheta-fisa-soferului.pdf`)

Pentru Gestiune și logistică (acces identic pentru Administratori): în tabelul de comenzi se **bifează una sau mai multe comenzi** → **„Fișa șoferului"** deschide un ecran cu fișa generată și, de acolo:
- **fișa, ca PDF**: pe fiecare comandă un bloc cu numărul, **clientul și telefonul (apelabil din PDF)**, adresa cu **link la locație** (dacă există), marfa — rezumatul comenzii, colile cu lungimi × bucăți și numărul de piese pe categorii —, indicațiile de livrare, montatorul cu telefonul (apelabil), **de încasat** (restul, mare), căsuțe „predat: marfă · bani · aviz semnat"; sus: data, numărul de livrări, mașina, telefonul Gestiunii; ordinea blocurilor = ordinea propusă a traseului (rearanjabilă);
- **tipărirea** avizului de marfă și / sau a tabelului de facturare pentru fiecare comandă din fișă;
- **trimiterea pe WhatsApp** a fișei (PDF) și a locațiilor disponibile, către șofer.
Telefoanele: puse în PDF ca legături `tel:` (se apelează cu o atingere din WhatsApp sau din orice vizualizator) și scrise și ca text, pentru vizualizatoarele care recunosc singure numerele.
**Decizii (16.10.2026):** toți **șoferii au cont de Gestiune** (fac în mare ce face gestionarul și au nevoie de aceleași date). Fiecare își **generează fișa pe loc**; softul **nu reține nicio fișă** — e un document de moment; cine vrea să o păstreze o salvează din PDF-ul generat. Din PDF: telefoanele apelabile și **butonul de locație** (link la hartă) sunt suficiente; fișa se trimite pe WhatsApp. Nimic altceva nu se adaugă.

## Capitolul 5 — Retururi și nota de retur — ÎNCHIS (16.10.2026)

- Returul îl poate calcula **orice cont**, din comandă, la **prețurile din oferta acceptată și comandată** (prețurile de vânzare ale liniilor returnate).
- Generează **nota de retur** pentru client: produsele returnate, cantitățile, prețurile din ofertă, suma de restituit (pe același șablon grafic ca oferta).
- **Marfa intră în stoc**, dar **în afara softului** (gestiunea de stoc rămâne separată; nu în compartimentul Stoc al catalogului).
- **Tabelul de vânzări:** dacă pentru lucrare calculul **nu s-a închis**, valorile se actualizează — **valoarea de vânzare scade cu suma returului**, **valoarea de achiziție scade cu valoarea de achiziție a mărfii returnate**, iar adaosul (net și brut) se recalculează. Dacă comisionul era deja achitat: rândul de retur rămâne cu minus și neachitat, de regularizat (OFERTARE cap. 19).

## Capitolul 6 — Documentele comenzii — ÎNCHIS (consolidare a deciziilor existente)

Din comandă (meniul „Doc. ▾") se generează sau se deschid: **formularele Bilka** (un formular per pachet / cheie de culoare, unul per culoare de pluvial, unul per model de șipcă — OFERTARE cap. 3.5; trimise pe e-mail la Bilka, cu data trimiterii notată), **oferta detaliată** (cu panotaj și coloana „Primit"), **tabelul de facturare** (în lei), **nota de retur** (cap. 5), **avizul de marfă** (OFERTARE cap. 22 — se proiectează la construcție pe modelul detaliatei), **fișa șoferului** (cap. 4c, din selecția de comenzi) și, când există cont FGO cu API, **„Emite factura în FGO"** (OFERTARE cap. 13.9). Documentele generate pentru client rămân în istoricul comenzii; fișa șoferului nu.

## Capitolul 7 — Tabelul de vânzări
Închis în OFERTARE cap. 19; completări din această fișă: comenzile manuale intră fără sume, completate de Administratorul contului alocat (cap. 4b); retururile recalculează adaosul lucrării (cap. 5).

## Capitolul 8 — Evidența paleților — ÎNCHIS (16.10.2026)

**Situația:** Bilka facturează paleții. Marfa vine la depozit, se livrează clientului, paletul se întoarce la noi și îl returnăm la Bilka, care face storno. Două cazuri de urmărit: (1) clientul descarcă mecanizat și **paletul rămâne la el** până îl eliberează, iar noi îl recuperăm ulterior; (2) Bilka **livrează direct la clientul final**, cu șoferul lor — noi nu vedem marfa, dar răspundem ca paletul să ajungă înapoi și storno-ul să se facă. Tipurile de paleți sunt mai multe și valoarea lor nu contează pentru soft: nu se țin tipuri sau prețuri, doar text și stare.

**Mecanismul (același pentru toate situațiile):**
- Pe orice comandă din tabelul de comenzi, butonul **„Notă palet"**: text liber — ce tip de palet a rămas și câți (ex. „2 paleți lungi de tablă, rămași la client — descărcare mecanizată"; „1 palet accesorii, livrare directă Bilka — de verificat storno-ul"). O completează **Gestiunea** (inclusiv șoferii, care au cont de Gestiune) sau **Administratorul**; se poate completa și modifica ulterior, cu istoric (cine, când).
- Comenzile care au notă de palet populează automat rubrica **„Evidența paleților"** (ecran propriu în zona de comenzi): o linie per comandă — numărul comenzii, clientul, localitatea, nota, cine și când a notat, **statusul: nerecuperat / recuperat**, data schimbării statusului. Statusul îl schimbă **doar Administratorul**, cu istoric. „Recuperat" = paletul s-a întors la noi / storno-ul Bilka e confirmat.
- Implicit lista arată paleții **nerecuperați**, cei mai vechi sus; filtru pentru recuperați și pe client. În capul tabelului de comenzi: „n paleți nerecuperați" (ca la comisioanele neachitate).

## Capitolul 9 — Avizul de însoțire a mărfii — ÎNCHIS (16.10.2026; machetă aprobată: `docs/design/macheta-aviz.pdf`; preia OFERTARE cap. 22)

Documentul care însoțește marfa la livrare, generat din comandă (meniul „Doc. ▾", și din ecranul fișei șoferului), de Gestiune sau Contabilitate.
- **Titlul:** „Aviz de însoțire a mărfii". **Antetul** ca la ofertă: firma emitentă (denumire, CUI, J, adresă, telefon, e-mail, siglă), clientul, agentul; numărul comenzii și data; o linie „Exemplarul 1 din 2 — furnizor / 2 din 2 — client · livrare din data · cantități fără valori".
- **Conținutul:** datele **ofertei detaliate, fără valori** — categoriile în ordinea clasică, pe fiecare linie produsul, UM și **cantitatea**; sub învelitoare **panotajul** (lungime × bucăți, mp, total coli); **o căsuță de bifat pe fiecare rând** (și pe fiecare lungime), pentru recepția la fața locului; la final totalul în cuvinte („35 coli de învelitoare · 215 piese").
- **Semnături:** două casete — „Predat" (numele, semnătura, data) și **„Am recepționat marfa"** (numele celui care recepționează, semnătura, data).
- **Dublu exemplar:** PDF-ul conține ambele exemplare, fiecare pe pagina lui (sau pe mai multe, dacă marfa e multă); același șablon grafic ca oferta.
- **Reguli:** un aviz per livrare (o comandă poate avea mai multe, la livrări parțiale — cantitățile se pot ajusta înainte de generare); avizul generat rămâne în istoricul comenzii; **nu e un document fiscal** (fără serie legală, fără prețuri) — factura se emite separat (tabel de facturare / FGO).

**Decis (16.10.2026):** fără datele șoferului / mașinii — caseta „Predat" cu nume și semnătură e suficientă; **identificarea avizului = numărul comenzii**, fără număr de aviz propriu (la livrări parțiale, avizele aceleiași comenzi se deosebesc prin data livrării din antet).
