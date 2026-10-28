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

### 4.1 Configurare (ADM / CAT / LP) — ÎNGHEȚAT (22.10.2026, `v0.1-fundatie`)

*Construit și acoperit de teste (migrările 1–5, testele din `server/tests/`); structura reală, mai bogată decât schița de mai jos, e cea din fișele CATALOG-PREȚURI și CONTURI (vezi §13). Se schimbă doar prin cerere explicită de tip MODIFICARE: întâi testul, apoi codul, apoi migrare aditivă.*


- **Furnizor**: denumire; moneda listei (EUR); profil de calcul (parametri: adaos achiziție %, marjă curs %, divizori ml→buc, suprapunere la rupere, praguri de pantă, lungime maximă foaie); activ. „Stoc propriu" se modelează tot ca furnizor, per firmă [DE CONFIRMAT].
- **Categorie de produs**: denumire; ordinea în ofertă; zonă (A = produse; B = lemn / feronerie / manoperă, pass-through); adaos țintă implicit % [de completat].
- **Produs**: cod intern (al nostru, stabil); cod furnizor; furnizor; categorie; denumire; unitate de vânzare (mp / ml / buc / set); **tip de calcul** (mp din panelare · ml→buc cu divizor · buc direct · procent din valoare · pass-through); parametri (lățime totală, lățime utilă, divizor ml→buc, lungime maximă); grosime; finisaj; lista de culori disponibile; activ; ordine.
- **Culoare**: cod; denumire; finisajele în care există; supliment de preț opțional [DE CONFIRMAT — implicit: aceeași culoare, același preț în cadrul unui finisaj].
- **Listă de preț (versiune)**: furnizor; denumire (ex. „Bilka v11"); valabilă de la; sursă (fișier / observație); status (schiță / activă / arhivată); creată de; data. O singură listă activă per furnizor la un moment dat; cele vechi nu se șterg niciodată.
- **Preț de listă**: listă de preț; produs; preț listă (EUR, fără TVA); observație.
- **Setări**: TVA %; sursa cursului (BNR); alte constante.

### 4.2 Persoane și firme (CON) — ÎNGHEȚAT (22.10.2026, `v0.1-fundatie`)

*Firmele și utilizatorii (cele șase roluri din FISA-CONTURI) sunt construite și acoperite de teste; clientul vine odată cu ofertele (Etapa 3). Se schimbă doar prin cerere explicită de tip MODIFICARE: întâi testul, apoi codul, apoi migrare aditivă.*


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

## 5. Reguli de calcul (MOT) — ÎNGHEȚAT (28.10.2026, `v0.2-motor`)

*Construit și acoperit de teste: motorul pur din `server/src/modules/mot/` (fără bază de date, HTTP sau interfață), cele 11 oferte-model din `docs/ETALON.md` v1.3 (`docs/etalon/E01–E11.json`, toate la zero prin `npm run test:etalon`) și testele unitare din `server/tests/mot-*.test.ts`. Sursa regulilor: FISA-OFERTARE v1.1 (cap. 2b, 3, 5, 8, 9, 11, 13.2, 13.5, 19), FISA-CONTURI §7 și ETALON §0 (R1–R8). Se schimbă doar prin cerere explicită de tip MODIFICARE: întâi testul (etalonul sau testul unitar), apoi codul. Regulile de mai jos sunt scrise ca reguli, cu trimitere la capitolul care le decide și la exemplul etalon care le probează.*

### 5.1 Bani și rotunjiri
- Toate sumele circulă ca **text zecimal** („6.86”), niciodată ca număr binar; aritmetica e zecimală (decimal.js), cu rotunjire **half-up** (0,005 → 0,01; la negative, departe de zero). *FISA 3.6; `mot/zecimal.ts`, testele `mot-zecimal`.*
- Prețuri și valori la **2 zecimale**; cantități mp / ml la **3 zecimale**, la bucată întregi; cursuri la **4 zecimale**; prețul unitar din tabelul de facturare la **4 zecimale** (lei). *FISA 3.6, 13.5.*
- Totalurile sunt **sume ale valorilor rotunjite pe linie** (preț × cantitate, 2 zecimale), nu sume exacte rotunjite la final — aritmetica documentului se verifică linie cu linie. *ETALON R2 (S9).*

### 5.2 Două cursuri, înghețate pe ofertă (R1)
- **Cursul documentului** = cursul BNR al zilei (4 zecimale): la el se afișează prețurile în euro și „Total în lei”. Până la publicarea BNR (13:00) cursul zilei e cel din ziua precedentă. *FISA 11.8.*
- **Cursul de achiziție** = BNR × 1,01, 4 zecimale (practica Bilka, verificată pe 21 de facturi — `docs/VERIFICARE-FACTURI-BILKA.md` §2): la el se calculează achiziția contului. *E01: 5,3485 → 5,4020.*
- Amândouă se îngheață la crearea ofertei și se pot reîmprospăta manual cât e „În lucru”. Preluarea automată a cursului vine în Etapa 3; până atunci se introduce manual.

### 5.3 Cantitățile (R8)
- **Învelitori**: mp = Σ(lungime × bucăți) × lățimea totală, **o singură rotunjire, la final, la 3 zecimale**; coli = Σ bucăți; suprafață directă (mp introdus) și combinată (direct + panotaj, adunate). Lățimea totală vine din catalog; la tabla plană la mp o dă apelantul (1,25 m, din varianta „1,25 × 2,00 m”); coala de tablă plană e produs la bucată. *FISA 3.2; E01 180,481 mp, E11 189,120 și 30,406.*
- **Comandabil**: o ofertă poate trece în „Comandat” doar când fiecare învelitoare e integral în lungimi × bucăți; motivul se dă pe fiecare învelitoare. Fără învelitori → nimic nu blochează. *FISA 3.2; E06, E10.*
- **Dripstop**: avertizare per învelitoare la T18 / T35 / T45 cu opțiunea „dripstop” sub 40 mp. *FISA 3.2.*
- **Accesorii speciale la lungimi**: ml = Σ(lungime × bucăți), 3 zecimale. *FISA cap. 5; E03.*
- **Șipca de gard**: varianta Comandă — ml = Σ(lungime × bucăți); varianta Calcul — bucăți = tronson (mm) ÷ (lățimea șipcii din catalog + distanța), **rotunjit în sus**, ml = bucăți × lungimea șipcii; totaluri pe rubrică. *FISA cap. 8; E06: 94 + 6 = 100 buc, 120,000 ml.*
- **Accesoriile sunt strict la bucată**, cantități manuale, fără calcule (conversia ml → buc cu divizori a fost abandonată pe 04.09.2026). *FISA cap. 4–7.*
- Intrările imposibile (cantitate / lungime / lățime / tronson ≤ 0, bucăți < 1, distanță negativă, învelitoare fără panotaj și fără mp) sunt refuzate la validare, fără rezultat.

### 5.4 Pachete și formulare Bilka
- Un **pachet** = o învelitoare + liniile legate de ea (tinichigerie standard și specială de 2 m, fixare și etanșare), care moștenesc cheia ei (finisaj + grosime + culoare). Secundara cu aceeași cheie, sau cu altă cheie dar fără accesorii proprii, rămâne în pachetul principalei (intră ca secundară pe formular); altă cheie **și** accesorii proprii → pachet separat. *FISA 3.3–3.4; E11.*
- **Pluvialul**: un grup și un formular per finisaj + culoare, în ordinea apariției. **Secțiunile de sine stătătoare** (linii cu cheie proprie, fără învelitoare — completări, comenzi doar de accesorii) → formular fără învelitoare, unul per cheie. Accesoriile la lungimi au foaia lor, șipca blocul ei; zona B nu intră. *FISA 3.5, 3.8.*
- Împachetarea o decide softul; agentul vede „Se vor genera N formulare Bilka: 1) …” și de ce. Numele pachetelor se derivă din catalog (familia fără prefixul grupului și fără paranteze + numărul RAL + finisajul), fără liste de prescurtări în cod. *E11: „P1 — Clasic 8017 mat”, „P2 — Retro Plus 7016 mat”, „Pluvial A — mat 8017”.*

