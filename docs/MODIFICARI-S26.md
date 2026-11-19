# MODIFICĂRI S26 — din testarea în paralel (M5–M8)

Versiunea 1.0 · 17 noiembrie 2026 · Scris de Claude (chat) din cererile lui Ionuț (17.11, cu răspunsurile lui la cele patru decizii). Patru modificări la fișe închise (OFERTARE cap. 2, 12, 14, 16; COMENZI cap. 1, 4, 7; CONTURI §3) — fișele poartă nota de MODIFICARE care trimite aici; aici e textul complet. **Niciuna nu schimbă motorul** (§5 rămâne ÎNGHEȚAT; M5 îl apelează, nu îl modifică). Toate schimbările de bază sunt **aditive** (câmpuri noi, nimic șters, nimic migrat — decizia lui Ionuț: datele de până acum rămân cum sunt).

Împărțirea pe sesiuni: **S26a** = M6, M7 + BUG-14 (și confirmarea BUG-13) · **S26b** = M5, M8. Formatul fiecărei modificări: *Acum · Corect ar fi · Exemplu · Cum se verifică · Nu se atinge.*

---

## M5 — Ajustarea prețului de vânzare după „Comandat" (S26b)

**Acum.** „Comandat" îngheață produsele, cantitățile și prețurile (OFERTARE cap. 14). Fișa CONTURI permitea corectarea *sumelor* cu istoric, dar la construcție totalul comenzilor făcute din soft a rămas nemodificabil: cifrele comenzii și ale tabelului de vânzări vin din rezultatul salvat la „Comandat"; se pot completa sume doar la comenzile manuale.

