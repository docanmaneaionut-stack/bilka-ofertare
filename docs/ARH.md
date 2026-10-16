# ARH — Arhitectura softului de ofertare și gestiune

Versiunea 0.2 · 2 septembrie 2026 · Proprietar: Ionuț · Redactat împreună cu Claude

---

## 0. Cum se folosește documentul

- ARH este memoria proiectului. Va trăi în depozitul de cod (`docs/ARH.md`) și este citit la începutul fiecărei sesiuni de lucru. Ce nu e scris aici nu există pentru sesiunea următoare.
- Fiecare secțiune are un status:
  - **PROPUS** — schiță scrisă de Claude, așteaptă revizuirea lui Ionuț;
  - **APROBAT** — confirmat de Ionuț; se construiește după el;
  - **ÎNGHEȚAT** — construit și acoperit de teste; se schimbă doar prin cerere explicită și cu actualizarea testelor.
- Marcajul **[DE CONFIRMAT]** = presupunere a lui Claude, cu o valoare implicită propusă. Ionuț răspunde doar acolo unde valoarea implicită e greșită; lipsa unui răspuns înseamnă acceptarea valorii implicite.
- Documentul se revizuiește secțiune cu secțiune, în ordinea de mai jos, câte una pe sesiune. O secțiune aprobată nu se mai rescrie; se completează.

---

## 1. Principii — PROPUS (de aprobat acum)

1. **Sigur, corect, apoi rapid.** Ordinea nu se negociază la fundație (model de date, motor de calcul, teste, backup). Scurtăturile sunt permise doar unde duc la același rezultat și sunt listate în §11.
2. **Trei straturi separate:** cod (motor + interfață) / configurare (catalog, liste de preț, reguli per furnizor) / date de lucru (oferte, clienți, comenzi). Configurarea și datele nu stau niciodată în cod.
3. **Nimic nu se construiește de două ori.** Munca manuală a lui Ionuț se face o singură dată și devine permanentă: o ofertă etalon devine test, o listă de preț devine versiune, o listă de culori devine configurare.
4. **Înghețarea se face prin teste, nu prin promisiuni.** O regulă e înghețată când are test; o modificare care schimbă un rezultat înghețat e respinsă automat înainte să ajungă la Ionuț.
5. **Un furnizor = date + profil.** Nucleul nu conține logică specifică unui furnizor. Un modul nou nu modifică modulele existente; le folosește prin interfețe definite.
6. **Datele nu se pierd.** Versiuni pentru liste de preț, snapshot pentru oferte, migrări aditive pentru baza de date, backup zilnic verificat prin restaurare reală, jurnal de modificări.
7. **Tehnologie mainstream,** preluabilă de orice programator, ca proiectul să nu depindă de o singură persoană (nici de Claude).
8. **Fiecare sesiune se termină cu un rezultat durabil:** o secțiune aprobată, teste verzi, o versiune salvată sau un ecran utilizabil. Nu există sesiuni „de explorat".

---

## 2. Glosar — PROPUS (de aprobat acum)

| Cod | Modul | Conținut |
|---|---|---|
| ARH | Arhitectură | acest document |
| CAT | Catalog | produse, categorii, parametri de calcul, culori |
| LP | Liste de preț | versiuni de prețuri per furnizor |
| MOT | Motor de calcul | panelare, accesorii, conversii, cele trei straturi de preț |
| OFE | Ofertare | fluxul și ecranele de creare / editare ofertă |
| DOC | Documente | PDF ofertă, tabel factură, alte tipărituri |
| CON | Conturi | utilizatori, roluri, firme emitente, permisiuni |
| COM | Comenzi și încasări | comenzi către furnizor, avansuri, plăți |
| STO | Stoc și livrări | stoc propriu per firmă, livrări |
| NOT | Notițe | notițe text / voce, offline pe telefon |
| SCH | Schiță | desenul 2D al acoperișului: contur, linii interioare, cote, marcarea fiecărei linii ca streașină / coamă / dolie / fronton / bordură la perete |
| GEO | Geometrie | apele acoperișului derivate din schiță, direcția de curgere, pante, suprafețe și lungimi reale |
| PAN | Panotaj | împărțirea fiecărei ape în coli pe modelul ales: lungimi, tăieturi, rupere, refolosire, listă de tăiere |
| ADM | Zona tehnică | administrare catalog, liste, setări, import |
| IMP | Import / Export | adaptoare pentru fișierele furnizorilor (intrare: liste de preț; ieșire: comenzi) |
| ETALON | Teste | ofertele etalon și testele de reguli |
| ÎNGH | Zonă înghețată | tot ce e acoperit de teste și nu se atinge fără cerere explicită |