### 5.5 Cele trei straturi de preț (R2–R4)
1. **Achiziția contului** = prețul de bază din catalog × (1 + adaosul % al contului) × (1 + grupa %), **rotunjit la 2 zecimale în EUR**. **Achiziția reală** = fără grupă, păstrată separat: pe ea stau garda și costul din vânzări. Agentul o vede **în lei, cu TVA**: achiziție × curs de achiziție × 1,21, **o singură rotunjire** (6,31 → 41,24, nu 41,25). Grupa e instrumentul agentului, ascuns doar față de client; nu apare pe documente și nu intră în costul din vânzări. *FISA-CONTURI §7; FISA 11.2, 11.3; E01, E03 (colaborator 5 %), E05 (grupă 5 %).*
2. **Ținta și marja se calculează în lei**: achiziția totală în lei = Σ valori (EUR) × curs de achiziție × 1,21, pas cu pas; ținta = suma discutată cu TVA **sau** achiziția × (1 + adaos %); marja = ținta − achiziția; adaosul real = ținta ÷ achiziția − 1 (afișat cu 2 zecimale, păstrat cu 4 pentru variante). Adaos țintă implicit 20 % (uzual 20–25 %), fără plafon pe categorii. *FISA 11.2; E01 17.000 lei → 18,57 %, E02 20 %, E05 2 %.*
3. **Documentul în euro**, la cursul documentului, pornește de la lei-ul fără TVA: ținta fără TVA (lei) = ținta ÷ 1,21, 2 zecimale; total fără TVA (EUR) = ÷ curs BNR, 2 zecimale; TVA (EUR) = fără TVA × 21 %, 2 zecimale; cu TVA = suma lor. (Citirea „cu TVA = ținta ÷ curs” ar da la E11 un ban în plus.) TVA-ul e o setare generală aplicată la totaluri; liniile sunt fără TVA. *FISA 11.8, 13.2; ETALON R4; E01 2.626,83 + 551,63 = 3.178,46.*

### 5.6 Prezentarea, prețurile fixe, restul de rotunjire (R5)
- **Simplu**: liniile libere primesc preț = achiziția contului × coeficient, coeficient = (total fără TVA − valoarea liniilor fixe) ÷ achiziția liniilor libere. *FISA 11.4; E01.*
- **Listă + discount general**: pe document prețuri de listă (ancoră) și un singur discount la total; totalul de listă L e cel pentru care L − round(L × d) = totalul net (căutat în jurul lui net ÷ (1 − d)); prețurile de listă pe linii prin același coeficient către L; garda și netul = listă × (1 − d). Discount afișat uzual 25–30 %. *FISA 11.4; E04.*
- **Discount per linie**: netul din calculul invers către țintă; discountul e doar ancoră (listă = net ÷ (1 − d)); excepțiile schimbă ancora pe produs; prețul fix are discount 0 (afară de un discount purtat explicit, de exemplu preluat din altă ofertă). *FISA 11.4; E08.*
- **Prețuri fixe**: pe orice linie, în EUR fără TVA (normalizat) sau „achiziție reală + x %” (de la achiziția reală adusă la cursul documentului: E02 6,86 → 6,93 → 7,28); linia fixă iese din calcul și rămâne cum a fost scrisă, restul liniilor absorb diferența până la țintă, fără plafon pe categorii. *FISA 11.5; E02 (țigla +5 %), E08 (set coș 24,00).*
- **Restul de rotunjire**: ±0,01 EUR/unitate pe liniile libere **la bucată** (buc, cutie, rolă — niciodată mp / ml), alese descrescător după cantitate (la egalitate, în ordinea din ofertă) astfel încât suma cantităților alese = restul în cenți; apoi, pe linia cu cantitatea cea mai mică, câți cenți întregi pe unitate mai încap; ce nu încape rămâne **abatere**, cu avertizare pentru agent, iar totalurile documentului se recalculează din linii (TVA din net). *ETALON R5; E01 1,14 → 56 + 50 + 8; E06 abatere −0,01.*

