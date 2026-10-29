# Lista de acceptare — Etapa 3 (ofertare și documente: OFE · DOC · formularul Bilka)

Versiunea 1.1 · 29 octombrie 2026 (G1 precizat: același șablon Proroof la ambele firme) · Se bifează în sesiunea S17 și se îngheață odată cu eticheta `v0.3-ofertare`.
Fișier scris de Claude (chat). **Excepție la regula „docs/ nu se rescrie":** Claude Code completează doar coloana **Status** a rândurilor marcate „Code (S17)"; rândurile „Ionuț" le bifează Ionuț (prin Claude chat). Nimic altceva din fișier nu se modifică.

Legendă status: ✔ verificat (de cine, când) · ○ de verificat (de cine) · ✖ picat (ce s-a găsit → cerere BUG).

Principiu: Ionuț verifică **pe ecran și pe documente**, cu contul lui de Administrator, pe oferte făcute de el; Code verifică prin teste și prin citirea codului și a bazei. Nimic din această listă nu trimite o comandă reală la Bilka.

## A. Motorul și etalonul (închise la S10–S14b; se reconfirmă)

| Nr | Ce trebuie să fie adevărat | Cum se verifică | Status |
|---|---|---|---|
| A1 | Cele 12 oferte-model (E01–E12) ies la zero din motor, cu formularele după R10 (familia E01 → 1, E11 → 2, E12 → 2) | Code (S17): `npm run test:etalon` | ✔ Code 29.10 — `npm run test:etalon`: 12 etaloane la zero (după M3, formularele după R10: E01 → 1, E11 → 2, E12 → 2) |
| A2 | ARH §5 e ÎNGHEȚAT și reflectă M1 (id-uri) și M2 (formulare); orice schimbare viitoare trece prin ETALON întâi | Code (S17): citire ARH §5, §8, §13 | ✔ Code 29.10 — citit ARH §5 (ÎNGHEȚAT, M1 / M2 în §5.3–5.4, §5.9), §8, §13; M3 (conținutul structurat al formularelor) adăugat în §4.3 și §13, cu testul înainte de cod |
| A3 | E01 reconstruită din ecran, cu aceleași produse și cantități, dă cifrele etalon la cursul 5,3485: achiziție 14.337,77 lei · document 2.626,83 / 551,63 / 3.178,46 EUR · 17.000,00 lei (verificat 28.10 „la ban": diferența găsită a fost un mastic la 2 în loc de 3) | Ionuț, pe oferta lui de probă | ✔ Ionuț 28.10 (cu masticul la 3 → etalonul) |

## B. Lista de oferte, antetul, clientul (S12)

| Nr | Ce trebuie să fie adevărat | Cum se verifică | Status |
|---|---|---|---|
| B1 | Numerotarea e continuă pe seria contului, fără reluare anuală; două salvări simultane nu dau același număr; contorul poate porni de la un număr dat | Code (S17): test automat | ✔ Code 29.10 — `ofe-oferte.test.ts`: numerotare continuă pe serie, 10 creări simultane cu numere distincte consecutive, contorul pornit de la un număr dat (nu coboară sub numerele folosite) |
| B2 | Cele două cursuri se îngheață la crearea ofertei (document = BNR, achiziție = BNR × 1,01), cu sursa și data; regula orei 13:00; fără internet, ultimul curs cu avertizare | Code (S17): test automat | ✔ Code 29.10 — `ofe-oferte.test.ts` (cele două cursuri înghețate la creare cu sursa și data; fără internet, cursul precedent cu avertizare), `curs-regula.test.ts` (ora 13:00, weekend, ora României) |
| B3 | Cursul zilei se preia singur (BNR, iar când BNR refuză cererile automate — rezerva cursbnr.ro), pagina „Curs BNR" arată ultima încercare și sursa; introducerea manuală merge | Ionuț: Zona tehnică → Curs BNR, într-o zi lucrătoare după ora 13 | ○ Ionuț |
| B4 | Clienții se deduplică după telefonul normalizat (+40 / 0040 → 0); la telefon existent, oferta se leagă de clientul existent; fișa clientului arată ofertele lui | Ionuț: a doua ofertă cu același telefon | ○ Ionuț |
| B5 | Agentul și colaboratorul văd doar ofertele lor; Administratorul toate ofertele firmei (pornind pe ale lui); Admin general toate, cu filtrul Firmă; Contabilitate / Gestiune nimic încă (403); adaosul % și prețul de bază nu apar în niciun răspuns către Agent / Colaborator | Code (S17): test automat pe text | ✔ Code 29.10 — `ofe-oferte.test.ts` vizibilitatea (Agent doar ale lui, Administrator pe firmă, Admin general cu filtrul firmă, Contabilitate 403; detaliul fără adaos % și preț de bază), `ofe-preturi.test.ts` „cine vede ce” pe text |
| B6 | Lista: căutare într-o căsuță, filtre (status, perioadă, agent, firmă), ordinea cronologic descrescător cu blocul „Comandat" la sfârșit, completările indentate, coloanele esențiale pe telefon | Ionuț, pe listă, și pe telefon din rețeaua biroului | ○ Ionuț |
| B7 | Adresa lucrării și localitatea stau pe ofertă (copiate din client, modificabile); un client cu două lucrări are două adrese | Ionuț | ○ Ionuț |

## C. Editorul — zona produselor (S13, S13b)

| Nr | Ce trebuie să fie adevărat | Cum se verifică | Status |
|---|---|---|---|
| C1 | Cascada învelitorii din catalog (furnizor → tip → model → finisaj → grosime → culoare); culorile după tabelul finisaj × grosime cu excepțiile pe produs; lățimea din catalog | Ionuț, pe trei învelitori diferite (țiglă, Retro, tablă cutată) | ○ Ionuț |
| C2 | Cele trei moduri de cantitate (mp direct · panotaj · combinată), mp la 3 zecimale și colile la vedere; comandabil blocat la mp direct, cu motivele | Code (S17): test automat · Ionuț | ✔ Code 29.10 — `ofe-produse.test.ts` (180,481 mp și 48 de coli din panotaj, mp la 3 zecimale; E06 tronsoane), `ofe-statusuri.test.ts` („Comandat” blocat la mp direct, cu motivele) · ○ Ionuț |
| C3 | Rubricile în ordinea decisă, cu listele implicite (86 / 86 rezolvate) și „+ Adaugă…" filtrat pe rubrică și cheie; secțiuni pentru învelitoarea secundară și de sine stătătoare | Code (S17): test automat · Ionuț | ✔ Code 29.10 — `ofe-produse.test.ts`: listele implicite rezolvate integral pe nume pentru cheile reale, căutarea pe rubrică și cheie, treptele, pluvialul, șipca · ○ Ionuț |
| C4 | Două învelitori cu același produs în culori diferite rămân distincte (id-uri), accesoriile lor în pachete diferite; „+ Adaugă rubrică șipcă" dă a doua rubrică | Ionuț, pe E12 refăcută din ecran | ○ Ionuț |
| C5 | Rezultatul de jos arată mp, coli, pachetele și „Se vor genera N formulare" cu conținutul fiecăruia, după R10; nicio cifră de preț nu pleacă spre Agent din acest răspuns | Code (S17): test automat · Ionuț (pe E01: 1 formular) | ✔ Code 29.10 — `ofe-produse.test.ts` E01 (1 formular, fără preț în răspuns), E11 (2), E12 (2); `mot-m3.test.ts` structura fiecărui formular · ○ Ionuț (pe E01: 1 formular) |
| C6 | Salvarea e automată, cu indicatorul „salvat"; săgețile ↑ ↓ și Enter mută între cantități și rândurile de panotaj; ecranul e comprimat | Ionuț | ○ Ionuț |
| C7 | Capacul de coamă stă la „Fixare și etanșare" (categoria din catalog, CSV-ul corectat) | Ionuț: lista implicită a rubricii | ○ Ionuț |

## D. Prețurile în ofertă (S14)

| Nr | Ce trebuie să fie adevărat | Cum se verifică | Status |
|---|---|---|---|
| D1 | Zona de țintă: achiziția contului în lei cu TVA pe linie (cu grupa), adaos % sau total cu TVA, marja și adaosul real; implicit 20 % | Ionuț | ○ Ionuț |
| D2 | Cele trei moduri de prezentare și prețurile fixe (lei / EUR, cu / fără TVA, „achiziție + x %") dau cifrele etalon prin API (E01, E02, E04, E05, E08, E12) | Code (S17): test automat | ✔ Code 29.10 — `ofe-preturi.test.ts`: E01, E02, E04, E05, E08, E12 construite din editor + prețuri dau exact cifrele etalon; prețul fix „achiziție + 5 %” și cel în lei cu TVA normalizate |
| D3 | Garda: o țintă sau un fix sub achiziția reală e refuzată (409) și ecranul păstrează valoarea dinainte, cu liniile vinovate arătate; completarea marcată poate fi la 0 | Code (S17): test automat · Ionuț (încearcă o țintă sub achiziție) | ✔ Code 29.10 — `ofe-preturi.test.ts`: țintă sub achiziție → 409 cu liniile vinovate, ținta rămâne cea dinainte; preț fix sub achiziția reală → 409; `ofe-statusuri.test.ts`: completarea legată cu ținta 0 permisă · ○ Ionuț (încearcă o țintă sub achiziție) |
| D4 | Totalul în lei după R6: suma discutată exact când liniile o ating; „cât iese" la abatere și la adaos % | Code (S17): test automat (E01, E06, E11) | ✔ Code 29.10 — `mot-preturi.test.ts` R6 (17.000,00 lei din E01), etaloanele E01, E06, E11 la zero (`test:etalon`), E01 prin API (`ofe-preturi.test.ts`) |
| D5 | „Creează variantă" păstrează adaosul bazei cu 4 zecimale (E09 din E01); versiunile sub același număr, „Fă-o curentă"; „Acceptată" o face curentă | Code (S17): test automat · Ionuț | ✔ Code 29.10 — `ofe-preturi.test.ts`: varianta E09 din E01 cu adaosul bazei păstrat, versiunile, „Fă-o curentă”; `ofe-statusuri.test.ts`: „Acceptată” face varianta curentă · ○ Ionuț |
| D6 | „Preia prețuri din oferta…" și renunțarea; „Completare la…" cu motiv din listă; lucrarea agregată (E01 + E10) | Code (S17): test automat | ✔ Code 29.10 — `ofe-preturi.test.ts`: preluarea prețurilor și renunțarea; completarea cu motiv din listă (E10) și lucrarea agregată; `ofe-statusuri.test.ts`: legarea ulterioară (E01 + E10) |
| D7 | „Reîmprospătează cursul" cât e „În lucru"; „⚠ prețuri vechi · recalculează" când lista de preț a produsului nu mai e cea activă | Code (S17): test automat | ✔ Code 29.10 — `ofe-preturi.test.ts`: reîmprospătarea cursului cât e „În lucru”; „prețuri vechi” și recalcularea din lista activă |
| D8 | „Află preț": căutare → caracteristici → prețul contului cu TVA pe unitate, la cursul de achiziție al zilei; fără istoric, fără adaos | Ionuț, cu un cont de Agent (nu Administrator), pe 3 produse | ○ Ionuț |

## E. Statusuri, istoric, montator, comanda minimă (S15)

| Nr | Ce trebuie să fie adevărat | Cum se verifică | Status |
|---|---|---|---|
| E1 | Cele 8 statusuri în orice ordine, cu revenire; doar „Comandat" ireversibil; „Avans luat" cere suma; alt agent → 403, Administratorul firmei poate | Code (S17): test automat | ✔ Code 29.10 — `ofe-statusuri.test.ts`: orice ordine cu revenire, „Avans luat” cere suma, alt agent 403, Administratorul firmei poate, „Comandat” ireversibil |
| E2 | Istoricul pornește la „Transmisă" (cine, când, ce, înainte / după, mențiuni); cât e „În lucru" nu se scrie nimic; intervențiile Administratorului apar cu numele lui; asteriscul roșu la sumele modificate | Code (S17): test automat · Ionuț (modifică o cantitate după „Transmisă") | ✔ Code 29.10 — `ofe-statusuri.test.ts`: nimic „În lucru”, de la „Transmisă” antet / produse / prețuri / client cu mențiuni, intervenția Administratorului cu numele lui, asteriscul la sumele modificate · ○ Ionuț (modifică o cantitate după „Transmisă”) |
| E3 | „Comandat" e blocat la mp direct; îngheață antetul, clientul, produsele și prețurile; salvează rezultatul complet al motorului; creează rândul de comandă cu rezumatul după cap. 16 | Code (S17): test automat · Ionuț (citește rezumatul comenzii pe oferta lui) | ✔ Code 29.10 — `ofe-statusuri.test.ts`: blocat la mp direct cu motivele; îngheață totul, salvează rezultatul complet al motorului, rândul de comandă cu rezumatul; ireversibil · ○ Ionuț (citește rezumatul comenzii pe oferta lui) |
| E4 | Montatorii / constructorii: lista agentului, văzută de el și de Administratori; recomandarea și comisionul pe ofertă, cu istoric; nimic pe documente | Code (S17): test automat · Ionuț | ✔ Code 29.10 — `ofe-statusuri.test.ts`: lista proprie a agentului, văzută de el și de Administrator, nu de alt agent; recomandarea pe ofertă cu istoric; `ofe-documente.test.ts`: nimic pe documente · ○ Ionuț |
| E5 | Notițele și atașamentele stau pe ofertă și rămân accesibile din comandă; legarea ulterioară ca completare merge și după comandă | Ionuț | ○ Ionuț |

## F. Documentele (S16)

| Nr | Ce trebuie să fie adevărat | Cum se verifică | Status |
|---|---|---|---|
| F1 | PDF-ul de ofertă arată ca macheta: antet (sigle, firmă, agent, client, „Deviz ofertă", SERIE-NR / DATA, fără valabilitate), benzi pe rubrică și cheie cu subtotal, o linie per învelitoare doar cu suprafața, coloanele după modul de prezentare, totalurile cu „Total în lei", subsolul cu garanțiile și „Curs EURO"; fără coduri, semnătură, ștampilă | Ionuț, pe oferta lui, cu macheta alături | ○ Ionuț |
| F2 | Detaliata are panotajul sub fiecare învelitoare și coloana „Primit"; rezumatul e pe blocuri numerotate fără valori pe categorii; tabelul de facturare e în lei, cu prețuri unitare la 4 zecimale și totalul = oferta + liniile preluate (E07: 19.238,50) | Code (S17): test automat pe textul PDF · Ionuț (cele trei documente) | ✔ Code 29.10 — `ofe-documente.test.ts`: detaliata cu panotaj și „Primit”, rezumatul E11 pe blocuri fără valori, tabelul de facturare E07 în lei la 4 zecimale cu totalul 19.238,50 · ○ Ionuț (cele trei documente) |
| F3 | „Supliment la ofertă" apare doar când există linii în zona B, pe pagină nouă numerotată în continuare; zona B nu apare în corpul ofertei | Code (S17): test automat · Ionuț | ✔ Code 29.10 — `ofe-documente.test.ts` E07: suplimentul pe pagină nouă numerotată în continuare, nicio linie din zona B în corp · ○ Ionuț |
| F4 | Documentele au pagini corecte pe oferte lungi (cap de tabel repetat, totalurile nu se rup, „Pagina x din y"); fonturile din proiect — diacriticele corecte | Code (S17): test automat (68 de linii) · Ionuț (un PDF cu diacritice: ș, ț, ă, â, î) | ✔ Code 29.10 — `ofe-documente.test.ts`: oferta lungă (68 de linii, mai multe pagini, capul de tabel repetat, „Pagina x din y”); textul extras din PDF cu diacritice (Câmpineanca, „Deviz ofertă”) din fonturile proiectului · ○ Ionuț (un PDF cu ș, ț, ă, â, î) |
| F5 | Fiecare generare rămâne ca document al ofertei (tip, variantă, dată-oră); „Marchează ca transmis" scrie în istoric; documentul unei oferte „Comandat" vine din rezultatul salvat, fără recalcul | Code (S17): test automat | ✔ Code 29.10 — `ofe-documente.test.ts`: fiecare generare rămâne document al ofertei (tip, variantă, dată-oră), „marchează ca transmis” în istoric, „Comandat” din rezultatul salvat fără recalcul |
| F6 | Colaboratorul primește doar PDF-ul ofertei lui (tabelul de facturare → 403) | Code (S17): test automat | ✔ Code 29.10 — `ofe-documente.test.ts`: colaboratorul primește PDF-ul ofertei lui, tabelul de facturare 403, alt agent nu vede; `ofe-formular-bilka.test.ts`: formularul Bilka 403 pentru colaborator |

## G. Formularul de comandă Bilka (S16b)

| Nr | Ce trebuie să fie adevărat | Cum se verifică | Status |
|---|---|---|---|
| G1 | Șablonul se încarcă per firmă din Zona tehnică → Firme; azi toate comenzile la Bilka se dau pe Proroof Comp (care facturează către Roofshop), deci Ionuț încarcă **același formular Proroof la ambele firme** (decizie 29.10; la alți furnizori va diferi); fără șablon, generarea spune clar că lipsește | Ionuț | ○ Ionuț (formularul Proroof încărcat 29.10; prima generare „în linii mari în regulă") |
| G2 | Fișierele generate păstrează proiectul VBA și tot ce nu e celulă de intrare octet cu octet (hash identic); se schimbă doar valorile de intrare și semnul de recalcul | Code (S17): test automat | ✔ Code 29.10 — `ofe-formular-bilka.test.ts` `verificaHash`: toate intrările neatinse ale arhivei identice (CRC + SHA-256 pe datele comprimate), `vbaProject.bin` identic (976.896 octeți), doar FORMULAR COMANDA / foile de pluvial / speciale și `workbook.xml` (`fullCalcOnLoad`) se schimbă |
| G3 | Fișierul deschis în Excel, cu macro-urile active: învelitoarea (tip, model, finisaj, culoare, grosime, montaj A / P la tabla cutată), lungimile × coli, rândurile de tinichigerie și auxiliare cu cantitățile, blocul de șipcă, culoarea și cantitățile pluvialului pe foaia lui, accesoriile la lungimi, antetul (SERIE-NR, localitatea, telefonul) — exact cum l-ar fi completat Ionuț | Ionuț, pe o ofertă reală, celulă cu celulă; validarea codurilor cu macro-ul Bilka, **fără trimiterea comenzii** | ○ Ionuț |
| G4 | Numărul și conținutul formularelor urmează R10 (E01 → 1, E11 → 2, E12 → 2, E03 → 1 cu foaia de lungimi) | Code (S17): test automat | ✔ Code 29.10 — `ofe-formular-bilka.test.ts`: E01 → 1 (antet, 4 lungimi, T8 secundară, rândurile accesoriilor, pluvialul 3005), E11 → 2 (pluvialul mat pe blocul lui), E12 → 2 (blocurile de șipcă), E03 → 1 (T 35 A / P, speciale, foaia de lungimi); `mot-m3.test.ts`: structura |
| G5 | Produsele fără loc în formular apar în „Nu au loc în formularul Bilka: …", pe ecran și pe document — niciodată omise tăcut | Code (S17): test automat · Ionuț (un produs Aluzinc pe ofertă) | ✔ Code 29.10 — `ofe-formular-bilka.test.ts`: pluvialul Aluzinc → „Nu au loc în formularul Bilka: …” pe răspuns și pe document; formularul se generează în rest · ○ Ionuț (un produs Aluzinc pe ofertă) |
| G6 | Tabela de corespondență (Referințe → „Formular Bilka"): cele 46 de rânduri „de verificat" controlate și corectate de Ionuț; un nume lipsă din șablon oprește generarea cu mesaj | Ionuț (Referințe) · Code (S17): test automat pentru numele lipsă | ○ Ionuț (Referințe) · ✔ Code 29.10 — un nume din tabelă care lipsește din șablon → 409 cu numele și locul corecturii (Referințe → „Formular Bilka” / Zona tehnică → Firme), niciun document creat; Aluzinc rămâne avertizare — reparat în S17a (la S16b era avertizare), `ofe-formular-bilka.test.ts` |

## H. Date, siguranță, închidere

| Nr | Ce trebuie să fie adevărat | Cum se verifică | Status |
|---|---|---|---|
| H1 | Migrările 6–13 se aplică de la zero pe o bază goală; niciuna nu conține instrucțiuni distructive; `npm run seed` încarcă listele configurabile și corespondența, idempotent | Code (S17): test automat + citirea SQL-ului | ✔ Code 29.10 — `migrari-aditive.test.ts`: SQL-ul migrărilor 6–13 fără DROP / TRUNCATE / DELETE (lărgirile permise notate: DROP NOT NULL, indexul unic al șipcii înlocuit cu unul simplu — S13b); aplicarea de la zero la fiecare rulare (`globalSetup` și schema `test_restore`); seed-ul idempotent pentru liste și corespondență |
| H2 | Exportul „descarcă tot" cuprinde toate tabelele noi (clienți, oferte, linii, documente, comenzi minime, cursuri, corespondență) și restaurarea pe o bază goală le reface; **exportul pentru Administratori**, fără `_sistem/parole.csv`, există | Code (S17): test automat (export → restaurare → comparație) | ✔ Code 29.10 — `export-restore.test.ts`: formatul 2 cu toate tabelele ofertării, export → bază goală → restaurare → aceleași numărători și valori (legăturile ofertei către ea însăși, rezultatul salvat, copiii, documentul, comanda, fișierele); exportul de firmă pentru Administratori fără `_sistem/parole.csv`, doar firma lui, refuzat la restaurare |
| H3 | Niciun secret în cod sau în git; șabloanele Bilka ale firmelor și documentele generate stau în folderul de date, nu în depozit (excepție: șablonul v10 din `docs/Liste`, deja în git) | Code (S17): căutare în depozit și istoric | ✔ Code 29.10 — căutare în depozit și în istoricul git (`git log -S` pe PAROLA / SECRET / DATABASE_URL): doar `.env.example` cu valori goale; `server/data/` ignorat (sigle, șabloane Bilka, documente, atașamente); șablonul v10 din `docs/Liste` rămâne excepția cunoscută |
| H4 | Fișierele de diagnostic și de probă nu există în depozit; `npm test` verde complet; 12 etaloane la zero | Code (S17) | ✔ Code 29.10 — `git ls-files` fără fișiere de diagnostic sau de probă (singurele „proba” sunt ecranul tehnic „Calcul de probă” și testul lui); `npm test` 297 verzi; 12 etaloane la zero |
| H5 | 3–5 oferte reale (produse, cantități, suma comunicată clientului) reconstruite din ecran dau documentele pe care Ionuț le-ar fi trimis clientului | Ionuț, cu ofertele reale alături | ○ Ionuț |
| H6 | ARH §4.3 → ÎNGHEȚAT; eticheta `v0.3-ofertare` pusă după ce rândurile „Ionuț" sunt bifate sau abaterile lor au cerere BUG | Code (S17b), la cererea lui Ionuț prin Claude chat | ○ Code |

**Ce NU face Etapa 3** (nu se verifică aici): tabelul de comenzi complet, încasările, retururile, avizul și fișa șoferului (Etapa 5); trimiterea documentelor pe e-mail / WhatsApp din soft și găzduirea pe VPS (Faza 3); ferestrele (Etapa 4); schița și panotajul automat (Etapa 8).