**Corect ar fi.**
- Pe comandă, butonul **„Ajustează prețul de vânzare"** — **doar Administratorul firmei comenzii** (nu autorul ofertei, nu Admin general — el vede). Cere **suma nouă** (totalul comenzii cu TVA, în lei, ca ținta ofertei) și **motivul** (text obligatoriu — „ca să nu se uite de ce").
- Voie **cât timp comanda nu e încasată integral** (rest de încasat > 0). La rest = 0 butonul e dezactivat cu motivul alături: „Comanda e încasată integral — prețul nu se mai poate ajusta."
- **Cum se calculează**: softul rulează **motorul, neschimbat**, pe intrarea înghețată a ofertei comandate (aceleași produse, cantități, listă de preț, cursuri, cont, adaosuri, mod de prezentare, prețuri fixe), cu **ținta = suma nouă** (tipul „sumă cu TVA în lei"). Rezultă prețurile de prezentare noi pe linii, la ban, cu regulile de la ofertă; **garda rămâne**: sub achiziția contului nu se poate (409 cu suma minimă), cu excepția completărilor (cap. 2b). Rezultatul nou se salvează pe comandă ca **rezultat ajustat** (versiunea n), cu istoric: cine, când, total vechi → nou, motivul. Rezultatul de la „Comandat" rămâne (nimic șters).
- **Efecte**: totalul comenzii (lei și euro) și restul de încasat; **tabelul de vânzări** preia prețul de vânzare din blocul `vanzari` al rezultatului ajustat (costul neschimbat → adaos net / brut recalculate; lucrarea agregată la fel); **tabelul de facturare** se generează din rezultatul ajustat (liniile cu prețurile noi; totalul = suma nouă, la ban); „de încasat" pe fișa șoferului; **retururile de după ajustare** se calculează la prețurile liniilor din rezultatul ajustat curent (cele dinainte rămân cum au fost); avizul nu se schimbă (nu are valori). Asterisc roșu + „Vezi istoric" pe total (comenzi, vânzări).
- **Oferta rămâne înghețată**, neschimbată; pe pagina ofertei o notă: „Preț ajustat pe comandă la … lei (motiv), de …, la …". Comisionul recomandării și comisionul agentului nu se recalculează singure (sunt sume scrise de mână).
- Nu se pot schimba: produsele, cantitățile, prețurile pe linie direct, modul de prezentare, prețurile fixe — doar prin țintă.

**Exemplu.** Comanda din E01 (total 14.297,83 lei) → Administratorul ajustează la **14.000,00 lei**, motiv „discount acordat la livrare, plată cash": liniile se recalculează cu ținta 14.000,00; tabelul de facturare are totalul 14.000,00 la ban; dacă erau încasați 5.000,00 lei, restul devine 9.000,00; în vânzări prețul de vânzare e 14.000,00 (cost neschimbat). Încercarea la 10.000,00 lei (sub achiziție) → refuzată cu suma minimă posibilă. Comanda încasată integral → buton dezactivat cu motiv.

**Cum se verifică.** Test automat: E01 → ajustare la 14.000,00 → totalul rezultatului ajustat = 14.000,00 exact, Σ (preț linie × cantitate) = total, vânzări și rest corecte; sub achiziție → 409; rest = 0 → 409; Agent / Admin general → 403; istoricul cu motivul. Tabelul de facturare regenerat din rezultatul ajustat (PDF cu totalul nou). În browser: Administratorul face o ajustare pe o comandă de probă.

**Nu se atinge.** Motorul (`mot/`), oferta, retururile existente, avizul, comenzile manuale (au deja mecanismul lor de sume).

---

## M6 — Telefonul clientului: opțional la ofertă, obligatoriu la „Comandat" (S26a)

**Acum.** Nume, telefon și adresa lucrării obligatorii la crearea ofertei (cap. 2); telefonul normalizat e cheia de deduplicare a clienților.

**Corect ar fi.**
- La ofertă obligatorii doar **numele și adresa lucrării** (localitatea). **Telefonul e opțional**; oferta fără telefon poartă un semn discret „fără telefon" (pe pagină și în listă).
- Telefonul devine **obligatoriu la „Comandat"** (decizia lui Ionuț: la Comandat, nu la De comandat): trecerea e refuzată cu mesaj clar, sub câmp și în răspuns (regula BUG-4): „Telefonul clientului lipsește — completează-l înainte de comandă." Obligatoriu și la generarea formularului Bilka cu livrare în șantier (M7, telefonul de contact).
- **Deduplicarea rămâne pe telefon**: oferta fără telefon creează clientul fără telefon (client nou). Când telefonul se completează mai târziu și există deja un client cu același număr normalizat, softul **propune legarea** la clientul existent (oferta se mută pe el, datele scrise îi actualizează fișa, cu jurnal — regula din cap. 2); dacă agentul refuză, telefonul rămâne pe clientul nou (cu marcaj „telefon dublat" pentru Admin general, ca la clienții cu mai multe oferte). Fără telefon, căutarea clientului se face după nume; fișa clientului și istoricul funcționează la fel.

**Exemplu.** Ofertă nouă: „Popescu Ion, Câmpineanca", fără telefon → se salvează, apare „fără telefon". Trecerea la „Comandat" → refuzată cu mesajul de mai sus. După completarea „0730 000 556": dacă numărul e al lui „Ion Popescu" din bază, softul propune „Este același client? Leagă oferta de clientul existent".

**Cum se verifică.** Test API: creare fără telefon = 201; „Comandat" fără telefon = 409 cu câmpul și motivul; completarea telefonului existent → propunerea de legare; în browser: oferta nouă fără telefon, blocajul la Comandat cu mesajul sub câmp.

**Nu se atinge.** Normalizarea telefonului, fișa clientului, vizibilitatea, BUG-4.

---

## M7 — Livrarea de la Bilka: la depozit sau direct în șantier (S26a)

**Acum.** Formularul Bilka primește mereu, în antet, localitatea lucrării și telefonul clientului (S16). Logistica Bilka le preia ca adresă de livrare și livrează în șantier, deși de obicei marfa trebuie să vină la depozit.

**Corect ar fi.**
- **La trecerea în „De comandat"** (momentul în care se generează formularele; și ori de câte ori se generează un formular dacă alegerea lipsește), softul cere: **„Livrarea de la Bilka: ○ la depozitul nostru (implicit) ○ direct în șantier — livrare Bilka"**. La „șantier": **localitatea** (precompletată din adresa lucrării, editabilă, obligatorie) și **telefonul de contact** (precompletat cu telefonul clientului, editabil — poate fi al montatorului —, obligatoriu).
- Se salvează **pe ofertă** (`livrareBilka`: DEPOZIT / SANTIER, localitatea, telefonul). **În formulare**: la DEPOZIT celulele de localitate și telefon rămân **goale** (cum se completa de mână); la SANTIER se completează cu cele alese. Alegerea se poate schimba cât oferta nu e „Comandat" (formularul se regenerează).
- La „Comandat" alegerea trece **pe comandă**. Pe comandă apare **ca text vizibil**: în coloana Livrare și în caseta „Livrare și facturare" — „**Livrare Bilka — șantier: Cotești · 0787 877 989**"; la depozit nu apare nimic în plus. Poate fi schimbată pe comandă de Administrator sau Gestiune, cu istoric (dacă mașina Bilka nu ajunge, livrarea devine proprie).
- **Statusurile logistice nu se schimbă**: Recepționat se face oricum în șantier; „Livrat" se pune la fel ca la orice comandă. Fișa șoferului: comanda intră doar dacă e selectată, ca acum; dacă e „livrare Bilka", pe fișă apare mențiunea. Paleții: cazul 2 din cap. 8, neschimbat.
- Același mecanism la ambele firme (formularul e același).

**Exemplu.** Oferta IB-0147 → „De comandat" → „direct în șantier": Cotești, 0787 877 989 → formularul F1 are în antet localitatea Cotești și telefonul; comanda IDM-0147 arată „Livrare Bilka — șantier: Cotești · 0787 877 989". Oferta IB-0148 → „la depozit" → formularul fără localitate și telefon; comanda fără mențiune.

**Cum se verifică.** Test pe generator: DEPOZIT → celulele goale, SANTIER → valorile alese (hash-urile VBA neschimbate, ca la S17); test API: „De comandat" fără alegere → 409 cu câmpul; în browser: dialogul la „De comandat", textul pe comandă.

**Nu se atinge.** Restul generatorului, VBA, corespondențele, statusurile, avizul.

---

## M8 — Recomandarea și montatorul: două rubrici (S26b)

**Acum.** O singură persoană, „montator", pe ofertă (nume, telefon, comision, achitat), copiată pe comandă (coloana Montator) și folosită în tabelul de vânzări ca „Sursa recomandării".

**Corect ar fi.** Două rubrici distincte, în aceeași secțiune a ofertei („Montator și recomandare"):
1. **Recomandare — comision**: persoana care a adus lucrarea (din lista agentului — montatori, constructori, **colaboratori** (tip nou) — sau nouă) + **comisionul** (sumă) + „achitat". Alimentează **tabelul de vânzări** (Sursa recomandării, Comision recomandare, achitat). O modifică autorul ofertei și Administratorul lui, cu istoric (ca azi).
2. **Montator (execuție)**: nume + telefon (din aceeași listă sau nou) — cine montează și e în șantier la livrare. Alimentează **tabelul de comenzi** (coloana Montator) și **fișa șoferului**; **nu** intră în vânzări. O pot modifica autorul, Administratorii și Gestiunea (organizează livrarea), cu istoric.
- Butoane de copiere: „același ca recomandarea" și „clientul este montatorul" (montatorul e client: necesarul, prețul și descărcarea sunt cu el; e și recomandare — cu comision — și montator). Nicio obligație să coincidă; oricare poate lipsi.
- **Lista de persoane rămâne a fiecărui agent** (decizia lui Ionuț, 17.11): dacă un colaborator lucrează ocazional cu alt agent, acel agent îl trece și el în lista lui; dublurile sunt puține și nu deranjează. Tipul persoanei: montator / constructor / colaborator.
- **Datele existente nu se migrează** (decizia lui Ionuț): câmpul de azi devine **„Recomandare"** (poartă deja comisionul și alimentează vânzările — rămâne corect); „Montator (execuție)" e câmp nou, gol la ofertele și comenzile de până acum. Comenzile manuale primesc ambele rubrici la introducere.
- PDF-urile: nimic (montatorul și recomandarea rămân interne).

**Exemplu.** Ofertă cu recomandare „Ionel Andrei, comision 500 lei" și montator „Tudorel · 0766 852 465": tabelul de vânzări → Ionel Andrei / 500 / neachitat; tabelul de comenzi și fișa șoferului → Tudorel · 0766…. Cazul montator = client: client „Tudorel · 0766…", recomandare Tudorel 300 lei (comision), montator Tudorel — un clic pe „clientul este montatorul".

**Cum se verifică.** Test API: ambele rubrici salvate separat, cu istoric; vânzările citesc recomandarea, comenzile și fișa șoferului montatorul; drepturile (Gestiune poate schimba montatorul, nu recomandarea); în browser: secțiunea cu cele două rubrici și butoanele de copiere.

**Nu se atinge.** Comisionul agentului, restul tabelului de vânzări, PDF-urile, lista per agent.

---

## Corecții luate în S26a (din `CERERI-BUG-S25.md`)

- **BUG-14** — ofertele „Neacceptată" trec automat la sfârșitul listei (ca „Comandat"), vizibile la filtrul lor.
- **BUG-13** — confirmarea lungimilor cu două zecimale la redeschidere (făcut în S18 după raportul lui Code; Status de bifat după verificare).