### 5.7 Totalul în lei, garda, vânzările (R6, R7, cap. 19)
- **Total în lei pe ofertă**: ținta = sumă și liniile ating exact totalul → **suma discutată, exact** (total EUR × curs poate diferi cu 1–3 bani — acceptat; tabelul de facturare în lei, cu prețuri unitare la 4 zecimale, reproduce exact totalul); ținta = sumă cu abatere → „cât iese” din linii; ținta = adaos % sau preluată → total EUR × curs, cu bani. *FISA 11.8; E01 17.000,00, E06 999,96, E02 17.205,32.*
- **Total în lei pe factură** (cu zona B preluată): totalul în lei al ofertei + liniile preluate în lei cu TVA, așa cum au fost scrise sau desfăcute — lei-ul e ce plătește clientul; totalul EUR al facturii × curs poate diferi cu câțiva bani, aceeași logică. *FISA 13.5; ETALON R6 (S10); E07 19.238,50.*
- **Garda**: niciun preț net de pe document sub achiziția reală a contului (fără grupă) adusă la cursul documentului (achiziție reală × curs achiziție ÷ curs BNR, 2 zecimale); egal e permis; liniile sub prag se listează și oferta nu se poate salva. Singura excepție: **completarea marcată** (5.8). La modul listă garda e pe net. *FISA 11.6; E02, E04, E10.*
- **Vânzările (Agent / Administrator)**: preț vânzare = totalul în lei al documentului (materiale, fără zona B); cost = achiziția reală cu TVA (grupa nu intră); adaos net = diferența; adaos brut = net ÷ 1,21. *FISA cap. 19; E01, E05, E06.*
- **Colaboratorul** nu are tabel de vânzări: vânzarea firmei către el apare în tabelul Administratorului — preț vânzare = achiziția colaboratorului cu TVA, cost = prețul de bază × curs achiziție × 1,21 (sume pe linii), net, brut; oferta lui către clientul final nu intră în vânzările firmei. *FISA cap. 19 (23.10.2026); E03.*

### 5.8 Zona B, completarea și lucrarea, varianta, preluarea
- **Zona B** (cap. 9): linii integral manuale — denumire, UM, cantitate, sumă în lei, „conține TVA” și „preia în factură” separate pe linie. Pe ofertă: „Supliment la ofertă”, anexă în lei cum a fost scris, cu total, doar dacă există linii. În tabelul de facturare doar liniile bifate: lei fără TVA (sumă ÷ 1,21 dacă conține TVA), preț unitar = sumă ÷ cantitate (4 zecimale), EUR la cursul documentului; factura = liniile ofertei + cele preluate, TVA din net. Nimic din zona B în vânzări; totalul documentului de ofertă rămâne pe materiale. *E07.*
- **Completarea** (cap. 2b, 11.6): ofertă cu număr propriu, legată de oferta inițială (seria-numărul ei) și cu motiv; garda nu se aplică, prețurile pot fi 0 (adaos −100 %). **Lucrarea** = oferta inițială + completările ei: în tabelul de vânzări apar una sub alta, iar vânzarea, costul, adaosul net și brut se calculează pe lucrare, din sume. *E10: 17.000 · 14.539,82 · 2.460,18 · 2.033,21.*
- **Varianta** (cap. 11.7): aceeași ofertă, același număr, cu alte produse (alt model / finisaj / grosime; accesoriile legate urmează cheia învelitorii, deci se înlocuiesc și ele — înlocuirile vin din catalog, de la apelant); cursurile, contul, grupa, modul și cantitățile rămân; ținta = **adaosul real al bazei, procent cu 4 zecimale**, aplicat pe noile achiziții. Variantele sunt versiuni în istoricul ofertei. *E09 din E01: 18,5680 % → 20.972,64 lei.*
- **„Preia prețuri din oferta …”** (cap. 11.11): ținta devine **„preluată”** (fără câmp de țintă — totalul rezultă din cantități, ținta și marja se deduc din linii); produsele comune primesc preț fix = prețul net unitar al sursei, cu modul de prezentare, discountul afișat și discountul pe linie ale sursei; produsele necomune primesc achiziția contului × adaosul rubricii lor din sursă (Σ net × cant ÷ Σ achiziție × cant pe rubrică; fără rubrică în sursă, adaosul global); un preț fix pus de agent înainte rămâne; **renunțarea la preluare** scoate doar prețurile preluate și redă ținta. *Test propriu (`mot-s10`): E01 cu jumătate din cantități + coamă mare.*

