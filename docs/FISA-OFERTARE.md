# Fișa de modul — OFERTARE (OFE + DOC)

Versiunea 1.1 · 23 octombrie 2026 (MODIFICARE la cap. 11 și 13 — cele două cursuri, totalul în lei, prețul fix „achiziție + x %"; completare la cap. 19 — vânzările colaboratorilor, la 11.3 — procedura grupei, la 11.8 — totalul în lei la abatere, la cap. 9 — liniile zonei B integral manuale, cu UM și opțiuni pe linie (27.10); deciziile lui Ionuț din 23 și 27.10.2026 pe ofertele-model E01–E08, `docs/ETALON.md`) · Status: ÎNCHISĂ pentru oferta clasică (capitolele 0–16, 2b, 19, 21). Rămân deschise, deliberat: 17 Ferestre (când există listele), 18 Offline (după punerea în funcțiune), 20 Pazie și Gard (după oferta clasică), 22 Aviz de marfă (odată cu fișa COMENZI). Se reia doar printr-o cerere explicită de MODIFICARE.
Se sprijină pe: FISA-CONTURI (cine ce poate), FISA-CATALOG-PRETURI (ce produse, ce prețuri, cascada model → finisaj → grosime → culoare).

Fiecare capitol are statusul lui: **PROPUS** (schița mea din descrierea ta) → **ÎNCHIS** (ok-ul tău). Un capitol închis nu se mai reia.

---

## Ordinea de lucru și cuprinsul

| Nr. | Capitol | Subcapitole | Ce aduci tu | Status |
|---|---|---|---|---|
| 1 | **Antetul ofertei** | vezi capitolul scris mai jos | — | ÎNCHIS |
| 2 | **Clientul** | vezi capitolul scris mai jos | — | ÎNCHIS |
| 2b | **Lucrarea: oferta inițială și completările** | vezi capitolul scris mai jos | — | ÎNCHIS |
| 19 | **Tabelul de vânzări și comisioanele** | ecran de lucru: coloane, definiții, lucrări legate, filtre, statistici, cine vede ce | — | ÎNCHIS |
| 3 | **Învelitoarea și pachetele** | selecție, trei moduri de cantități, mai multe învelitori, pachete, exportul în formular, rotunjiri | — | ÎNCHIS |
| 4 | **Accesorii standard** | vezi capitolul scris mai jos | — | ÎNCHIS (listele din 14.09) |
| 5 | **Accesorii speciale** | vezi capitolul scris mai jos | — | ÎNCHIS (14.09) |
| 6 | **Sistem pluvial** | vezi capitolul scris mai jos | — | ÎNCHIS (14.09) |
| 7 | **Fixare și etanșare** | vezi capitolul scris mai jos | — | ÎNCHIS (14.09) |
| 8 | **Șipcă gard** | vezi capitolul scris mai jos | — | ÎNCHIS (14.09) |
| 9 | **Zona B** (lemn, feronerie, manoperă, transport) | vezi capitolul scris mai jos | — | ÎNCHIS (14.09) |
| 10 | **Stoc și alți furnizori pe ofertă** | produsele din Stoc / alt furnizor apar în aceleași rubrici, cu prețul convertit în euro la cursul ofertei când e în lei | — | ÎNCHIS (14.09) |
| 11 | **Prețurile** | vezi capitolul scris mai jos | — | ÎNCHIS (18.09) |
| 12 | **Montatorul și recomandarea** | vezi capitolul scris mai jos | — | ÎNCHIS (18.09) |
| 13 | **Documentele** | vezi capitolul scris mai jos; machete pentru toate patru documentele în `docs/design/` | — | ÎNCHIS (13.10) |
| 14 | **Statusuri, istoric, intervenții** | vezi capitolul scris mai jos | — | ÎNCHIS (13.10) |
| 15 | **Lista de oferte** | propunerea lui Claude (acceptată 13.10) + ordinea decisă de Ionuț; macheta de ecran `docs/design/ecran-lista-oferte.png` | — | ÎNCHIS (13.10) |
| 16 | **Trecerea în comandă** | vezi capitolul scris mai jos | — | ÎNCHIS (13.10) |
| 17 | **Ferestre de mansardă** | compartimentele Fakro / Velux pe ofertă, discount pe linie (mod B) | Ionuț: lista de preț completă Fakro cu discounturile lor; Velux — de sunat, de văzut dacă și ce au (17.10) | următorul compartiment, după Bilka |
| 18 | **Offline** | regulile deja decise (08.09) și ce înseamnă ele pe ecran | nimic acum | după punerea în funcțiune |
| 20 | **Tipurile de ofertă** | clasică (acest document) · pazie / lambriu metalic · gard | pazie și gard: amânate fără termen (17.10) | AMÂNAT |
| 21 | **Aflat preț** (consultare rapidă) | ecran separat: căutare produs → caracteristici → prețul contului cu TVA; fără istoric, fără adaos | — | ÎNCHIS (18.09) |
| 22 | **Aviz de marfă** | buton „Generează aviz marfă" din comandă — documentul de livrare, pe modelul detaliatei cu coloana „Primit" | de discutat la final | SCHIȚĂ (13.10) |

---

## Cum lucrăm

Un capitol per mesaj: îmi descrii cum vrei să meargă (cum ai făcut la conturi), eu întorc capitolul scris, tu corectezi, „ok" → ÎNCHIS. Capitolele 3–9 pot merge repede (regulile mari sunt deja decise în catalog); 11, 13 și 14 sunt cele unde merită să stăm.

Începem cu **capitolul 1 — Antetul ofertei**, împreună cu **2 — Clientul**, pentru că sunt mici și le poți descrie într-un singur mesaj.

---

## Capitolul 0 — Principii de design (valabile pentru tot softul) — PROPUS

1. **Aerisit**: spațiu între elemente, un singur lucru important pe ecran, fără aglomerări.
2. **Contrast puternic și lizibilitate extremă**: fundal deschis, text închis, literă mare; cifrele de preț cele mai mari de pe ecran — se lucrează de pe telefon, în soare, în curtea clientului.
3. **Intuitiv**: aceeași ordine de alegere peste tot (model → finisaj → grosime → culoare); butoanele mari, cu verbe („Adaugă accesoriu", „Trimite oferta"); ce nu e posibil nu apare.
4. **Culoarea doar când înseamnă ceva**: asteriscul roșu la sume modificate, avertizările galbene, statusurile — nimic decorativ.
5. **Avertizările la vedere**, în pagină, nu în ferestre mici care se închid.
6. **Mai întâi telefonul**: orice ecran trebuie să fie utilizabil pe telefon cu un deget; pe PC câștigă spațiu, nu funcții noi.
7. **Laptop / PC întâi** (decis 11.09.2026): softul se folosește mai ales de pe laptop și PC; telefonul rămâne pentru urgențe și comoditate, dar orice ecran trebuie să meargă și acolo.
8. **Tastatura**: pe tot softul se trece dintr-o căsuță în alta cu **Tab** și cu **săgețile**; tabelele de cantități se completează fără mouse.
9. Aspectul se validează pe ecrane reale: primul ecran construit de Code se ajustează cu tine, apoi devine tiparul tuturor.
10. **Nicio explicație permanentă în pagină** (decis 19.10.2026, după primele ecrane reale): textele explicative — sub titluri, în formulare, lângă tabele, în etichetele câmpurilor — nu stau la vedere. Fiecare pagină are o singură secțiune **„Ajutor pentru această pagină”**, la final, pliată implicit, desfășurabilă la clic, cu tot conținutul explicativ. În pagină rămân vizibile doar mesajele de validare și avertizările (ex. cod furnizor repetat, „nicio culoare”).

## Capitolul 1 — Antetul ofertei — ÎNCHIS (11.09.2026)

**Pe PDF (antet):**
- **Sigla firmei** (dacă există) și **datele firmei** contului care face oferta: denumire, CUI, nr. Reg. Com., adresă, telefon, e-mail.
- **Datele agentului**: nume, telefon, e-mail.
- **Datele clientului**: nume, adresă, telefon.
- **Titlu**: „Deviz ofertă" (sau formulare asemănătoare, de ales).
- **Numărul ofertei**: `SERIE-NUMĂR / DATA` (ex. `IB-0147 / 11.09.2026`). Seria = 2–3 litere care identifică agentul, setată la crearea contului (fișa CONTURI se completează cu acest câmp); numerotarea e continuă pe serie, **fără reluare anuală**.
- **Valabilitatea**: **eliminată deocamdată** (13.10.2026) — nu apare pe ofertă, nu există câmp; se revine dacă e nevoie.

**Monedă și TVA (varianta B, decisă 11.09.2026):** liniile sunt **mereu în euro, fără TVA**, pentru orice client. La totaluri: Total fără TVA · TVA (cota din setări) · Total cu TVA · Total în lei, la cursul înghețat pe ofertă. Documentul e mereu în euro, cu totalurile și în lei (opțiunea „ofertă în lei" din deciziile vechi dispare).
**Principiul calculului:** ținta se introduce ca **totalul cu TVA discutat cu clientul** (sau ca adaos %), iar prezentarea se calculează invers, astfel încât „Total cu TVA" de pe document să fie exact suma discutată, la leu. Cine nu înțelege că liniile sunt fără TVA primește explicația pe loc.

**Pe PDF (subsol):**
- Cursul euro folosit: **cursul BNR al zilei ofertei** (4 zecimale, data cursului) — modificat 23.10.2026; cursul BNR + 1 % rămâne doar la calculul achiziției (11.8).
- **Garanțiile pe categorii** — țiglă metalică, sistem pluvial — luate din tabelul de garanții după finisajul / grosimea produselor de pe ofertă (ex. „Țiglă metalică Grande Mat 0,50 mm: 30 de ani culoare și coroziune · Sistem pluvial colorat: 15 ani culoare / 30 ani coroziune").

**În aplicație** antetul e primul panou al ofertei: firma (fixă, a contului), agentul (fix), clientul (capitolul 2), numărul (dat automat la salvare), data, cursul înghețat.

**Decizii vechi păstrate:** prețurile fixe se introduc în lei sau euro, cu sau fără TVA, și sunt normalizate de soft; tabelul de facturare are prețuri nete, fără discount afișat.

## Capitolul 2 — Clientul — ÎNCHIS (11.09.2026)

- **Câmpuri obligatorii**: nume, telefon, **adresa** (localitatea / adresa lucrării — e adresa cu care se lucrează: livrare, locația pe WhatsApp, gestiune). Opționale: e-mail, observații.
- **Datele de facturare** (când diferă de client: firmă, CUI, adresă de facturare) **nu** se cer la ofertă; se completează după confirmarea comenzii, în tabelul de comenzi (fișa COMENZI).
- **Baza de clienți e comună** tuturor conturilor. La introducerea unui telefon care există deja, softul propune clientul existent (autocompletare); oferta nouă se leagă de același client. Vizibilitatea ofertelor rămâne cea din fișa CONTURI (agentul își vede doar ofertele lui, chiar dacă clientul e comun).
- **Marcaj pentru Admin general**: în lista generală de oferte, ofertele făcute pentru același client (același telefon) primesc un marcaj de culoare / un filtru „clienți cu mai multe oferte". E simplu de făcut; dacă la construcție se dovedește altfel, se renunță.
- **Sursa clientului** se completează pe **ofertă** (nu pe client): listă configurabilă (recomandare montator / constructor — legată de secțiunea de recomandare —, client vechi, reclamă, online, trecere pe la sediu…) + text liber. Scop: feedback despre canalele care aduc clienți.
- **Istoricul clientului**: din fișa clientului se văd toate ofertele lui (în limita vizibilității contului); lista de oferte se poate sorta / filtra după client.

## Capitolul 2b — Lucrarea: oferta inițială și completările — ÎNCHIS (11.09.2026)

- **Lucrarea = oferta inițială**, identificată prin seria și numărul ei (ex. IB-0147).
- **Completarea** = o ofertă ulterioară, cu număr propriu, **legată de oferta inițială** prin seria și numărul acesteia. Motivele pot fi mai multe, chiar cumulate: greșeala agentului, greșeala montatorului, clientul mai vrea ceva după comandă, altele. Se notează motivul (listă + text liber).
- De aceea o completare **poate avea suma de încasat mai mică decât prețul de achiziție** — 0, mai mică sau mai mare, de la caz la caz. Garda „niciodată sub achiziție" **nu se aplică** unei completări marcate ca atare; scăderea de adaos se vede în tabelul de vânzări, pe lucrare.
- **Cine leagă**: agentul (la crearea completării — buton „Completare la IB-0147" din oferta inițială — sau ulterior, dintr-o ofertă existentă) și Administratorul lui. Legătura se poate pune și după comandă.
- Completarea preia clientul, adresa, montatorul și sursa din oferta inițială; are propriul flux de statusuri și propria comandă.
- **Retururi**: din tabelul de comenzi, Gestiunea și Contabilitatea pot calcula un retur de marfă la prețurile din ofertă; returul scade adaosul lucrării și generează o **notă de retur** pentru client (ce s-a calculat, la ce prețuri, ce bani primește înapoi). Detaliile: fișa COMENZI.

## Capitolul 19 — Tabelul de vânzări și comisioanele — ÎNCHIS (11.09.2026; completat 23.10.2026 cu regula colaboratorilor)

**Ce este:** un **ecran de lucru** (nu doar raport), alimentat automat din comenzi, cu sortări și filtre, pe care Administratorul calculează comisioanele. Se construiește odată cu modulul de comenzi (Etapa 5), dar legăturile de date se pun de acum.

**Coloanele (în ordinea ta):** Data · Client · Localitate · Cost achiziție · Preț vânzare · Sursa recomandării · Comision recomandare · achitat / neachitat (recomandare) · Adaos net · Adaos brut — toate preluate automat — apoi **Comision agent** și **achitat / neachitat** (agent).

**Definiții (ale tale, 11.09.2026):**
- **Preț vânzare** = prețul ofertei pentru materiale, **fără zona B**.
- **Cost achiziție** = prețul de achiziție al contului, cel pe care îl vede agentul în zona de țintă.
- **Adaos net** = Preț vânzare − Cost achiziție; **include TVA-ul**.
- **Adaos brut** = Adaos net ÷ (1 + cota TVA) — marja reală fără TVA (citirea A, confirmată 11.09.2026).
- **Comisionul agentului** îl scrie **Administratorul manual** în tabel, pe fiecare rând; agentul îl vede, împreună cu statusul achitat / neachitat.

*Exemplu de referință:* vânzare 12.100 lei cu TVA, achiziție 9.680 cu TVA (8.000 fără) → adaos net 2.420, adaos brut 2.000. Consecință: în zona de țintă, achiziția contului se afișează **cu TVA**.

**Lucrări cu completări:** comenzile legate apar **una sub alta**, iar adaosul net și brut se calculează **pe lucrare**, din sumele costurilor de achiziție și ale prețurilor de vânzare ale tuturor comenzilor legate; o completare pe costul nostru sau un retur scad adaosul lucrării, deci și comisionul.

**Filtrare și calcul:** **Data** din prima coloană = data comenzii. Filtrul **încasat / neîncasat** traversează lunile: arată toate vânzările cu statusul ales, ca Administratorul să completeze comisionul exact la lucrările încasate, indiferent din ce lună sunt. Filtre în plus pe lună / an / interval, pe agent, combinat pe mai mulți agenți.

**Retururi:** calculul de retur poate fi generat de **orice cont**, din tabelul de comenzi, la prețurile din ofertă; produce nota de retur pentru client și intră în tabelul de vânzări ca **rând separat, legat de vânzare**, care recalculează adaosul lucrării după produsele returnate. Dacă pentru lucrare comisionul era deja achitat, rândul de retur rămâne **cu minus** și cu statusul neachitat (de regularizat); dacă nu, se recalculează la totalul lucrării.

**Statistici** (pe selecție: lună, an, interval; pe un agent sau combinat pe mai mulți): Total cost achiziție · Total preț vânzare · Total adaos net · Total adaos brut · Total comisioane · Procent de adaos · altele la nevoie.

**Cine vede ce:** agentul își vede **propriul tabel** (fără statistici); Administratorul vede tabelele tuturor agenților lui, statisticile, și combinații între agenți; Admin general tot. Bifele „achitat" (comision agent, comision recomandare) le pune Administratorul — consecvent cu fișa CONTURI.

**Colaboratorii (decis 23.10.2026, pe oferta-model E03):** colaboratorul **nu are tabel de vânzări**. Ce îi vinde firma — adică **achiziția lui** (preț de bază + adaosul lui negociat, la cursul de achiziție) — apare ca **vânzare în tabelul Administratorului** de care aparține: Preț vânzare = achiziția colaboratorului (ce i se facturează), Cost achiziție = **prețul de bază** (catalog, la cursul de achiziție, cu TVA), Adaos net = diferența (= adaosul lui negociat), Adaos brut = net ÷ 1,21. Oferta pe care colaboratorul o face clientului lui (de la achiziția afișată, ca un agent) nu intră în vânzările firmei. Colaboratorul are nevoie în primul rând de prețul lui de achiziție (ecranul „Aflat preț", cap. 21); oferta o construiește doar când are nevoie.

## Capitolul 3 — Învelitoarea și pachetele — ÎNCHIS (11.09.2026)

### 3.1 Selecția
**Furnizor** (azi doar Bilka) → **Tip de învelitoare** (țiglă metalică · învelitori plate — Retro, fălțuită, tablă plană, ca în formularul Bilka · tablă cutată) → **Model** (la Retro / T8 / Britanic modelul generat din variantă + opțiune) → **Finisaj** → **Grosime** → **Culoare**. Fiecare listă e filtrată de alegerea dinainte. Modulul 35 e implicit.

### 3.2 Cantitățile — trei moduri
- **Suprafață directă**: agentul scrie mp-ul (3 zecimale) — calcul generic, aproximativ. Bun pentru ofertă, **nu se poate comanda** așa.
- **Panotaj**: tabel de **lungime × bucăți**, în orice ordine (de regulă descrescător; sortare la cerere); mp = Σ (lungime × bucăți) × lățimea totală; numărul de coli = Σ bucăți; valoarea = mp × preț / mp. Totul calculat la vedere.
- **Combinată**: pe aceeași învelitoare, o parte în mp (ex. corpul principal, generic) și o parte panotată (ex. garajul în două ape, panotat din minte); cele două se adună.
- **Regulă la comandă**: o ofertă poate trece în „Comandat" doar când **fiecare învelitoare e integral în lungimi × bucăți** — formularul Bilka nu primește mp. Softul avertizează și blochează până la completare.
- Ruperea colilor o decide omul; softul nu împarte și nu adaugă suprapuneri (cei 15 cm rămân pentru panotaj). Lungimea maximă (≈ 14 m, transport) e în grija agentului, fără avertizare.
- Avertizare la dripstop T18 / T35 / T45 sub 40 mp, per învelitoare.
- Tabla plană la mp: lungime × bucăți, lățime 1,25 m.

### 3.3 Mai multe învelitori
Butonul **„Adaugă învelitoare"**: a doua, a treia (ex. țiglă + Retro pe garaj + tablă plană la lungimi atipice). Fiecare cu selecția și cantitățile ei. Prima e **principală**, celelalte **secundare** (ordinea contează la export).

### 3.4 Pachetele — ce ține de o învelitoare
- **Legate direct de învelitoare** (moștenesc finisajul, grosimea și culoarea ei): **accesoriile de tinichigerie** (standard și speciale de 2 m) și **fixarea și etanșarea** (auxiliarele Bilka: holțșuruburi, folii, benzi…). Rubricile iau implicit caracteristicile **învelitorii principale**; pentru o învelitoare secundară cu alte caracteristici există butonul **„Adaugă accesorii pentru învelitoarea secundară"** (la standard, la speciale și la fixare) — decis 14.09.2026.
- **Independente** (își aleg finisajul, grosimea, culoarea): accesoriile speciale la lungimi, sistemul pluvial (cu buton „Adaugă sistem pluvial" pentru a doua culoare), șipca de gard, zona B, ferestrele, produsele din Stoc.
- Un **pachet** = o învelitoare + secțiunile ei cu conținut. Reguli: a doua învelitoare cu **aceeași culoare** (finisaj, grosime, culoare) rămâne în același pachet; a doua învelitoare cu alte caracteristici, dar **fără accesorii sau auxiliare proprii**, rămâne tot în același pachet; a doua învelitoare cu alte caracteristici **și** cu accesorii / auxiliare proprii → **pachet separat**.

### 3.5 Exportul în formularul Bilka — limitările devin reguli
Formularul Bilka acceptă: o învelitoare principală, o învelitoare secundară, șipcă de gard; **auxiliarele și tinichigeria iau automat culoarea învelitorii principale** (deci nu se pot adăuga produse în altă culoare / grosime); la pluvial, **o singură culoare pe finisaj** (nu două culori de lucios 125/90). De aceea:
1. Softul generează **un formular per pachet**: învelitoarea pachetului ca principală, accesoriile și auxiliarele ei, iar o învelitoare fără accesorii proprii poate intra ca secundară pe formularul altui pachet.
2. **Pluvialul**: un formular per (finisaj + culoare); două culori de lucios → două formulare.
3. Accesoriile speciale la lungimi au foaia lor cu culoare pe rând; șipca are blocul ei; zona B, ferestrele, Stocul nu intră în formular.
4. **Agentul nu decide nimic**: împachetarea și numărul de formulare le stabilește softul, după regulile de mai sus; el vede doar „se vor genera 2 formulare" și de ce.
5. Legătura de nume: rubrica din soft **„Fixare și etanșare"** = lista Bilka „Auxiliare" — softul păstrează corespondența, ca să se știe de unde vin produsele.

### 3.6 Rotunjiri
Suprafața la **3 zecimale** (ca la facturarea Bilka și în formular); prețurile și orice altă valoare la **2 zecimale**; cursul BNR la **4 zecimale**.

### 3.7 Ce apare pe documente (detaliat în capitolul 13)
- **PDF ofertă**: fiecare învelitoare pe rândul ei, doar cu suprafața (model, finisaj, grosime, culoare, mp, preț / mp, valoare); categoriile în ordinea clasică.
- **PDF ofertă detaliată**: în plus panotajul (lungimi × bucăți) și alte informații — de detaliat mai târziu.
- **PDF rezumat**: fără cantități pe produse; suprafața fiecărei învelitori, pe fiecare categorie tipurile de produse incluse și numărul total de piese (ex. „Sistem pluvial: cârlig, racord, cot, colier burlan — 65 piese"), totalul general. Pentru clienții care ar folosi devizul ca să negocieze în altă parte.

### 3.8 Secțiuni fără învelitoare (decis 11.09.2026)
- O secțiune de **tinichigerie** sau de **fixare și etanșare** are o **cheie de culoare** (finisaj + grosime + culoare): **moștenită** de la învelitoarea de care e legată, sau **aleasă direct** când secțiunea e de sine stătătoare (comandă doar de accesorii sau doar de holțșuruburi, completări).
- Accesoriile legate de o învelitoare moștenesc **strict** cheia ei; pentru altă culoare se adaugă o secțiune de sine stătătoare cu cheia dorită.
- La export, o secțiune de sine stătătoare devine un **formular fără învelitoare**, în care se selectează doar finisajul, grosimea și culoarea — exact cum se completează azi formularul pentru comenzi de accesorii. Regula de împachetare rămâne: un formular per cheie de culoare.

## Ordinea rubricilor pe ofertă (decisă 14.09.2026, completată 19.10.2026)
Învelitori → Accesorii standard (tinichigerie) → Accesorii speciale 2 ML → Fixare și etanșare → Sistem pluvial → Șipcă gard → Accesorii speciale la lungimi (ML) → Ferestre → Zona B. Aceeași ordine pe ecranul de ofertă, pe documente și în tabelul categoriilor de ofertă din catalog. (Produsele din Stoc intră în rubrica lor, nu au rubrică proprie.)

## Capitolul 4 — Accesorii standard — ÎNCHIS (listele lui Ionuț, 14.09.2026)

- Rubrica arată **direct** doar accesoriile recomandate pentru categoria învelitorii, în ordinea de mai jos; toate celelalte sunt sub **„+ Adaugă accesoriu"**. Pe rând: denumire, unitate, **cantitate manuală**; fără calcule. Listele stau în `docs/import/bilka/liste-implicite-oferta.csv` (configurare, modificabilă de Admin general).
- **Țiglă metalică (fără Romanic)**: coamă mică · bordură fronton 312 · colector fronton 156 · bordură streașină 208 · bordură la perete 208 · dolie 417 · opritor zăpadă 2 m · opritor omega · set coș fum · tablă plană coală 2,5 mp.
- **Romanic**: coamă mică · coamă mare · bordură fronton 360 · colector fronton 250 · bordură streașină 250 · bordură la perete 250 · dolie 625 · opritor zăpadă 2 m · opritor omega · set coș fum · tablă plană coală 2,5 mp.
- **Învelitori plate** (Retro Plus, Retro Panel, Retro Duo, fălțuită): toate accesoriile din lista PDF specifică (coamă Retro, semicoamă, suport coamă, fronton, dolii 417 / 625, borduri streașină 312 / 250, borduri perete laterală / orizontală, ruperea pantei concavă / convexă, elemente de suprapunere 60 / 80, opritor tip bară, piesă conectoare, set coș fum Retro).
- **Tablă cutată**: coamă mică · coamă unghiulară 312 · bordură fronton 312 · colector fronton 156 · bordură streașină 208 · bordură la perete 208 · dolie 417 · opritor zăpadă 2 m · opritor omega · set coș fum · tablă plană coală 2,5 mp.
- Rubrica ia caracteristicile **învelitorii principale**; butonul „Adaugă accesorii pentru învelitoarea secundară" deschide o rubrică cu cheia celei secundare.

## Capitolul 5 — Accesorii speciale — ÎNCHIS (14.09.2026)

- **2 ML (la bucată)**: rubrica vine imediat sub tinichigeria standard și **preia caracteristicile învelitorii principale** (butonul pentru învelitoarea secundară, ca la standard). Apar implicit **6 rânduri** presetate pe **D01**; clic pe treaptă deschide lista cu toate treptele D01–D25, fiecare cu intervalul ei de desfășurată (D01 1–50 mm · D02 51–100 mm · … · D25 1201–1250 mm, pas de 50 mm) — lista lui Ionuț din 16.10.2026, în `docs/import/bilka/trepte-desfasurata.csv`; agentul vede încadrarea și alege treapta. Peste 6 tipuri: **„+ Adaugă accesoriu special"**. Pe rând: treapta, cantitate în bucăți, schiță / poză atașabilă.
- **La lungimi (la ml)**: rubrică independentă, fără rânduri presetate; pe fiecare rând se aleg manual **treapta D, finisajul, grosimea și culoarea**; cantitate = lungime × bucăți → ml; schiță / poză atașabilă.
- Fără calcule automate în ambele rubrici.

## Capitolul 6 — Sistem pluvial — ÎNCHIS (14.09.2026)

- Presetat pe furnizorul Bilka (alții mai târziu) și pe sistemul **125 / 90**; se aleg finisajul și culoarea; clic pe „125 / 90" deschide lista pentru **150 / 100**. Denumirile produselor preiau automat dimensiunea sistemului (125 sau 150).
- Apar direct: jgheab 4 m · 3 m · 2 m · burlan 3 m · cârlig 210 mm · cârlig combi · colier burlan · capac jgheab · element îmbinare jgheab · racord jgheab – burlan · cot 60° · prelungitor intermediar 1 m · colțar exterior 90° · colțar interior 90° · cot de evacuare. Restul sub „+".
- **„+ Adaugă sistem pluvial"** pentru altă variantă (altă culoare sau alt sistem); la export, un formular de pluvial per (finisaj + culoare). Cantități manuale, fără calcul.

## Capitolul 7 — Fixare și etanșare — ÎNCHIS (14.09.2026)

- Apar direct: **holțșuruburile — toate cele 12 categorii din formular** (lemn în culoare 70 / 55 / 35 / 20, lemn zincate 70 / 55 / 35 / 20, metal în culoare 19 / 35, metal zincate 19 / 35) · spray retuș (spray corector 400 ml) · corector colorat · **capac coamă** · bandă etanșare universală · bandă bituminoasă 15 cm × 10 m · mastic etanșare premium · pieptene streașină · bandă aerisire streașină · folie anticondens 120 g 75 mp · folie anticondens 120 g 30 mp. Restul sub „+".
- **Preiau culoarea învelitorii principale**: holțșuruburile în culoare, spray-ul de retuș, corectorul, capacul de coamă. Restul nu au culoare de învelitoare (cele cu culori proprii le au din catalog).
- **Capacul de coamă** stă în listele Bilka la tinichigerie, dar pe ofertă intră la Fixare și etanșare (regulă de rubrică, în catalog: `categorie_oferta`).
- Butonul „Adaugă fixare pentru învelitoarea secundară" — ca la accesorii. Unități: cutii, role, bucăți; cantități manuale.

## Capitolul 8 — Șipca de gard — ÎNCHIS (14.09.2026)

Rubrică proprie pe ofertă. **Produsul** = profilul (Haga, Oslo, Berna, Sofia) × tipul de capăt (drept / rotund) — **8 modele**, apoi finisaj → grosime → culoare din cascadă. Lățimea șipcii vine din catalog (Haga 111,3 · Oslo 92,9 · Berna 105 · Sofia 106 mm).

**Varianta Comandă**: după selecție, poziții de **lungime × bucăți** — 5 presetate, „+ Adaugă poziție". ml = Σ lungime × bucăți.

**Varianta Calcul**: după selecție, pe fiecare tronson: **lungimea șipcii** (înălțimea gardului), **lungimea tronsonului** în metri liniari și, alături, **distanța dintre șipci** în mm (cea dorită de client). Softul calculează: bucăți = tronson ÷ (lățimea șipcii + distanța), rotunjit în sus; ml = bucăți × lungimea șipcii. Rezultatul apare pe loc.

**Pe ofertă**, în ambele variante: produsul, metrii liniari, prețul.

**Export**: formularul Bilka acceptă **un singur model de șipcă** (profil + tip de capăt) pe comandă. O rubrică de șipcă = un model; pentru al doilea model pe aceeași ofertă: **„+ Adaugă rubrică șipcă"** → formular separat la export (ca la pluvialul în două culori). La Calcul, tronsoanele sunt poziții: 5 presetate + „Adaugă poziție".

## Capitolul 9 — Zona B — ÎNCHIS (14.09.2026)

- **Fără linii predefinite, nimic precompletat** (precizat 27.10.2026). De regulă: șipcă de lemn, manoperă, șuruburi de lemn — dar poate fi orice. Agentul scrie, pe fiecare linie, la liber: **denumirea**, **unitatea de măsură** (ml, mp, buc, lucrare…), **cantitatea** și **suma totală** a liniei; în tabelul de facturare linia apare cu UM, cantitate și preț unitar = sumă ÷ cantitate (4 zecimale).
- Suma se introduce **în lei**, cu bifa **„conține TVA"** (în unele cazuri conține) — opțiunile „conține TVA" și „preia în factură" sunt **separate, pe fiecare linie** în parte. Exemplu: `docs/ETALON.md` E07.
- Pe ofertă, zona B apare ca **un tabel simplu, separat** de restul ofertei — de tip **„Supliment la ofertă"** — cu sumele **așa cum au fost scrise, în lei**.
- **Bifa „preia în factură"** pe fiecare linie: doar liniile bifate intră în tabelul de facturare (și în sarcina voastră); acestea se afișează **convertite în euro la cursul ofertei**. Restul rămân informație pentru client.
- **Manopera** se dă de regulă prin montatorul vostru (colaborator, nu angajat); apare pe ofertă ca informație pentru client; în anumite cazuri o facturați voi — atunci se bifează.
- **Fără text legal predefinit**: câmp liber de precizări la zona B (ex. „Manoperă montaj — prin terț colaborator", cu lămurirea de rigoare, scrisă de agent).
- **Nimic din zona B nu intră în tabelul de vânzări**, nici liniile preluate în factură.

## Capitolul 10 — Stoc și alți furnizori pe ofertă — ÎNCHIS (14.09.2026)
Produsele din compartimentul Stoc sau de la un alt furnizor (Novatik etc.) apar în aceleași rubrici ale ofertei ca cele Bilka; prețul lor de bază în lei se convertește în euro la cursul ofertei; regulile de preț (adaosul contului, ținta, prezentarea, garda) sunt identice. La export, ele nu intră în formularul Bilka.

## Capitolul 11 — Prețurile — ÎNCHIS (18.09.2026)

### 11.1 Cum ajunge o ofertă la preț (drumul real)
Solicitarea vine pe orice canal (client direct, constructor, montator, teren). Agentul măsoară sau primește o schiță / un necesar, completează produsele, apoi **discută prețul verbal** cu clientul — de regulă totalul cu TVA sau prețul pe mp. În scris, clientul primește: **oferta** (suprafețe, categorii, prețuri), **rezumatul** (fără cantități, când nu vrem să dăm necesarul „mură în gură") sau o **întâlnire** în care i se prezintă fiecare produs; **oferta detaliată** (cu lungimi și bucăți) o primește **la acceptare și după avans**, ca să poată verifica marfa la recepție. Softul trebuie să susțină fiecare din aceste drumuri fără ca agentul să refacă nimic.

### 11.2 Cele trei straturi de preț (ce vede agentul)
1. **Achiziția contului** — prețul de bază din catalog + adaosul % al contului (setat de Administrator), **rotunjit la 2 zecimale în euro** (decis 23.10.2026), convertit la **cursul de achiziție (BNR + 1 %)**, **afișat cu TVA** în zona de țintă. Agentul nu vede niciodată prețul de bază, nici procentul.
2. **Ținta** — agentul introduce **fie** adaosul țintă %, **fie** totalul cu TVA discutat cu clientul; softul calculează restul. Vede pe loc: total achiziție, total țintă, **marja rămasă** (țintă − achiziție), procentul rezultat. **Adaosul și marja se calculează în lei** (achiziția la cursul de achiziție, ținta așa cum e discutată) — lei-ul e banul real; euro-ul de pe document e prezentare (decis 23.10.2026). Adaosul țintă implicit propus: 20 % (Ionuț: „ideal 20–25 %, după context").
3. **Prezentarea** — cum apar prețurile pe document, în unul din trei moduri (11.4). Principiu: **„Total cu TVA" de pe document = suma discutată, la leu**; softul repartizează rotunjirile astfel încât totalul să iasă exact.

### 11.3 „Grupa" — adaosul discret (nou, 18.09.2026)
Situația „prietenească": agentul are o relație specială cu clientul sau constructorul și îi arată „cât costă la fabrică" — adică achiziția din zona de țintă. Ca să poată totuși pune un adaos fără ca relația să pară altfel: **înainte de zona de învelitori, o căsuță discretă, „Grupă"**, în care agentul scrie un număr (ex. 5) = procentul adăugat **artificial** la achiziția afișată în zona de țintă. Goală = nimic în plus, formula rămâne bază + adaosul contului. Nu apare nicăieri pe documente. **În tabelul de vânzări costul de achiziție e cel real** (fără grupă); grupa e parte din adaos. Oferta prietenească înseamnă „la achiziție + puțin, pentru logistică" — niciodată sub. **Precizare (Ionuț, 23.10.2026):** grupa e un instrument **al agentului**, ascuns doar față de client: el o scrie cât consideră, în zona de țintă vede achiziția + grupa (10.000 → 10.500 lei), se tocmește peste ea (ținta 10.800), iar după acord poate șterge grupa și vede achiziția reală; în tabelul lui de vânzări apar costul real și prețul de vânzare, deci adaosul real — pe care se calculează și comisionul lui. Exemplu: `docs/ETALON.md` E05.

### 11.4 Cele trei moduri de prezentare
- **Simplu**: prețurile de pe document sunt prețurile țintă pe linie; fără discount afișat.
- **Listă + discount general**: pe document apar **prețuri de listă** (ancoră) și **un discount general la total**; agentul alege discountul de afișat (ex. 10 %) și softul calculează invers prețurile de listă astfel încât totalul după discount = ținta. Nu există un preț de listă fix, cu adaos standard — e mereu calculat invers.
- **Discount per linie**: discountul se afișează pe fiecare linie; **excepțiile** înseamnă un discount specific pe fiecare produs dorit (agentul îl pune pe produs); prețurile fixe (11.5) rămân cum au fost scrise; calcul invers către țintă.
Modul se alege pe ofertă și se poate schimba oricând cât e „În lucru".

### 11.5 Prețuri fixe
Pe orice linie, agentul poate fixa prețul negociat pentru acel produs: introdus **în lei sau euro, cu sau fără TVA**, **sau ca „achiziție + x %"** (butonul de pe linie; decis 23.10.2026 — cazul tipic: țigla la cel mult achiziție + 5 %, pentru că acolo clientul compară lei / mp, iar restul liniilor poartă adaosul); softul îl normalizează (euro, fără TVA, la cursul documentului). Linia fixă iese din calculul discountului și rămâne așa cum a fost scrisă; restul liniilor absorb diferența până la țintă. Exemplu: `docs/ETALON.md` E02.

### 11.6 Garda: niciodată sub achiziție
Nicio linie și niciun total nu pot fi salvate **sub achiziția reală a contului** (fără grupă); prezentarea poate fi egală cu achiziția, nu mai jos, fără excepție. Singura excepție rămâne **completarea marcată** (capitolul 2b), care poate fi la 0. La ferestre (mod B) garda e aceeași: discountul acordat nu poate depăși achiziția.

### 11.7 Variante de preț
Din orice ofertă, **„Creează variantă"**: aceeași ofertă, **același număr**, cu alt model / finisaj / grosime sau alte produse și prețuri, care **păstrează adaosul % al variantei de bază** aplicat pe noile prețuri de achiziție și se recalculează automat. Variantele sunt **versiuni în istoricul ofertei**, nu oferte separate: fiecare se poate tipări (IB-0147, varianta 2), iar cea acceptată devine cea curentă.

### 11.8 Curs și TVA (modificat 23.10.2026)
**Două cursuri, amândouă înghețate pe ofertă la creare**, reîmprospătabile manual cât e „În lucru"; offline se folosește ultimul curs preluat:
- **cursul documentului = cursul BNR al zilei** (4 zecimale): la el se convertesc în euro prețurile de pe document și la el se afișează „Total în lei" și subsolul „Curs EURO";
- **cursul de achiziție = BNR × 1,01** (4 zecimale): la el se calculează achiziția contului (ca la facturarea Bilka, verificată pe 21 de facturi: `docs/VERIFICARE-FACTURI-BILKA.md`).
Cursul BNR se preia automat zilnic din sursa oficială BNR (nbrfxrates.xml), cu cursbnr.ro ca sursă de rezervă; BNR publică la 13:00 — până atunci cursul zilei e cel din ziua precedentă, exact ca în practica Bilka. **Totalul în lei de pe document**: când ținta e o **sumă în lei** și liniile ating exact totalul în euro, totalul în lei = suma discutată, **exact** (euro-ul e derivat; produsul total EUR × curs poate diferi de ea cu 1–3 bani din rotunjirea la 2 zecimale — acceptat; tabelul de facturare, în lei cu prețuri unitare la 4 zecimale, reproduce exact totalul); când restul de rotunjire nu se poate repartiza pe linii (oferte mici, `docs/ETALON.md` R5 / E06), totalul în lei e **cel calculat din linii**, iar agentul e avertizat că ținta nu se poate atinge exact (decis 23.10.2026: „o rotunjire care nu se poate matematic nu ajută"); când ținta e un **adaos %**, totalul în lei e cât iese, cu bani. TVA-ul e o setare generală, aplicată la totaluri (linii fără TVA — varianta B). La ferestre, discountul se dă pe linie, cu achiziția și ținta afișate separat.

### 11.9 Ecranul de preț (propunere de aranjare)
Sus: **Grupă** (discret) · cursul · modul de prezentare · **„Preia prețuri din oferta …"** (11.11). Tabelul de produse cu cantitățile. Zona de **țintă**: pe linie achiziția cu TVA, ținta pe linie; jos câmpurile „adaos %" / „total cu TVA" și marja rămasă. Zona de **prezentare**: prețurile așa cum vor apărea pe document, discountul afișat, prețurile fixe marcate. Totaluri: fără TVA · TVA · cu TVA · lei.

### 11.10 „Mod client" — respins (18.09.2026)
Nu se face: agentul arată clientului PDF-ul ofertei pe tabletă; un ecran în plus ar complica experiența fără folos.

### 11.11 „Preia prețuri din oferta …" (decis 18.09.2026)
Cazul frecvent: două-trei măsurători la vecini sau rude care „fac împreună", cu oferte separate — produsele similare trebuie să aibă **aceleași prețuri**, deși necesarul și totalul diferă. În zona de țintă: câmpul **„Preia prețuri din oferta IB-0147"**.
- Pentru produsele **comune**, softul copiază prețul unitar de prezentare (cu modul de prezentare, discountul afișat și prețurile fixe ale sursei).
- Pentru produsele **care nu coincid**, aplică **adaosul procentual al categoriei** în care se află produsul, așa cum rezultă din oferta-sursă.
- Oferta care preia **nu mai are câmp de țintă**: merge pe logica de țintă a ofertei din care preia; totalul rezultă din cantitățile ei. Agentul poate renunța la preluare, caz în care ținta redevine editabilă.
- Se poate prelua din orice ofertă pe care contul o poate vedea (agentul din ale lui, Administratorul din ale tuturor).

## Capitolul 21 — Aflat preț (consultare rapidă) — ÎNCHIS (18.09.2026)

- Ecran separat, lângă „Ofertă nouă": o **căsuță de căutare**; agentul scrie un cuvânt (clasic, adriatic, fronton, folie, folie 120) și apare lista produselor potrivite **de la toți furnizorii** (folie → toate foliile; folie 120 → toate de 120 g; fronton → toate frontoanele, cu desfășuratele lor).
- După alegere, se selectează caracteristicile posibile ale produsului (tip unde e cazul → finisaj → grosime…), iar softul arată **prețul contului cu TVA** (bază + adaosul % al agentului, la cursul zilei), pe unitatea produsului (mp, buc, ml, cutie, rolă).
- **Fără istoric**: nu se memorează nimic; e doar pentru întrebările punctuale de la telefon, care altfel iau timp.
- Fără câmp de adaos: agentul transmite cât simte el; aici contează doar să știe achiziția, pe care nu o arată nimănui.

## Capitolul 12 — Montatorul și recomandarea — ÎNCHIS (18.09.2026)

- **Lista de montatori și constructori**: fiecare agent și-o populează singur; o vede el și oricare dintre Administratori. O persoană are **nume și telefon obligatorii**, localitatea opțională, tipul (montator / constructor). Autocompletare la ofertă.
- **Recomandarea pe ofertă**: persoana care a recomandat (din listă sau nouă) și **comisionul, ca sumă fixă** — indiferent cum o calculează agentul sau Administratorul. Se poate completa **oricând** (la ofertă, la acceptare, la comandă). **Cine recomandă ia comisionul**; în situații compuse se notează comisionul total, iar împărțirea o fac agentul sau Administratorul între ei. Rostul notării: să nu se uite plata și să intre în calculul comisionului agentului.
- Comisionul se modifică de cine a făcut oferta și de Administratorul lui, cu **asterisc roșu și istoric**; **„achitat"** îl bifează doar Administratorul; Gestiunea vede sumele (adesea plătește ea). În tabelul de vânzări: „de unde e recomandarea", „comision recomandare", „achitat / neachitat".
- **Sursa clientului** (capitolul 2) e **statistică** — canalul pe care a venit clientul — și **nu se leagă** de comision sau de montator.
- Montatorul rămâne **strict intern**: nimic pe PDF-ul de ofertă.

## Capitolul 13 — Documentele — ÎNCHIS (13.10.2026; machete în `docs/design/`)

Referințe: oferta Novatik (tipologie de conținut: blocuri pe categorii, garanții, mențiuni, total general curat), factura și NIR-ul din Saga (densitate și disciplină de tabel: 25–26 de rânduri pe pagină, coloane aliniate, cantități cu 3 zecimale). Formularul Bilka: contraexemplu.

### 13.1 Principii de așezare în pagină (toate documentele)
- **A4 portret**, margini generoase (≈ 15 mm), literă de 10 pt în tabele și 11 pt în text, titluri 13–14 pt; cifrele aliniate la dreapta, cu separator de mii.
- **Densitate ca la Saga, aer ca la Novatik**: rânduri de tabel de ≈ 6 mm (25–28 de rânduri pe pagină), fără chenare grele — linii subțiri orizontale, capul de tabel pe fond deschis, categoriile ca benzi discrete, un singur accent de culoare (sigla).
- Documentul e **imaginea firmei**: clar, aerisit, ușor de citit; datele necesare, nimic decorativ, nimic obositor.
- **Documentul are una sau mai multe pagini**, după numărul de produse (decis 13.10.2026): capul de tabel se repetă pe fiecare pagină, o bandă de categorie nu rămâne singură la capăt de pagină, blocul de totaluri nu se rupe între pagini. Pe fiecare pagină, jos: firma · documentul · numărul · clientul · „Pagina x din y".
- **Suplimentul la ofertă e o anexă**: începe mereu pe o pagină nouă, după ultima pagină a ofertei sau a rezumatului, și se numerotează în continuare (ofertă pe 2 pagini + supliment = „Pagina 3 din 3"); există doar dacă sunt completate suplimente. Demonstrație: `docs/design/macheta-oferta-multipagina.pdf` (ofertă lungă de test, 68 de linii: 3 pagini + anexa).

### 13.2 PDF-ul de OFERTĂ (documentul principal)
**Antet** (capitolul 1): siglă; firma (denumire, CUI, J, adresă, telefon, e-mail); agentul (nume, telefon, e-mail); clientul (nume, adresă, telefon); titlul „Deviz ofertă"; **SERIE-NR / DATA**; „valabilă 15 zile".
**Corp**, în ordinea clasică a categoriilor: Învelitori · Accesorii de tinichigerie standard · Accesorii speciale · Fixare și etanșare · Sistem pluvial · Șipcă gard · (Ferestre) · Alte produse și servicii (liniile din zona B bifate „preia în factură", în euro).
Coloanele, după modul de prezentare:
- *simplu*: Nr · Denumire (produs, finisaj, grosime, culoare) · UM · Cantitate · Preț unitar (EUR, fără TVA) · Valoare
- *listă + discount general*: aceleași, cu „Preț listă"; discountul apare o singură dată, la totaluri
- *discount per linie*: Nr · Denumire · UM · Cantitate · Preț listă · Discount % · Preț net · Valoare
Învelitorile: o linie per învelitoare (model, finisaj, grosime, culoare), **doar suprafața** (mp, 3 zecimale), preț / mp, valoare — fără lungimi. Fiecare categorie cu subtotal discret.
**Supliment la ofertă** (zona B nebifată): pe **pagină separată**, sumele în lei așa cum au fost scrise; **pagina există doar dacă sunt completate suplimente** — fără linii în zona B, documentul are o singură pagină (decis 13.10.2026, valabil pentru ofertă și rezumat); conținutul și mențiunile paginii se stabilesc după consultarea expertului fiscal.
**Totaluri**: Total fără TVA (EUR) · [Discount general] · TVA (cota) · **Total cu TVA (EUR)** · **Total în lei** la cursul documentului (1 EUR = x,xxxx lei, BNR, data) — regula totalului în lei: 11.8.
**Subsol** — două rânduri (decis 13.10.2026): „**Garanții:** învelitoare X ani culoare și coroziune; sistem pluvial X ani culoare, Y ani coroziune" — informația **completă**, compusă automat din tabelul de garanții (`garantii-finisaj-grosime.csv`, coloane separate pentru culoare și coroziune) după finisajul și grosimea fiecărui produs de pe ofertă, pe categorii; și „**Curs EURO – 5,2446**" (cursul BNR din ziua ofertei, 4 zecimale). Nimic despre TVA, monedă sau valabilitate. Fără semnătură, fără ștampilă. Precizările libere ale agentului, doar dacă există.

### 13.3 PDF-ul de OFERTĂ DETALIATĂ (machetă din 13.10.2026: `docs/design/macheta-oferta-detaliata.pdf`)
Se dă **la acceptare și după avans**, pentru verificarea mărfii la recepție. Identic cu oferta, plus:
- sub fiecare învelitoare, **tabelul de panotaj**: fiecare lungime × bucăți cu mp-ul ei, apoi totalul de coli, lățimea totală și mp-ul învelitorii;
- o coloană **„Primit"** cu o căsuță goală pe fiecare linie de produs și pe fiecare lungime de panotaj, de bifat la descărcare (aprobat 13.10 — „un fel de aviz, practic");
- fără coduri; subsol ca la ofertă, cu o linie în plus: „Coloana «Primit»: de bifat la recepția mărfii."
Documentul e mai lung decât oferta, deci curge firesc pe mai multe pagini; suplimentul rămâne anexă.

### 13.4 PDF-ul REZUMAT (machetă din 13.10.2026: `docs/design/macheta-rezumat.pdf`)
Pentru clienții care ar folosi necesarul la negocieri în altă parte. **Aceeași pagină ca oferta** (antet, client / agent, totaluri, subsol, supliment pe pagina 2), dar conținutul structurat **pe blocuri numerotate, ca în modelul Novatik**:
- o frază de introducere („Vă prezentăm pe scurt materialele cuprinse în oferta noastră:");
- **1. Învelitoare** — model · finisaj · grosime · culoare pe bandă; dedesubt: **Suprafața** (mp, 3 zecimale) și **Garanția** (completă: ani culoare și coroziune);
- câte un bloc pentru fiecare categorie din ofertă (tinichigerie, fixare și etanșare, pluvial, șipcă…), cu caracteristicile categoriei pe bandă; dedesubt: **Cuprinde** = enumerarea tipurilor de produse (numele de familie din catalog, fără dimensiuni și fără cantități pe produs: „coamă mică, bordură fronton, colector fronton…"), **Total** = numărul de piese al categoriei („92 piese"; „16 articole (cutii, role, bucăți)" unde unitățile diferă) și **Garanția** categoriei, când are;
- **fără valori pe categorii, fără preț / mp**; totalurile generale ca pe ofertă (fără TVA · TVA · cu TVA · lei);
- subsol: „Oferta detaliată, cu cantitățile pe fiecare produs, se predă la confirmarea comenzii." (propunere) și „Curs EURO – …"; garanțiile stau în blocuri, nu se repetă în subsol.

### 13.5 TABELUL DE FACTURARE (machetă din 13.10.2026: `docs/design/macheta-tabel-facturare.pdf`)
Document **intern**, pentru Contabilitate, cât mai simplu: antetul ofertei + o linie care spune că e intern, în lei, la cursul ofertei, cu datele de facturare ale clientului (sau cele din comandă, dacă diferă); tabelul: Nr · Denumire · UM · Cantitate (3 zecimale) · Preț unitar în lei (4 zecimale, net, fără discount afișat) · Valoare (lei) · TVA (lei); totaluri: fără TVA · TVA · **Total de facturat**, în lei. Doar liniile facturabile: materialele + liniile din zona B bifate „preia în factură". Fără pagină de supliment.
*Rotunjiri:* conversia pe linie (cum cer Saga și FGO) poate da o diferență de câțiva bani față de „Total în lei" de pe ofertă (pe machetă: 21.799,55 față de 21.799,54); **se acceptă ca atare** (practica obișnuită) — se schimbă doar dacă Ionuț cere altfel. Denumirile: cele din soft; o „denumire de facturare" separată per produs (forma din Saga) nu e necesară dacă factura se emite prin FGO din aceste date.

### 13.6 Trimiterea și păstrarea
Fiecare document se generează la cerere, cu **versiune** (data, ora, varianta ofertei), și rămâne atașat ofertei; se trimite pe WhatsApp / e-mail direct din soft sau se printează. Ce s-a trimis clientului se vede în istoricul ofertei.

### 13.7 Drumul spre grafică (două variante)
1. **Machetă rapidă, aici**: construiesc eu, din aceste specificații, o pagină de ofertă cu date reale de test (HTML, arată ca PDF-ul final, se poate deschide și printa); reacționezi pe ea — mai aerisit, mai mare, altă ordine — două-trei runde, apoi ea devine șablonul pe care îl implementează Code la S15. Rapid și fără nimic de instalat.
2. **Claude Design**: îți scriu briefingul (aceste specificații + principiile), tu iterezi vizual acolo, exporți PDF-ul și pachetul pentru Code.
Recomandarea mea: 1 pentru conținut și structură (decidem repede), 2 doar dacă vrei rafinament grafic peste ce iese.

### 13.8 Decizii (18.09.2026) și ce mai e de lămurit
Decise: A4 portret, densitate și lizibilitate ca factura din Saga; **siglele furnizorilor** cuprinși în ofertă (ex. Bilka, Fakro) apar pe document, lângă sigla firmei; **fără coduri** de produs pe niciun document; **fără semnătură și ștampilă** nicăieri; rezumatul = structura de pagină a ofertei + conținut structurat ca la Novatik; tabelul de facturare = cât mai simplu, doar pentru a extrage rapid cantitățile și prețurile; **FGO** de analizat pentru emiterea automată a facturilor (vezi 13.9); macheta se face în chat (varianta 1): `docs/design/macheta-generator.py` produce, din aceleași date de test, `macheta-oferta` și `macheta-rezumat` (.html = sursa, .pdf = referința vizuală; PDF-ul îl generează serverul cu același motor, identic pe orice aparat); CSS-ul din generator e referința grafică pentru șabloanele din soft (S15). Oferta: subtotalurile pe banda categoriei, ≈ 28 de linii pe pagină, suplimentul pe pagina 2, subsol de două rânduri.
Lămurite: mențiunea de plată nu mai există (doar „Curs EURO – …"); rezumatul doar cu totalul general; coloana „Primit" pe detaliată; rotunjirea la facturare (13.5). Machetele celor patru documente, aprobate 13.10.2026, sunt referința pentru S15.

### 13.9 Facturarea automată prin FGO (de analizat, notat 18.09.2026)
FGO are un API public, cu mediu de test separat de producție: facturile se emit cu un apel către `/factura/emitere`, care primește seria, moneda, tipul facturii, data, clientul (denumire, țară, județ, tip PF / PJ) și conținutul — linii cu denumire, număr de produse, unitate de măsură, cota TVA și prețul unitar. Există și metode de încasare, print, anulare, stornare. Ritmul e limitat (o cerere pe secundă la facturare), iar accesul la API trebuie activat în cont. Ce înseamnă pentru soft: tabelul de facturare are deja exact datele cerute (client, linii, cantități, prețuri în lei, TVA); un buton „Emite factura în FGO" din tabelul de comenzi (Contabilitate) ar trimite aceste date, iar FGO emite factura și o trimite în SPV (e-Factura). Se construiește în modulul de comenzi, după ce ai un cont FGO cu API activ; până atunci tabelul de facturare rămâne documentul pentru Saga.

## Capitolul 14 — Statusuri, istoric, intervenții — ÎNCHIS (13.10.2026)

**Statusurile ofertei** (definite 13.10.2026; opt, cu „Neacceptată" în oglinda lui „Acceptată"):
1. **În lucru** — oferta se construiește; nimic nu e trimis clientului; fără istoric.
2. **Transmisă** — oferta a fost comunicată clientului (verbal sau în scris); de aici începe istoricul.
3. **De revizionat** — clientul a cerut modificări (sau e de verificat ceva) după transmitere; oferta se reia și se retrimite.
4. **Acceptată** — clientul a confirmat oferta; de aici se pregătește comanda.
4b. **Neacceptată** — statusul în oglindă (adăugat 13.10.2026): clientul a refuzat oferta sau lucrarea s-a pierdut; oferta rămâne în listă, în ordinea ei cronologică, și poate reveni la orice status (regula de ordine).
5. **Avans luat** — agentul a primit avansul de la client; **la acest status se completează suma avansului, care poate fi și zero**. Bifa „avans încasat" de pe comandă (banii au ajuns la birou) e separată și o pune doar Administratorul agentului, care certifică încasările.
6. **De comandat** — oferta e gata de transmis la furnizor (formularul Bilka).
7. **Comandat** — comanda a fost trimisă la furnizor; creează rândul în lista de comenzi; produsele se îngheață.
- Până la „Comandat" statusurile le schimbă **agentul** (după situație) sau **Administratorul lui**, cu istoric. *Regula de ordine (decisă 13.10.2026):* orice status se poate pune în orice ordine și se poate reveni (ex. Transmisă → De comandat, fără avans; Acceptată → De revizionat), totul cu istoric; doar **Comandat** e ireversibil.
- **Comandat** îngheață zona produselor — nimic din produse, cantități sau prețuri nu se mai modifică; se pot corecta doar **sume**, cu istoric: totalul comenzii, avansul, comisionul montatorului. Orice material în plus = completare (capitolul 2b).
- După **Acceptată** (și până la Comandat) se poate modifica aproape orice, cu istoric și mențiuni.
- Statusurile comenzii (recepționat, livrat, recepționat parțial, încasări, comisioane) sunt în fișa CONTURI și se reiau în fișa COMENZI.

**Istoricul modificărilor:** fiecare ofertă are un istoric, ținut **de la statusul „Transmisă"** încolo (cât e „În lucru" se lucrează liber, fără jurnal). Fiecare intrare: cine, când, ce s-a schimbat (status, produs, cantitate, preț, sumă) și o **zonă de mențiuni** în care se notează detaliile modificării. Istoricul îl văd **agentul și Administratorul**. Sumele modificate poartă asteriscul roșu și „Vezi istoric" (fișa CONTURI).

**Intervențiile Administratorului** pe oferta unui agent apar în același istoric, cu numele lui — agentul le vede ca pe orice altă modificare.

**Notițe și atașamente** (poze, schițe, documente) stau **pe ofertă**, nu pe client; odată cu „Comandat" rămân accesibile din comandă.

**Documentele transmise:** istoricul reține și **ce document a fost generat și transmis** clientului — tipul (ofertă / rezumat / detaliată / tabel de facturare), varianta, data și canalul (WhatsApp, e-mail, print).

## Capitolul 15 — Lista de oferte — ÎNCHIS (13.10.2026; propunerea lui Claude acceptată, ordinea decisă de Ionuț; machetă: `docs/design/ecran-lista-oferte.png` / `.pdf` / `.html`)

**Capul paginii:** titlul „Oferte" cu numărătoarea (128 oferte · 14 în lucru · 6 de comandat); căutare într-o singură căsuță (client, telefon, număr de ofertă, localitate); butoanele „+ Ofertă nouă" și „Află preț".
**Filtre:** statusul, ca șir de butoane (Toate · În lucru · Transmisă · De revizionat · Acceptată · Neacceptată · Avans luat · De comandat · Comandat); perioada (implicit ultimele 90 de zile; lună / an / interval); agentul — doar pentru Administrator (unul, mai mulți sau toți agenții firmei) și firma — doar pentru Admin general; „⚠ Prețuri vechi (n)" — ofertele „În lucru" calculate pe o listă expirată; „Client cu mai multe oferte" (marcajul pentru Admin general).
**Coloanele:** Nr. și data (serie-număr, data dedesubt) · Client (nume; localitate și telefon dedesubt) · Învelitoare (model · finisaj · grosime · culoare; mp-ul și ce mai conține: + pluvial, + șipcă, varianta) · **Total cu TVA** (euro, cel mai mare text de pe rând; lei dedesubt) · Status (etichetă colorată; la „Avans luat" și suma) · Agent (lipsește la agent / colaborator) · Modificat (ultima modificare) · acțiuni: **Deschide**, **PDF ▾** (ofertă / rezumat / detaliată / tabel de facturare), **⋯** (copiază oferta, creează variantă, completare la această ofertă, preia prețurile în altă ofertă, istoric, notițe și atașamente).
**Ordine (decisă 13.10.2026):** cronologic descrescător — ultima ofertă apare prima — **indiferent de status**; excepție: tot ce are statusul **Comandat** trece la **sfârșitul listei**, într-un bloc propriu, ordonat după **data statusului „Comandat"**, cu ultima comandată prima în bloc. Orice coloană se poate sorta altfel, temporar.
**Marcaje:** „⚠ prețuri vechi · recalculează" pe rând (capitolul 11.8 / catalog); asteriscul roșu la sume modificate; punctul colorat la clientul cu mai multe oferte (Admin general); **completările apar sub oferta inițială**, indentate, cu „completare la IB-0147 · motivul".
**Cine vede ce** (fișa CONTURI): agentul și colaboratorul doar ofertele lor; Administratorul toate ofertele firmei; Admin general toate firmele.
**Pe telefon:** aceeași listă, cu coloanele esențiale (număr, client, total, status) și restul la deschiderea rândului.

## Capitolul 16 — Trecerea în comandă — ÎNCHIS (13.10.2026)

La statusul **Comandat**, oferta creează **rândul de comandă** (numărul comenzii = numărul ofertei). Toată lumea vede același lucru, cât mai bine structurat.

**Se completează automat, din ofertă:**
- **clientul**: nume, telefon, **localitatea** (adresa lucrării);
- **constructorul / montatorul**: nume și telefon (din secțiunea de recomandare / montator);
- **rezumatul comenzii** — o linie generată de soft, ca marfa să fie ușor de identificat în curte la încărcare: învelitoarea principală + secundară (model, culoare, finisaj, grosime, mp), apoi celelalte categorii cu cheia lor de culoare — ex. „Clasic 8019 mat 0,5 — 198,14 mp + T8 8019 mat 0,4 — 22,36 mp; sistem pluvial 7016 lucios; accesorii tinichigerie + accesorii speciale 8017 mat"; (în plus, invizibil în tabel dar accesibile din comandă: agentul, firma, liniile ofertei, panotajul, atașamentele, legătura „completare la …");
- **sumele**: totalul comenzii (cu TVA, euro și lei) și avansul (de la „Avans luat", poate fi zero); restul rezultă.

**Se completează pe comandă, după:**
- **datele de facturare**, doar dacă diferă de ale clientului (firmă, CUI, adresă);
- **indicații de livrare**, text liber (ex. „marți 20.10.2026 după 14:00"); programarea o face Gestiunea după discuția cu clientul (fișa CONTURI);
- **comisionul montatorului de dat** (sumă, cu istoric; „achitat" îl bifează Administratorul);
- **observații suplimentare** — zonă de text, cu istoric (cine, ce, când), ca la notițe.

**Statusurile comenzii (logistice):** inițial **Comandat** → **Recepționat** sau **Recepționat parțial** (comandă de la mai mulți furnizori, sau lipsuri la livrare — cu asteriscul roșu și nota lipsurilor, fișa CONTURI) → **Livrat**. Le schimbă Administratorul sau Gestiunea, cu istoric.

**Statusul încasării** merge în paralel cu cel logistic: **neîncasat** · **încasat parțial** · **încasat**. Propunere de mecanism (dezvoltă bifele din fișa CONTURI, de confirmat în fișa COMENZI): Administratorul agentului înregistrează fiecare încasare ca sumă + dată (avansul, tranșe, restul) — doar el certifică încasările; statusul rezultă singur: nimic înregistrat = neîncasat, mai puțin decât totalul = încasat parțial (cu suma încasată și restul la vedere), tot = încasat. Clienții care plătesc în mai multe tranșe se acoperă astfel fără bife speciale.

**Ce rămâne înghețat pe ofertă:** produsele, cantitățile și prețurile (capitolul 14); corecțiile de sume se fac pe comandă, cu istoric.

Tabelul de comenzi ca ecran (coloane, filtre, ce vede Gestiunea dintr-o privire, retururi, nota de retur, avizul, FGO) se detaliază în **fișa COMENZI**, cu machetă de ecran ca la lista de oferte.

## Capitolul 22 — Aviz de marfă — MUTAT în FISA-COMENZI cap. 9 (16.10.2026)
Idee notată de Ionuț: un buton **„Generează aviz marfă"** (din comandă, pentru Gestiune) care produce documentul de livrare — pe modelul ofertei detaliate cu coloana „Primit" (cantități, panotaj, fără prețuri sau cu, de decis), cu datele de livrare. Se detaliază după capitolele de ofertare, odată cu fișa COMENZI.

## Capitolul 20 — Tipurile de ofertă — SCHIȚĂ (11.09.2026) · AMÂNAT (17.10.2026: Ionuț renunță deocamdată la calculatoarele de pazie și gard; rămân ca idee, fără termen)

- **Oferta clasică**: tot ce descrie acest document; singurul calcul bazat pe metraj este la **șipca metalică** (capitolul 8, cele două variante ale lui Ionuț); în rest nicio funcție de calcul — ele intră la pazie, gard sau în modulul de panotaj.
- **Oferta pazie / lambriu metalic** (denumirea de stabilit): de regulă tablă cutată T8 de perete sau acoperiș, dar poate fi orice tablă cutată, plus accesorii speciale asemănătoare ca formă și diferite ca dimensiuni; cu funcții de calcul proprii. Se detaliază separat, după oferta clasică.
- **Oferta gard**: azi doar șipca de gard Bilka; furnizor viitor **Caretta** (șipcă și garduri tip jaluzea), ca un compartiment nou de catalog; în iarna 2026–2027 modele proprii de gard tip jaluzea, bazate pe accesorii la lungimi speciale făcute de Bilka, ulterior în producție proprie. Se detaliază separat.