Tipuri de cerere: **BUG** (mergea, acum nu) · **MODIFICARE** (merge cum a fost gândit, se dorește altfel) · **NOU** (funcționalitate nouă).

---

## 3. Actori și permisiuni — PROPUS

Roluri (valori implicite, [DE CONFIRMAT]):

- **Administrator** (Ionuț): totul, inclusiv ADM, toate firmele, toate ofertele.
- **Director zonal**: vede și poate prelua ofertele agenților din zona lui; nu are acces la ADM.
- **Agent**: creează oferte pe firma alocată (schimbabilă per ofertă); vede propriile oferte și proprii clienți. Vede prețul țintă, prețul de prezentare și **pragul minim de vânzare**, dar nu prețul de achiziție ca atare.
- **Colaborator**: introduce propriul necesar de materiale și primește prețul = achiziție + adaosul lui fix negociat (ex. +5 %, +10 %), setat în contul lui. Vede doar propriile cereri.

Reguli:

- Permisiunile se aplică pe server, nu doar în interfață (un ecran ascuns nu e o protecție).
- Un utilizator are o firmă implicită și poate fi autorizat pe mai multe.
- Orice acțiune importantă (creare / modificare ofertă, schimbare de preț, schimbare de status) se scrie în jurnal: cine, când, ce.

---

## 4. Modelul de date (fundația) — PROPUS

Principiu: entitățile de mai jos se proiectează acum pentru toate modulele, chiar dacă interfața lor vine mai târziu. Câmpurile marcate „ulterior" se adaugă la modulul respectiv prin migrare aditivă.

### 4.1 Configurare (ADM / CAT / LP)