### 5.9 Harta motorului (`server/src/modules/mot/`) — ce apelează Etapa 3
| Funcție / tip | Rol |
|---|---|
| `calculeazaOferta(intrare: IntrareOferta): RezultatOferta` | motorul complet: validare, cantități, pachete, achiziție, țintă, document, prezentare, gardă, vânzări, zona B; pur, determinist |
| `IntrareOferta` (`tipuri.ts`, schema zod `schemaIntrareOferta`) | oferta ca date: cursul BNR, TVA, cont (tip + adaos %), grupă, țintă (sumă / adaos % / adaos păstrat / preluată), mod de prezentare și discounturi, completare (legătură + motiv), învelitori cu panotaj sau mp, șipcă, linii (produs cu prețul de bază, cantitate, poziții, învelitoarea sau cheia de culoare, preț fix, discount), zona B |
| `RezultatOferta` | cursul de achiziție, cantitățile derivate, comandabil, liniile calculate (achiziție cont / reală / în lei, preț document, listă, discount, net, valoare, gardă, pachet), totaluri, rândul de vânzări (cu tabelul), abatere, gardă, zona B (supliment + tabel de facturare), pachete, formulare și textul lor, avertizări |
| `agregaLucrare(initiala, completari[], tvaPct): RandVanzari` | rândul de vânzări pe lucrare (oferta inițială + completări) |
| `construiesteVarianta(baza, rezultatBaza, inlocuiri): IntrareOferta` | intrarea variantei cu produsele înlocuite și adaosul bazei păstrat; `liniiLegateDeInvelitoare` spune ce urmează cheia |
| `preiaPreturi(noua, sursa, rezultatSursa, idSursa): IntrareOferta` · `renuntaLaPreluare(intrare, tinta)` | preluarea prețurilor din altă ofertă și renunțarea la ea; `adaosuriPeRubrica` dă adaosurile sursei |
| `construiesteIntrare(fisierEtalon, catalog)` (`etalon.ts`) | maparea unei oferte-model în intrare, cu catalogul dat de apelant (CSV în teste, baza de date în ecranul de probă) |
| `zecimal.ts` (`rotunjeste`, `cursAchizitie`, `eurInLei`, `leiInEur`, `desparteTva`, `formateazaCantitate`) | aritmetica zecimală comună; orice sumă nouă în aplicație trece pe aici |
| `/api/mot` (`routes.ts`, doar Admin general) | ecranul tehnic „Calcul de probă”: produse cu prețul activ, etaloane din bază, calcul; nu salvează nimic |


### Date de completat de Ionuț (configurare — nu blochează fundația) *(în afara motorului înghețat: configurare, respectiv PAN pentru Etapa 8)*

Culorile disponibile per model / grosime · adaosul țintă implicit per categorie · lămurirea 6,54 € vs 6,46 € la Clasic Mat 0,50 · pragurile de pantă pentru avertizări la îmbinări · lungimea maximă a foii · textul legal pentru zona B · stadiile comenzilor · schema de comision a agenților · listele predefinite pentru acoperiș plat (Retropanel / fălțuită).

### Reguli de panotaj (PAN) — de completat de Ionuț înainte de Etapa 8

Pentru fiecare model: modulul de lungime al țiglei; prelungirea la streașină; lungimea maximă și lungimea minimă utilă a unei coli; marginea de la care se pornește; dacă și cum se refolosesc piesele rămase din tăieturile oblice (schema „o coală, două ape"); orientarea profilului. Regulile vin din felul în care lucrează montatorii, nu din calcul.

Gramatica acoperișurilor acceptate în v1: contur rectiliniu; o singură pantă pe apă; coame înclinate și dolii la orice unghi; fără lucarne (se desenează ca secțiune separată). Orice altceva merge pe fluxul manual existent.

---

## 6. Zona tehnică (ADM) și actualizarea prețurilor — ÎNGHEȚAT (22.10.2026, `v0.1-fundatie`)

*Construit în S3–S5 și acoperit de teste: catalogul, listele de preț cu versiuni, importul CSV cu ecran de diferențe, firmele, utilizatorii, exportul „descarcă tot” cu restaurare. Calea „în masă” (pct. 2) nu e construită încă — intră la prima cerere NOU. Se schimbă doar prin cerere explicită de tip MODIFICARE: întâi testul, apoi codul.*


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
- 16.10.2026 — Etapa 1, sesiunea S2: baza de date s-a construit după FISA-CONTURI și FISA-CATALOG-PRETURI (ambele ÎNCHISE), nu după ARH §3 / §4.1, acolo unde diferă — fișele au prioritate. §3 și §4 rămân nescrise, ca document istoric; detaliul real e în fișe. Diferențele principale: (1) rolurile sunt șase (Admin general · Administrator · Agent · Colaborator · Contabilitate · Gestiune), nu patru — „Director zonal" din §3 nu mai există; (2) catalogul e organizat pe compartimente per furnizor (Bilka, Novatik, Metigla, Fakro, Velux, Stoc), fiecare cu moneda, modul de preț și formatul lui de import, cu rubricile de ofertă comune peste compartimente și produsele grupate pe grup / familie — mai bogat decât Furnizor / Categorie / Produs din §4.1.
- 19.10.2026 — Etapa 1, sesiunea S3: (1) **Codul intern al produsului se generează determinist** — `COD_SCURT_COMPARTIMENT-` + primele 10 caractere din SHA-256 peste (cod furnizor normalizat, denumire normalizată). Aceeași regulă la introducerea manuală (când câmpul e lăsat gol) și la importul din S4, ca un reimport să regăsească aceleași produse; „un cod, două produse" dă coduri interne diferite pentru că denumirea diferă. Pentru asta Compartimentul a primit câmpul `codScurt` (2–6 litere/cifre, unic, stabil; ex. BIL), separat de denumire. (2) Tabelele de referință (variante de profil, culori finisaj × grosime, garanții, liste implicite pe rubrică, trepte D) sunt tabele independente care copiază coloanele CSV, cu `activ` pe fiecare — nimic nu se șterge, o intrare greșită se dezactivează și iese din cascadă; legarea strictă de Produs / Grup / Familie se face la import (S4). (3) Excepțiile de culoare de pe produs (`culoriDisponibile`) au prioritate față de tabelul general finisaj × grosime (REGULI-CULORI-BILKA §1.3). (4) Orice adăugare / modificare din ecranele de catalog scrie în jurnal câte un rând per câmp schimbat, cu valoarea dinainte și după și cu numele persoanei la momentul acțiunii.
- 19.10.2026 (după S3) — Tipar de ecran (FISA-OFERTARE, Capitolul 0, pct. 10): nicio explicație permanentă în pagină; toate textele explicative într-o singură secțiune „Ajutor pentru această pagină”, la final, pliată implicit; vizibile rămân doar validările și avertizările. Acces din rețeaua locală în dezvoltare: aplicația web (Vite) ascultă pe toate interfețele și face proxy `/api` către server, deci aplicația și API-ul au același origin — cookie-ul de sesiune merge de pe tabletă / telefon fără CORS; serverul are `trust proxy` pe loopback ca jurnalul de autentificări să rețină adresa reală a dispozitivului.
- 19.10.2026 — Etapa 1, sesiunea S4 (liste de preț și import): (1) **Istoricul versiunilor e liniar**: schiță → activă → arhivată (sau schiță → anulată); o versiune arhivată nu se modifică și **nu redevine niciodată activă** — revenirea la prețuri vechi = reimportul fișierelor acelei versiuni ca versiune nouă. Imutabilitatea e impusă în baza de date (trigger pe `lista_pret` și `pret_lista_produs`), nu doar în ecran. (2) **Importul e în trei pași**: analiză (nimic scris; propunerea și fișierele brute se păstrează — pe disc, în folderul de date al serverului), confirmare (o singură tranzacție; versiunea rezultă ca schiță), activare. Erorile (rubrică necunoscută, același cod intern de două ori, preț / UM necitibile, coloane lipsă, set incomplet) blochează confirmarea; avertizările (numărători diferite față de versiunea anterioară) nu. (3) **Set complet**: o versiune de prețuri se creează numai dacă sunt încărcate toate listele de produse ale versiunii active; tabelele de referință se pot încărca și singure. (4) **Identitatea produsului** la import = codul intern (din cod furnizor + denumire); o redenumire (dispărut + nou pe același cod furnizor, rubrică și UM, 1-la-1) păstrează produsul și istoricul și schimbă denumirea **și codul intern**, cu jurnal; dispărutele devin inactive, reapărutele redevin active. Tabla plană = două produse pe același cod (mp / coală de 2,5 mp). (5) Prețurile stau numai în versiuni (`pret_lista_produs`); prețul manual (Stoc, corecții) intră în versiunea activă, cu jurnal — la nevoie se creează automat „Prețuri manuale”. (6) Garanțiile pe finisaj × grosime acceptă rânduri fără grosime (pluvialul se potrivește pe finisaj) și fără garanție la culoare (= fără garanție, nu zero). (7) **Testele nu rulează niciodată pe baza de dezvoltare**: doar pe o bază / schemă cu „test" în nume (`DATABASE_URL_TEST`), golită la pornire; importatorul se alege după `compartiment.formatImport` (azi: `bilka-v1`).
- 22.10.2026 — Etapa 1, sesiunea S5 (firme, utilizatori, export): (1) **Conturile**: Admin general e unic și se creează doar la instalare (seed), nu din ecran; contul de rezervă (`ADMIN_REZERVA_EMAIL`) apare marcat și nu se modifică / dezactivează din ecran. Administratorul vede și administrează doar Agenții / Colaboratorii firmei lui și adaosul propriu; Agent / Colaborator / Contabilitate / Gestiune n-au acces la Zona tehnică (403 pe server) și nu primesc adaosul % în niciun răspuns. Parola inițială o pune cine creează sau resetează contul (minim 10 caractere) și **se schimbă obligatoriu la prima conectare**. Blocare temporară: 5 încercări greșite consecutive → 15 minute. Conturile și firmele se dezactivează, nu se șterg; o firmă nu se dezactivează cât are utilizatori activi. Orice câmp modificat la firmă sau utilizator = rând de jurnal cu dinainte / după; parolele = rând fără valori. (2) **Sigla** firmei se păstrează în folderul de date al serverului, sub id-ul firmei (fără diacritice / spații în numele fișierului). (3) **Export „descarcă tot"**: ZIP cu câte un CSV per tabel (coloanele din schema Prisma, deci un tabel nou intră automat când e adăugat în listă), tot folderul de date (sigle + fișierele brute ale importurilor), hash-urile parolelor separat în `_sistem/parole.csv` (nu parole; doar pentru restaurare) și README cu data, versiunea formatului, versiunea softului și numărătorile. **Restaurarea** e comandă tehnică (`npm run restore -- <zip>`), numai pe o bază goală cu migrările aplicate; acceptă exporturi din aceeași versiune a formatului sau mai vechi (coloanele noi primesc valorile implicite), refuză unul mai nou; păstrează id-urile. În Etapa 1 exportul e doar pentru Admin general; **exportul pentru Administratori vine odată cu ofertele (Etapa 3) și va fi fără `_sistem/parole.csv`**. (4) Pornirea cu dublu-clic: `pornire.cmd` în rădăcina proiectului, fără drepturi de administrator (verifică serviciul PostgreSQL, pornește serverul și interfața în două ferestre, deschide browserul; nu pornește de două ori).
- 22.10.2026 — Etapa 1, sesiunea S6 (verificare și înghețare, eticheta `v0.1-fundatie`): **§4.1, §4.2 și §6 trec în ÎNGHEȚAT** — se schimbă doar prin cerere explicită de tip MODIFICARE: întâi testul, apoi codul (migrări aditive). Lista de acceptare e în `docs/ACCEPTARE-ETAPA-1.md` (Code completează doar coloana Status la rândurile lui). Constatări din acceptare: niciun secret în depozit sau în istoricul git; exportul real restaurat pe o schemă goală dă aceleași numărători și valori (diferența de un rând la jurnal = rândul pe care exportul îl scrie despre sine după ce ZIP-ul e gata — așteptat); BUG găsit și reparat la E2: coloana `randuri` a propunerilor de import nu se exportă, dar e obligatorie — la restaurare primește o valoare goală marcată „restaurat”, iar o asemenea propunere nu se mai poate confirma. Rămân deschise după Etapa 1: căile absolute din `fisiere` (propuneri și versiuni) — informative, de trecut pe căi relative la folderul de date printr-o cerere MODIFICARE înainte de mutarea pe VPS.
- 27.10.2026 — Etapa 2, sesiunea S7 (fundația motorului de calcul, etalonul ca teste): (1) **Prioritatea surselor**: FISA-OFERTARE v1.1 (cap. 3, 8, 9, 11, 13.2, 19, 2b) și `docs/ETALON.md` v1.0 (R1–R8, E01–E11 aprobate) au prioritate peste §5 acolo unde diferă; §5 se rescrie la S11, când toate ofertele etalon sunt verzi. Diferențele față de §5: (a) **două cursuri** înghețate pe ofertă — cursul documentului = BNR al zilei (4 zecimale), cursul de achiziție = BNR × 1,01 (4 zecimale) — în loc de „preț + 1 % la curs + 1 % [de confirmat]”; (b) **achiziția contului** = bază × (1 + adaos cont) × (1 + grupă), **rotunjită la 2 zecimale în EUR**, afișată agentului în lei cu TVA la cursul de achiziție; (c) **ținta și marja se calculează în lei** (achiziția la cursul de achiziție, ținta cum e discutată), euro-ul de pe document e prezentare; (d) **restul de rotunjire** (R5) se repartizează +0,01 EUR/unitate doar pe liniile libere la bucată, iar ce nu încape în cenți întregi rămâne **abatere** (E06); (e) **totalul în lei** (R6) depinde de tipul țintei: sumă atinsă exact → suma discutată; sumă cu abatere → „cât iese” din linii; adaos % → cât iese; (f) **colaboratorul**: vânzarea firmei = achiziția lui, costul = prețul de bază (cap. 19), oferta lui către clientul final nu intră în vânzări; (g) **zona B**: linii integral manuale (denumire, UM, cantitate, sumă în lei), cu „conține TVA” și „preia în factură” separate pe linie, fără text legal predefinit; (h) **ml → buc (divizorii 1,85 / 1,80 / 1,90 din §5) — abandonat pe 04.09.2026** (decizie, nu întrebare): accesoriile sunt strict la bucată, cantități manuale, fără calcule (FISA-OFERTARE cap. 4–7); singurul calcul de cantitate din oferta clasică e la șipcă (cap. 8), pe lângă mp din panotaj. (2) **Structura MOT** (`server/src/modules/mot/`): funcții pure, fără bază de date, HTTP sau interfață — `zecimal.ts` (aritmetică), `tipuri.ts` (intrarea = oferta ca date: cont, cursuri, TVA, grupă, țintă, mod de prezentare, învelitori cu panotaj sau mp, linii cu cantități / preț fix / discount / legătura cu învelitoarea sau cheia de culoare, șipcă, zona B; ieșirea = linii calculate, totaluri, rândul de vânzări, abatere, gardă, zona B, pachete, formulare Bilka, cantități derivate; validare zod), `calcul.ts` (`calculeazaOferta`, în S7 schelet: validare, curs de achiziție, cantități declarate, baza din catalog, restul „0.00”). (3) **Aritmetica**: decimal.js 10.6.0 (fixat), rotunjire half-up (0,005 → 0,01; la negative departe de zero), 2 zecimale prețuri / valori, 3 cantități mp / ml, 4 cursuri; toate sumele circulă ca text, niciodată ca număr binar; TVA-ul se desface din totalul cu TVA astfel încât fără TVA + TVA = cu TVA exact (R4). (4) **Etalonul ca teste**: încărcătorul (`server/tests/etalon/`) citește `docs/etalon/E*.json` (format v1.1) și ia **prețurile de bază și lățimile din CSV-urile catalogului** (`docs/import/Bilka/`), pe cod Bilka + denumire exactă (același cod are mai multe denumiri — BANDAETAT35 „coamă” / „streașină”), cu coala de tablă plană derivată ca la import; blocul „asteptat” se compară cifră cu cifră, ca text, cu un raport al tuturor diferențelor pe cale. Fișierele etalon și ETALON.md sunt scrise de Claude chat și nu se modifică din Code. (5) **Două comenzi de test**: `npm test` (suita cu bază de date, verde, include rotunjirile și încărcarea etalonului) și `npm run test:etalon` (cele 11 oferte-model, fără bază de date, roșii până la S11); `npm run test:toate` le rulează pe amândouă.
- 27.10.2026 — Etapa 2, sesiunea S8 (cantitățile și structura ofertei în MOT): (1) **Cantități** (`server/src/modules/mot/cantitati.ts`, FISA-OFERTARE 3.2 / 3.6 / cap. 5 / cap. 8, ETALON R8): mp = Σ(lungime × bucăți) × lățimea totală, **o singură rotunjire, la final, la 3 zecimale half-up**; coli = Σ bucăți; suprafață directă și combinată (mp direct + panotaj); accesorii la lungimi ml = Σ(lungime × bucăți), 3 zecimale; șipcă — Comandă: ml = Σ(lungime × bucăți); Calcul: bucăți = tronson (mm) ÷ (lățimea șipcii + distanța), rotunjit în sus, ml = bucăți × lungimea șipcii; linia învelitorii, a accesoriului cu poziții și a șipcii primește cantitatea calculată, nu cea declarată; la bucată întregi, mp / ml cu 3 zecimale, UM normalizată (M2 → mp, BUC → buc, ML → ml, CUTIE → cutie, ROLĂ → rolă). (2) **Lățimea totală vine din afara motorului** (catalog, dată de apelant); la tabla plană la mp catalogul n-are lățime în coloană — regula FISA 3.2 (1,25 m) o aplică apelantul, care o citește din varianta „1,25 × 2,00 m”; motorul nu are produse sau dimensiuni scrise în cod. (3) **Comandabil** (FISA 3.2): fals cât timp o învelitoare are parte în mp direct, cu motivul pe fiecare învelitoare; fără învelitori → adevărat. **Dripstop**: avertizare per învelitoare la familiile T18 / T35 / T45 cu opțiunea „dripstop” (câmpul `optiune` din catalog) sub 40 mp. (4) **Validare** (zod, în `tipuri.ts`): cantitate / lungime / lățime / tronson ≤ 0, bucăți < 1, distanță negativă, învelitoare fără panotaj și fără mp, șipcă Calcul fără tronsoane → eroare, niciun rezultat. (5) **Pachete și formulare** (`pachete.ts`, FISA 3.3–3.5, 3.8, E11): liniile legate moștenesc pachetul învelitorii lor; secundara cu aceeași cheie (finisaj + grosime + RAL) sau cu altă cheie dar fără accesorii proprii → pachetul principalei (intră ca secundară pe formular); altă cheie **și** accesorii proprii → pachet separat; pluvialul — un grup și un formular per finisaj + culoare, în ordinea apariției (Pluvial A, B…); secțiunile de sine stătătoare (linii cu cheie proprie, fără învelitoare — completări, comenzi doar de accesorii) → formular fără învelitoare, unul per cheie; accesoriile la lungimi pe foaia lor, pe primul formular; șipca în blocul ei; zona B nu intră. **Numele pachetelor se derivă din catalog**: familia fără prefixul grupului și fără paranteze + numărul RAL + finisajul („P1 — Clasic 8017 mat”, „P2 — Retro Plus 7016 mat”, „Pluvial A — mat 8017”), fără liste de prescurtări în cod. Ieșirea: `pachete[]`, `formulareBilka[]` și `textFormulare` pentru agent („Se vor genera 4 formulare Bilka: 1) …”). (6) **ml → buc** (divizorii din §5) rămâne abandonat (04.09.2026); rândul S8 din PLAN îl pomenește doar istoric. Etalon după S8: dispar diferențele de cantitate și structură (mp, ml, șipcă, comandabil, pachete, formulare); rămân doar cele de preț.
- 27.10.2026 — Etapa 2, sesiunea S9 (cele trei straturi de preț în MOT și ecranul „Calcul de probă”): (1) **Achiziția** (`server/src/modules/mot/preturi.ts`, R2): bază × (1 + adaos cont) × (1 + grupă), 2 zecimale; achiziția reală (fără grupă) păstrată separat — pe ea stau garda și costul din vânzări; **afișarea în lei cu TVA cu o singură rotunjire** (achiziție × curs achiziție × 1,21 → 2 zecimale); **totalurile = sume ale valorilor rotunjite pe linie** (achiziție × cantitate, 2 zecimale), apoi lanțul în lei rotunjit pas cu pas (× curs achiziție, × 1,21). (2) **Ținta** (R3): sumă cu TVA sau adaos % (inclusiv adaosul păstrat cu 4 zecimale la variante), pe lanțul rotunjit; marja și adaosul real în lei. (3) **Documentul în euro** (R4, formulare precizată la S9): ținta fără TVA (lei) = ținta ÷ 1,21, 2 zecimale → ÷ cursul BNR → fără TVA EUR; TVA = fără TVA × 21 %; cu TVA = suma lor — citirea literală „cu TVA = ținta ÷ curs” ar da la E11 un ban în plus. (4) **Prezentarea** (`prezentare.ts`, R5): simplu (coeficient = (țintă − fixe) ÷ achiziția liniilor libere), listă + discount general (L pentru care L − round(L × d) = net, căutat în jurul lui net ÷ (1 − d); garda pe net), discount per linie (netul din calcul invers, listă = net ÷ (1 − d), excepții pe produs, fix = discount 0); prețurile fixe în EUR fără TVA sau „achiziție reală + x %” (de la achiziția reală adusă la cursul documentului), scoase din calcul; **restul de rotunjire** ±0,01 EUR/unitate pe liniile libere la bucată (buc, cutie, rolă — niciodată mp / ml), descrescător după cantitate, la egalitate în ordinea din ofertă, cu suma cantităților = restul în cenți, apoi cenți întregi pe linia cu cantitatea cea mai mică; ce nu încape = **abatere**, cu avertizare pentru agent; totalurile documentului se recalculează din linii (TVA din net). (5) **Totalul în lei** (R6): sumă atinsă exact → suma discutată (chiar dacă EUR × curs diferă cu 1–3 bani); sumă cu abatere sau adaos % → cu TVA EUR × curs, „cât iese”. **Garda** (R7): pe fiecare linie, netul ≥ achiziția reală × curs achiziție ÷ curs BNR (2 zecimale); neaplicată la completarea marcată; lista liniilor sub achiziție în rezultat. **Vânzările** (cap. 19, Agent / Administrator): preț vânzare = totalul în lei al documentului, cost = achiziția reală cu TVA (grupa nu intră), adaos net, brut ÷ 1,21; rândul colaboratorului (vânzare = achiziția lui, cost = baza) rămâne pentru S10. TVA-ul stă la totaluri, liniile sunt fără TVA (varianta B). (6) **„Calcul de probă”** (Zona tehnică, doar Admin general): `GET /api/mot/produse?q=` (catalogul activ cu prețul din lista ACTIVA), `GET /api/mot/etaloane[/:id]` (ofertele-model construite cu prețurile din bază; maparea etalon → intrare e în `mot/etalon.ts`, comună cu testele, independentă de sursa catalogului), `POST /api/mot/proba` (motorul pur). Nimic nu se salvează; cursul BNR se introduce manual până la preluarea automată din Etapa 3. (7) Etalon după S9: E01, E02, E04, E05, E06, E08, E09, E11 la zero; E03 (vânzările colaboratorului), E07 (zona B în factură), E10 (lucrarea recalculată) rămân pe S10.
- 28.10.2026 — Etapa 2, sesiunea S10 (restul regulilor motorului; toate cele 11 oferte-model la zero): (1) **Colaboratorul** (cap. 19, E03; `preturi.ts`): la conturile de Colaborator blocul de vânzări e rândul Administratorului — preț vânzare = achiziția colaboratorului cu TVA (ce i se facturează), cost = prețul de bază × curs de achiziție × 1,21 (sume ale valorilor rotunjite pe linie), adaos net și brut ÷ 1,21; rezultatul poartă `vanzari.tabel = "administrator"`; oferta lui către clientul final nu intră în vânzările firmei. Achiziția pe linie și totalurile poartă acum și baza din catalog. (2) **Zona B** (cap. 9, 13.5, E07; `zonaB.ts`): linii integral manuale (denumire, UM, cantitate, sumă în lei, „conține TVA”, „preia în factură”, separate pe linie); suplimentul în lei cum a fost scris, cu total; în tabelul de facturare doar liniile bifate: lei fără TVA (sumă ÷ 1,21 dacă conține TVA), preț unitar = sumă ÷ cantitate la 4 zecimale, EUR = lei fără TVA ÷ cursul documentului; factura fără TVA = oferta + liniile preluate, TVA din net, cu TVA = suma; **totalul în lei al facturii = totalul în lei al ofertei + liniile preluate în lei cu TVA, așa cum au fost scrise sau desfăcute** (lei-ul e ce plătește clientul; totalul EUR al facturii × curs poate diferi cu câțiva bani — aceeași logică ca R6). Nimic din zona B în vânzări; documentul de ofertă rămâne pe materiale. (3) **Completarea și lucrarea** (cap. 2b, 11.6, E10; `lucrare.ts`): intrarea poartă `completareLa` (seria-numărul ofertei inițiale) și `motivCompletare`; completarea marcată nu e verificată de gardă și poate fi la 0; `agregaLucrare` = sumele vânzării și costului pe oferta inițială + completări, adaos net și brut ÷ 1,21 pe lucrare (E01 + E10: 17.000 · 14.539,82 · 2.460,18 · 2.033,21). (4) **Varianta** (11.7, E09; `varianta.ts`): din oferta de bază și înlocuirile de produse (cod vechi → produsul nou, date de apelant din catalog; accesoriile legate urmează cheia învelitorii, deci se înlocuiesc și ele) se construiește intrarea variantei cu învelitorile și legăturile refăcute pe codurile noi și ținta = **adaosul real al bazei, procent cu 4 zecimale** (`adaos_pct_pastrat`); E01 + înlocuirile Grande Mat reproduce E09 cifră cu cifră. (5) **„Preia prețuri din oferta …”** (11.11; `preluare.ts`): tip de țintă nou **`preluata`** — oferta nu are câmp de țintă, totalul rezultă din cantități („cât iese”), ținta, marja și adaosul real se deduc din linii; produsele comune primesc preț fix = prețul net unitar al sursei (cu modul de prezentare, discountul afișat și discountul pe linie ale sursei), marcat `preluat`; produsele necomune primesc achiziția contului × adaosul rubricii lor din sursă (Σ net × cant ÷ Σ achiziție × cant, pe rubrică; fără rubrică în sursă, adaosul global); un preț fix pus de agent înainte de preluare rămâne; renunțarea la preluare scoate doar prețurile marcate `preluat` și redă ținta. Un preț fix poate purta explicit un discount afișat (altfel discount 0). (6) Etalon: **E01–E11 la zero** (`npm run test:etalon`); ecranul „Calcul de probă” neschimbat (E03 / E07 / E10 se încarcă prin ruta existentă). Urmează S11: ARH §5 rescris după fișă și etalon → ÎNGHEȚAT, eticheta `v0.2-motor`.
- 28.10.2026 — Etapa 2, sesiunea S11 (documentare și înghețare, eticheta `v0.2-motor`): **§5 rescris** după FISA-OFERTARE v1.1 și ETALON v1.3 cu deciziile S7–S10 (5.1 bani și rotunjiri · 5.2 cele două cursuri · 5.3 cantități · 5.4 pachete și formulare · 5.5 cele trei straturi de preț · 5.6 prezentare, prețuri fixe, rest și abatere · 5.7 totalul în lei pe ofertă și pe factură, garda, vânzările pe tip de cont · 5.8 zona B, completarea și lucrarea, varianta, preluarea · 5.9 harta motorului pentru Etapa 3) și **trecut în ÎNGHEȚAT** — aceeași regulă ca §4.1 / §4.2 / §6: se schimbă doar prin cerere MODIFICARE, întâi testul (etalonul sau testul unitar), apoi codul. Scoase din §5: conversia ml → buc cu divizori (abandonată 04.09.2026) și formula „preț + 1 % la curs + 1 % [de confirmat]” (înlocuită de R1–R2). Sub-secțiunile „Date de completat de Ionuț” și „Reguli de panotaj (PAN)” rămân neatinse, în afara motorului înghețat. Fără modificări de cod; dovada: `npm test` 182 verzi, `npm run test:etalon` E01–E11 la zero. Fără verificare manuală pe „Calcul de probă” (decizia din 27.10: testele manuale încep în Etapa 3, pe ecranul de ofertă).