- **Furnizor**: denumire; moneda listei (EUR); profil de calcul (parametri: adaos achiziție %, marjă curs %, divizori ml→buc, suprapunere la rupere, praguri de pantă, lungime maximă foaie); activ. „Stoc propriu" se modelează tot ca furnizor, per firmă [DE CONFIRMAT].
- **Categorie de produs**: denumire; ordinea în ofertă; zonă (A = produse; B = lemn / feronerie / manoperă, pass-through); adaos țintă implicit % [de completat].
- **Produs**: cod intern (al nostru, stabil); cod furnizor; furnizor; categorie; denumire; unitate de vânzare (mp / ml / buc / set); **tip de calcul** (mp din panelare · ml→buc cu divizor · buc direct · procent din valoare · pass-through); parametri (lățime totală, lățime utilă, divizor ml→buc, lungime maximă); grosime; finisaj; lista de culori disponibile; activ; ordine.
- **Culoare**: cod; denumire; finisajele în care există; supliment de preț opțional [DE CONFIRMAT — implicit: aceeași culoare, același preț în cadrul unui finisaj].
- **Listă de preț (versiune)**: furnizor; denumire (ex. „Bilka v11"); valabilă de la; sursă (fișier / observație); status (schiță / activă / arhivată); creată de; data. O singură listă activă per furnizor la un moment dat; cele vechi nu se șterg niciodată.
- **Preț de listă**: listă de preț; produs; preț listă (EUR, fără TVA); observație.
- **Setări**: TVA %; sursa cursului (BNR); alte constante.

### 4.2 Persoane și firme (CON)

- **Firmă emitentă**: denumire; CUI; adresă; cont bancar; logo; seria de numerotare a ofertelor; textul legal pentru zona B [de completat]; activ.
- **Utilizator**: nume; telefon; email; parolă (criptată); rol; firmă implicită; firme autorizate; zonă (pentru director); adaos fix % (pentru colaborator); activ.
- **Client**: nume; telefon (cheie de deduplicare [DE CONFIRMAT]); email; localitate / adresă; tip (persoană fizică → prețuri cu TVA / persoană juridică → fără TVA); CUI opțional; note; creat de.

### 4.3 Ofertare (OFE / MOT / DOC)

- **Ofertă**: număr (serie firmă / an / secvență [DE CONFIRMAT]); firmă; agent; client; data; status (În lucru · Transmisă · De revizionat · Acceptată · Avans luat · De comandat); moneda documentului (lei / euro); **curs BNR înghețat pe ofertă** (plus marja); lista de preț folosită (versiunea); mod de prezentare (simplu · preț listă + un discount general la total · discount per linie, cu produse la preț fix și excepții per categorie); adaos țintă % / total țintă cu TVA; TVA afișat da / nu; ofertă părinte + eticheta variantei (pentru variante de preț); recomandare (sursă, nume, telefon, comision); note; blocată la (data acceptării); creată / modificată de.
- **Secțiune de acoperiș**: ofertă; denumire; formă și dimensiuni; pantă; model / produs de bază; sursă (manual / import măsurători — punct de extensie pentru modulul cu dronă); rezultatul panelării (lungimi și număr de foi). Nicio secțiune nu e obligatorie.
- **Schiță**: ofertă; versiune; conținut (noduri, linii cu tip și lungime, pante, unități); sursă (manual / import măsurători din dronă); creată / modificată de. Din schiță se derivează secțiunile de acoperiș (apele) — o secțiune poate avea sursa „schiță"; secțiunile manuale rămân posibile în paralel.
- **Panotaj**: ofertă; schița (versiunea); model; parametrii folosiți; rezultat pe ape (coli cu lungimi, tăieturi, refolosiri); listă de tăiere (lungime × cantitate); snapshot la emiterea ofertei.
- **Linie de ofertă**: ofertă; zonă (A / B); produs (referință) **+ snapshot complet** (cod, denumire, culoare, grosime, finisaj, unitate); cantitate; sursa cantității (auto / manual); preț listă; preț achiziție; preț țintă; preț prezentare; discount linie; preț fix (da / nu, valoare, monedă, cu / fără TVA); ordine. Snapshot-ul garantează că oferta rămâne identică oricâte liste de preț apar după ea.
- **Document generat**: ofertă; tip (PDF ofertă / tabel factură); versiune; fișier; data.

### 4.4 Ulterior (COM / STO / NOT) — proiectate acum, construite la rândul lor

- **Comandă furnizor**: firmă; furnizor; oferte legate; linii (preluate din liniile de ofertă); status [stadii de completat]; fișier de export (formatul Bilka, prin IMP); date.
- **Încasare**: ofertă; tip (avans / rest); sumă; dată; metodă; document.
- **Livrare**: comandă; dată; status; observații.
- **Stoc / mișcare de stoc**: firmă; produs; intrare / ieșire; cantitate; referință (comandă / ofertă).
- **Notiță**: utilizator; conținut (text / audio transcris); legată de client / ofertă (opțional); creată offline da / nu; sincronizată la.
- **Jurnal**: utilizator; moment; entitate; acțiune; valoare înainte / după.

---

## 5. Reguli de calcul (MOT) — PROPUS, devin ÎNGHEȚAT după ETALON

Regulile de mai jos sunt cele validate în prototipul v4.1 pe oferte reale. Se transcriu în teste înainte de a fi implementate.

### Panelare și cantități

- Tabla se vinde la lățime totală; lățimea utilă se folosește doar la panelare.
- Lățimi totale per model: Clasic 1,20 · Dacic / Balcanic / Iberic / Gotic 1,18 · Adriatic 1,215 · Hellenic / Britanic 1,21 · Romanic 1,14 · Retropanel 0,542 · Retroduo 1,10 · fălțuită 0,56 / 0,36 · T8 1,20 · T12 1,14 · T18 1,15 · Sinus18 1,10 · T35 1,085 · T45 1,01 · T153 0,864.
- Ruperea foilor lungi: decizie manuală; la rupere se adaugă 15 cm suprapunere.
- Conversie ml → bucăți: coame ÷ 1,85; dolii ÷ 1,80; restul accesoriilor ÷ 1,90; rotunjit în sus.
- Șipcă gard (Oslo / Haga / Berna / Sofia; capăt drept sau rotund, același preț): cantitate manuală sau automată = lungime gard ÷ (lățime șipcă + spațiu opțional), rotunjit în sus; variantele identice se unesc pe o singură linie.
- Culorile se aleg din lista finisajului.
- Nicio secțiune nu e obligatorie; oferta poate fi doar o listă de cantități.

### Prețuri — trei straturi

- **Achiziție** = preț listă (EUR) + 1 %, convertit la curs BNR + 1 % [DE CONFIRMAT — formula exactă]. Cursul se îngheață pe ofertă.
- **Țintă**: lucrează cu TVA inclus; se completează fie adaosul țintă %, fie totalul dorit cu TVA (celălalt se calculează). Adaos implicit pe categorie [de completat].
- **Prezentare**: pornește de la prețul de listă ca ancoră și de la un discount calculat invers, astfel încât totalul de prezentare să ajungă la țintă. Trei moduri: simplu · preț listă + un discount general la total · discount per linie, cu produse la preț fix și excepții per categorie.
- **Gardă absolută**: nicio linie și niciun total sub prețul de achiziție. Pragul minim e vizibil agentului; achiziția nu.
- **Prețuri fixe**: se introduc în lei sau euro, cu sau fără TVA; softul le normalizează. În rest, prețul de listă al unei linii nu se editează manual în ofertă — singura excepție este prețul fix.
- **Variante de preț**: o variantă păstrează adaosul % al ofertei de bază, aplicat pe prețurile noi de achiziție; se recalculează automat.
- **Colaboratori**: preț = achiziție × (1 + adaosul fix al colaboratorului).

### Documente

- Prețurile documentului în EUR, cu totalul în RON în subsol; moneda ofertei selectabilă lei / euro.
- Persoane fizice: prețuri cu TVA; persoane juridice: fără TVA.
- Tabel factură: prețuri nete, fără discount afișat.
- Oferta acceptată își blochează totalul; secțiunea „recomandare" se completează la acceptare.
- Zona B (lemn / feronerie / manoperă): pass-through, cu text legal propriu [de completat].

### Date de completat de Ionuț (configurare — nu blochează fundația)

Culorile disponibile per model / grosime · adaosul țintă implicit per categorie · lămurirea 6,54 € vs 6,46 € la Clasic Mat 0,50 · pragurile de pantă pentru avertizări la îmbinări · lungimea maximă a foii · textul legal pentru zona B · stadiile comenzilor · schema de comision a agenților · listele predefinite pentru acoperiș plat (Retropanel / fălțuită).

### Reguli de panotaj (PAN) — de completat de Ionuț înainte de Etapa 8

Pentru fiecare model: modulul de lungime al țiglei; prelungirea la streașină; lungimea maximă și lungimea minimă utilă a unei coli; marginea de la care se pornește; dacă și cum se refolosesc piesele rămase din tăieturile oblice (schema „o coală, două ape"); orientarea profilului. Regulile vin din felul în care lucrează montatorii, nu din calcul.

Gramatica acoperișurilor acceptate în v1: contur rectiliniu; o singură pantă pe apă; coame înclinate și dolii la orice unghi; fără lucarne (se desenează ca secțiune separată). Orice altceva merge pe fluxul manual existent.

---

## 6. Zona tehnică (ADM) și actualizarea prețurilor — PROPUS

Softul nu citește niciodată fișierul Bilka la rulare; citește propria bază de date. Actualizarea unei liste are trei căi, toate în ADM:

1. **Manual** — orice produs, orice preț, oricând.
2. **În masă** — „copiază lista v10 ca v11, valabilă de la data X, și aplică +3 % pe categoria Y".
3. **Import CSV cu verificare** — format canonic fix (cod intern, cod furnizor, denumire, categorie, grosime, finisaj, unitate, preț listă EUR); înainte de aplicare, un ecran de diferențe: prețuri modificate, produse noi, produse dispărute. Nimic nu se aplică fără confirmare.

Fișierele Bilka (PDF / Excel) se transformă în CSV canonic fie de Claude în conversație, fie de un adaptor IMP dedicat. O schimbare de format la Bilka atinge doar această transformare; softul funcționează în continuare pe ultima listă activă. Extragerea din PDF nu e infailibilă — de aceea ecranul de diferențe este obligatoriu, nu opțional.

Tot în ADM: catalogul (produse, categorii, tipuri de calcul, culori), profilul furnizorului, firmele, utilizatorii, setările, jurnalul, starea backup-urilor, export „descarcă tot".

---

## 7. Granițele modulelor și ordinea construcției — PROPUS

- MOT primește date (secțiuni, cantități, lista de preț, parametri) și întoarce linii calculate; nu știe nimic despre interfață.
- OFE folosește MOT; DOC folosește OFE; COM citește ofertele acceptate; STO citește comenzile și livrările; NOT e independent și se leagă opțional de client / ofertă.
- Adăugarea unui modul = folder nou + tabele noi + migrare aditivă; nu modifică modulele existente.
- Ordinea: **bază de date + CON minim + CAT / LP / ADM** (Ionuț devine independent la prețuri din prima zi) → **MOT + ETALON** (nu se merge mai departe până nu trec toate ofertele etalon) → **OFE + DOC** → **CON complet** → **COM** → **STO** → **NOT**.
- **SCH / GEO / PAN** se construiesc după NOT, în cinci sub-etape, fiecare cu rezultat utilizabil: E1 schiță + marcare → suprafețe și lungimi pe tipuri, direct în ofertă · E2 ape, pante, dimensiuni reale · E3 panotaj v1 (tăieturi, rupere, rotunjire) → listă de tăiere + desen · E4 refolosire, optimizarea pierderilor, alegerea startului, reguli per model · E5 generare automată a coamelor și doliilor din contur; import din dronă.
- Granițe: PAN produce liste de coli; MOT le prețuiește. GEO și PAN se construiesc ca biblioteci pure, testate pe acoperișuri reale, înaintea interfeței de desen. Interfața principală de introducere este „desen prin cote" (segmente cu lungime și direcție), desenul cu mouse-ul fiind pentru corecții.

---

## 8. Teste și înghețare (ETALON / ÎNGH) — PROPUS

- **Oferte etalon**: 10–20 de oferte reale, fiecare cu toate intrările (secțiuni, produse, cantități, opțiuni de preț, curs) și rezultatul validat la leu (linii + totaluri). Se introduc o singură dată și rămân permanent.
- **Teste de reguli**: câte un test pentru fiecare regulă din §5 (ex.: 10 ml coamă ÷ 1,85 = 5,4 → 6 buc).
- Testele rulează automat înainte de fiecare modificare; o modificare care schimbă un rezultat etalon nu ajunge la Ionuț.
- **Lista ÎNGH** = tot ce are test. O secțiune trece în ÎNGHEȚAT când testele ei trec și Ionuț a verificat pe oferte reale.
- Schimbarea unei reguli înghețate: cerere explicită de tip MODIFICARE → se actualizează întâi testul, apoi codul.
- **Etalon PAN**: 10–15 acoperișuri reale, cu schița măsurată și lista de coli efectiv comandată și montată. Fără ele panotajul nu se poate îngheța.

---

## 9. Tehnologie, găzduire, siguranța datelor — PROPUS

- **Un singur limbaj pe tot proiectul: TypeScript** (Node pentru server; aplicație web pentru PC și telefon, instalabilă ca aplicație pe telefon — necesară pentru NOT offline). Motiv: o singură tehnologie de întreținut, foarte răspândită, potrivită pentru lucrul cu Claude Code. Alternativă, dacă se dorește externalizare ușoară la dezvoltatori locali: PHP / Laravel [DE CONFIRMAT — implicit: TypeScript].
- **Bază de date: PostgreSQL.** Migrări versionate, aditive.
- **Cod: depozit Git privat** (ex. GitHub); fiecare versiune bună este etichetată.
- **Găzduire: VPS** (Linux, Docker), domeniu propriu, HTTPS. Mini PC-ul local rămâne opțiune, dar cu responsabilitatea curentului, internetului și expunerii.
- **Backup**: zilnic, automat (export bază de date + fișiere), pe un al doilea loc, separat de VPS; păstrare 30 de zile + una lunară timp de 12 luni; **test de restaurare** la punerea în funcțiune și apoi trimestrial. Export manual „descarcă tot" din ADM, oricând.
- **PDF**: generat din șabloane HTML — același mecanism pentru ofertă și tabel factură.
- **Prototipul v4.1**: logica se portează în MOT și se verifică prin ETALON; ofertele făcute în prototip se pot exporta și importa dacă se dorește păstrarea lor.

---

## 10. Procesul de lucru — PROPUS (de aprobat acum)

- **Faza 0 — ARH** (acum, în chat, fără costuri): secțiunile 1–11 revizuite în ordine, câte una pe sesiune; la final ARH v1.0 APROBAT.
- **Faza 1 — Pregătire** (o singură dată): calculator cu Claude Code; depozit Git; Ionuț pregătește ofertele etalon, listele Bilka curente și lista de culori.
- **Faza 2 — Construcție**, în ordinea din §7. Fiecare sesiune: un singur obiectiv; începe cu ARH + fișierele relevante; se termină cu teste verzi și versiune salvată. Ionuț testează pe oferte reale doar după ce testele automate trec.
- **Faza 3 — Punere în funcțiune**: VPS, domeniu, backup, restaurare de probă, conturi.
- Format de cerere: *Modul · Tip (BUG / MODIFICARE / NOU) · Acum · Corect ar fi · Exemplu cu cifre · Nu se atinge*.
- Când ceva se strică: se revine la versiunea anterioară (Git) și se corectează pornind de acolo; nu se cârpește peste cârpeală.
- Conversațiile lungi se evită; o sesiune = un obiectiv.

---

## 11. Scurtături permise și zone fără scurtături — PROPUS (de aprobat acum)

**Permise** (același rezultat, mai puțină muncă):

- componente gata făcute pentru autentificare, generare PDF, migrări, interfață — nu se scriu de la zero;
- backup prin snapshot-urile furnizorului de VPS **plus** exportul zilnic propriu;
- import doar din CSV canonic; conversia PDF / Excel → CSV o face Claude în conversație, până când merită un adaptor;
- valorile așteptate ale ofertelor etalon se iau din rezultatele deja validate ale v4.1, nu se recalculează de mână;
- logica v4.1 se portează, nu se reinventează;
- interfața pornește simplă și funcțională; cosmetizarea vine după ce MOT e înghețat.

**Fără scurtături:**

- modelul de date și migrările;
- versionarea listelor de preț și snapshot-ul ofertelor;
- testele MOT înainte de orice interfață peste el;
- backup verificat prin restaurare reală;
- permisiunile pe server;
- Git de la prima linie de cod.

---

## 12. Întrebări deschise — răspuns doar unde valoarea implicită e greșită

1. Roluri: Administrator / Director zonal / Agent / Colaborator; fără rol separat de birou.
2. Agentul nu vede prețul de achiziție; vede pragul minim de vânzare și ținta.
3. Directorul zonal vede și poate prelua ofertele agenților din zona lui.
4. Clienții se deduplică după telefon; agentul vede doar clienții lui; administratorul, pe toți.
5. Numerotarea ofertelor: per firmă și an.
6. Aceeași culoare, același preț în cadrul unui finisaj; suplimente posibile ca excepție.
7. Cursul BNR se îngheață la crearea ofertei, se poate reîmprospăta manual cât e „În lucru" și se blochează la „Acceptată".
8. Formula de achiziție: preț listă × 1,01 × curs BNR × 1,01.
9. Stocul propriu se modelează ca furnizor, per firmă.
10. Tehnologie: TypeScript + PostgreSQL + VPS.

---

## 13. Istoric

- v0.1 — 02.09.2026 — schiță completă a fundației; secțiunile 1, 2, 10 și 11 propuse spre aprobare imediată; §3–§9 se revizuiesc câte una pe sesiune.
- v0.2 — 03.09.2026 — adăugate modulele SCH / GEO / PAN (glosar, entități, reguli de completat, ordinea construcției, etalon).
