# MODIFICĂRI S29 — pagina ofertei pe trei file

Versiunea 1.3 · 25 noiembrie 2026 (deciziile de la planul S29 — secțiunea de la sfârșit) · v1.2 · 25 noiembrie 2026 (inventarul paginii de azi → file, cu locul „Grupei”; **fără** butonul „Strânge tot / Deschide tot” — deciziile lui Ionuț; simularea v3 refăcută la fel) · v1.1 · 25 noiembrie 2026 (după observațiile lui Ionuț la simularea v2: rubricile rămân **toate deschise, cu lista lor întreagă, ca până acum** — se strâng doar la clic; se adaugă **BUG-21**, ordinea produselor pe documente; simularea de referință devine **v3**) · v1.0 · 25 noiembrie 2026 · Scris de Claude (chat) din cererile lui Ionuț (25.11). **Simularea de referință: `docs/design/simulari/S29-simulare-navigare-oferta-v3.pdf`** (și imaginile `…-v3-pagina-1…4.png`); v1 și v2 rămân doar ca istoric — arătau în rubrici numai rândurile completate și rubrici strânse de la sine, ceea ce Ionuț **nu** vrea. Lotul S29 = corecțiile **BUG-20** și **BUG-21** din `CERERI-BUG-S25.md` + **M12**. M12 e **schimbare de ecran, nu de calcul**: motorul, datele, statusurile și drepturile rămân cum sunt.

---

## M12 — Pagina ofertei pe trei file, cu trei rânduri fixe — APROBAT (Ionuț, 25.11.2026: varianta B, cu statusurile pe rândul lor; rubricile toate deschise, strânse doar la clic)

**Acum.** Pagina ofertei e una singură, lungă (≈ 4.900 px, cam cinci ecrane de laptop): Status, Antet, Client, Produse (învelitorile și opt rubrici una sub alta), Rezultat, Prețuri, Montator / Recomandare, Documente, Notițe și atașamente, Istoric. Datele generale sunt rupte în două (sus și jos), iar între client și preț se derulează peste toate produsele.

**Corect ar fi.**

*Trei rânduri fixe, sus, la fel în toate filele (rămân la vedere când derulezi):*
1. **Rândul ofertei**: numărul (SERIE-NR), clientul și localitatea, marcajele (de exemplu „fără telefon", „preț ajustat"), apoi în dreapta totalul în lei, starea „salvat / nesalvat", „PDF ▾" și „Salvează".
2. **Rândul statusurilor** — pe rândul lui, între rândul ofertei și file: toate cele opt statusuri la vedere (În lucru · Transmisă · De revizionat · Acceptată · Neacceptată · Avans luat · De comandat · Comandat), cel curent închis la culoare; **un clic schimbă statusul**, cu regulile și dialogurile de azi (De comandat → livrarea de la Bilka; Comandat → ireversibil, cu confirmare; blocările cu mesaj). Fără meniu derulant.
3. **Rândul filelor**: **1 Date generale · 2 Produse · 3 Prețuri și documente**; sub numele fiecărei file, pe scurt ce e înăuntru („1 învelitoare · 8 produse", totalul) și un **punct roșu** când lipsește ceva.

*Ce intră în fiecare filă:*
- **Date generale** — tot ce nu e produs sau preț, pe un ecran: Client (cu adresa lucrării; aici vine și **Locația lucrării**, când se construiește M13 — `MODIFICARI-S30.md`; nu intră în S29), Antet, Recomandare — comision, Montator (execuție), Livrarea de la Bilka, Notițe și atașamente, Istoric.
- **Produse** — învelitorile, toate rubricile, zona B; jos, pe un rând, rezultatul pe scurt (se poate comanda / de ce nu, câte formulare) și „Mergi la Prețuri".
- **Prețuri și documente** — Rezultat, ținta, modul de prezentare, prețurile pe linii (fix), totalurile, variantele; Documente (PDF-urile și formularele Bilka).

*Nimic din pagina de azi nu dispare.* Simulările arată așezarea, nu tot conținutul: lipsesc din ele, de exemplu, „Află preț”, „⋯", cursul de achiziție, lista de preț, „Preia prețuri din oferta…", ajutorul paginii. Regula: **fiecare zonă, câmp, buton și mesaj de azi rămâne, cu aceeași purtare, și se mută în fila lui**:

| Azi pe pagină | După M12 |
|---|---|
| Capul paginii: numărul, statusul, data · firma · contul; „← Oferte", „Află preț", „PDF ▾", „⋯" | **rândul ofertei** (fix), cu toate butoanele de azi |
| STATUS — cele opt butoane | **rândul statusurilor** (fix) |
| ANTET — data ofertei, cursul BNR, cursul de achiziție, adresa și localitatea lucrării, sursa clientului, note, lista de preț | fila **Date generale** |
| CLIENT — telefon, nume, adresă, localitate, e-mail, observații, „fișa clientului"; butonul „Salvează antetul și clientul" | fila **Date generale**; butonul devine „Salvează" din rândul ofertei (salvează tot ce e nesalvat; salvările automate de azi rămân) |
| PRODUSE — **„Grupă %"** | fila **Produse**, sus, deasupra învelitorilor, în dreapta, **discretă, cum e azi** (FISA-OFERTARE 11.3: „înainte de zona de învelitori, o căsuță discretă") — **nu** în rândurile fixe și **nu** în bara de rubrici, ca să nu stea la vedere când clientul se uită la ecran |
| ÎNVELITORI, rubricile, nota despre ferestre, ZONA B (cu „Precizări la zona B") | fila **Produse** |
| REZULTAT — se poate comanda / de ce nu, mp și coli pe învelitoare, formularele și pachetele | fila **Prețuri și documente**, întreg; pe scurt și în josul filei Produse |
| PREȚURI — „Reîmprospătează cursul", „Preia prețuri din oferta…", avertizările, modul de prezentare, cursurile, liniile cu „fix", ținta și cele patru cifre, totalurile documentului | fila **Prețuri și documente** |
| MONTATOR / RECOMANDARE — cele două rubrici (M8) | fila **Date generale** |
| DOCUMENTE — „Generează: …", formularele Bilka, textul explicativ | fila **Prețuri și documente** |
| NOTIȚE ȘI ATAȘAMENTE · ISTORIC | fila **Date generale** |
| „Ajutor pentru această pagină" | rămâne, pe fiecare filă, cu partea ei de text |

Tabelul e făcut din capturile paginii, deci poate fi incomplet: **în planul S29, Code face inventarul complet din cod** (fiecare zonă, câmp, buton, mesaj → fila în care ajunge) și îl bifează la verificare; ce nu e în tabel se păstrează și se așază după aceeași logică, iar unde nu e limpede, întreabă.

*În fila Produse:*
- **Toate rubricile sunt deschise când intri în ofertă** — nouă sau redeschisă — **și arată exact ce arată azi**: învelitorile cu blocul lor pe trei coloane, fiecare rubrică cu **lista ei întreagă** (toate produsele din lista implicită, cu sau fără cantitate, plus cele adăugate cu „+"), cu butoanele și selecțiile ei. Softul **nu strânge și nu ascunde nimic de la sine**: nici rubricile goale, nici cele rare, nici rândurile fără cantitate. *(Simularea v2 arăta doar rândurile completate și rubrici strânse de la sine — greșeala lui Claude chat; corectat aici și în v3.)*
- **Un clic pe banda rubricii o strânge** pe un rând (banda are săgeată); **încă un clic o deschide la loc**, cu toate rândurile ei. Strânsă, rubrica arată pe rândul ei ce are completat (învelitoarea: model · finisaj · grosime · culoare · mp · coli; rubrica: câte produse au cantitate; „nimic completat"). Strângerea e **doar pentru ochi**: nu șterge și nu schimbă nimic din ofertă, din calcul sau din documente. Alegerea se ține minte cât lucrezi la ofertă (la schimbarea filei și după „Salvează"); **la redeschiderea ofertei toate sunt din nou deschise**.
- **Bara de rubrici**, fixă sub cele trei rânduri: Învelitori · Accesorii standard · Speciale 2 ML · Fixare și etanșare · Sistem pluvial · Șipcă gard · La lungimi · Zona B — cu numărul produselor care au cantitate (rubricile fără nimic completat apar șterse **în bară**, nu pe pagină); un clic sare la rubrică (și o deschide, dacă era strânsă). **Fără buton „Strânge tot / Deschide tot”** (decizia lui Ionuț, 25.11.2026: e suficient clicul pe fiecare bandă).
- **Rândurile fără cantitate** rămân ce sunt azi: se văd pe ecran, dar **nu intră** în calcul, în documente sau în formularul Bilka — nu e nimic de șters ca oferta să iasă curată.

*Reguli de comportare:*
- **Fiecare filă își ține locul** (poziția de derulare): treci la Prețuri, schimbi ținta, revii la Produse exact unde erai.
- **Nimic nu se pierde la schimbarea filei**; „Salvează" din rândul ofertei salvează toată oferta, din orice filă.
- **Când ceva blochează** (de exemplu „Comandat" fără telefon), softul trece singur în fila cu problema și pune cursorul pe câmp, cu mesajul sub el (regula BUG-4).
- **Tastatura**: Alt + 1 / 2 / 3 schimbă fila; în Produse, Tab și Enter merg ca acum, doar prin căsuțele completabile (BUG-6, BUG-11).
- Adresa paginii ține fila (de exemplu `…#produse`), ca reîncărcarea să revină în aceeași filă.
- **Telefon (390 px)**: filele devin un rând de trei butoane; rândul statusurilor și bara de rubrici se derulează lateral; rubricile — tot deschise la intrare, strânse la atingerea benzii.

**Exemplu.** Simularea v3: pagina 1 — fila „Produse" cum se deschide (rândurile fixe, învelitoarea deschisă, „Accesorii standard" cu toate cele 10 produse din listă și un produs adăugat cu „+"); pagina 2 — aceeași filă mai jos („Speciale 2 ML" cu cele 6 rânduri, „Fixare și etanșare" cu toate cele 16) și cum arată cu rubricile strânse, fiecare cu clicul ei; pagina 3 — „Date generale" și „Prețuri și documente"; pagina 4 — locația lucrării (M13, S30) și ordinea pe documente (BUG-21).

**Cum se verifică.** În browser, pe o ofertă de probă, desktop și 390 px:
- **inventarul din plan, bifat**: fiecare zonă, câmp, buton și mesaj de dinainte de S29 există și după, cu aceeași purtare — inclusiv „Grupă %", sus în fila Produse (o grupă scrisă schimbă achiziția afișată în Prețuri, ca înainte; nu apare în rândurile fixe);
- cele trei rânduri rămân fixe;
- **la intrarea în ofertă toate rubricile sunt deschise și fiecare are exact rândurile dinainte de S29** — aceeași ofertă de probă, comparată înainte și după: aceleași produse, în aceeași ordine, aceleași butoane; la fel pe o ofertă nouă, goală;
- clic pe bandă strânge / deschide, fără nicio schimbare în ofertă (o salvare făcută cu rubrici strânse nu modifică nimic); după reîncărcare toate sunt deschise;
- schimbarea statusului dintr-un clic (cu dialogurile de azi); poziția păstrată pe fiecare filă; saltul la filă și la câmp când „Comandat" e blocat; saltul din bara de rubrici; Alt + 1 / 2 / 3; reîncărcarea revine în aceeași filă; o ofertă salvată arată la fel ca înainte de S29 ca date.

Capturi pe fiecare filă, desktop și telefon, trimise lui Ionuț **înainte de commit-ul M12** — el aprobă ecranele. Scenariile de browser din S25–S28 rulate din nou, verzi; 13 oferte-model la zero; `mot/` neatins.

**Nu se atinge.** Calculul, datele, documentele PDF (în afara ordinii din BUG-21), regulile statusurilor, drepturile, lista de oferte, comenzile; **conținutul rubricilor** — listele implicite, rândurile, cascadele, butoanele „+", blocul învelitorii din S25, modul Combinat — se mută doar pe pagină, nu se rescrie; stilul compact din S18 rămâne (aceleași variabile).

---

## Corecțiile luate în S29 (din `CERERI-BUG-S25.md`) — se fac primele, cu commit separat de M12

- **BUG-20** — „+ Adaugă produs" creează rândul **fără nicio cantitate**, cu cursorul în căsuță; rândul rămâne vizibil și gol până e șters din coș (și după salvare și redeschidere); cât e gol nu intră în calcul și în documente; aceeași regulă în toate rubricile cu „+ Adaugă…".
- **BUG-21** — peste tot unde softul înșiră produsele ofertei (PDF ofertă, ofertă detaliată, rezumat, tabel de facturare, aviz, lista „Prețuri pe linii" din editor), ele apar **în ordinea de pe ecranul ofertei, de sus în jos** — categoriile în ordinea clasică, iar în fiecare rubrică produsele în ordinea listei ei (cele implicite în ordinea din listă, apoi cele adăugate cu „+", în ordinea adăugării) —, **nu în ordinea în care li s-a completat cantitatea**. Se schimbă doar ordinea de afișare: cantitățile, prețurile pe linii, totalurile și formularele rămân identice.

---

## Decizii la planul S29 (25.11.2026) — propunerile lui Code, aprobate, cu precizările lui Claude chat

1. **Rândurile fără cantitate (BUG-20)** se țin într-un tabel separat, mic (migrarea 24, aditivă), ca să nu poată ajunge la motor sau pe documente; „Copiază oferta” și „Creează variantă” le duc și pe ele (rândul gol al unui produs fără corespondent în variantă se lasă deoparte). **Locul unui rând adăugat cu „+” e stabil**: nu se schimbă când rândul primește sau pierde cantitatea — nici pe ecran (și după salvare și redeschidere), nici pe documente. Tabelul nou intră în exportul „descarcă tot” și în restaurare.
2. **Ordinea de la BUG-21** se calculează la afișare, din listele implicite de acum; nu se salvează pe ofertă. Merge pe toate ofertele și comenzile existente; documentele deja generate rămân cum sunt, cele regenerate ies în ordinea nouă. Prin aceeași funcție trec și enumerarea de pe fișa șoferului și lista de produse de la retur. Rangul produselor adăugate cu „+” = ordinea adăugării (locul de pe ecran), nu ordinea în care au primit cantitate. Ordinea în care liniile sunt salvate și pleacă spre motor nu se schimbă.
3. **„Mențiuni pentru istoric”** (câmpul care apare după „Transmisă”): sus în fiecare filă, cu aceeași valoare; nu în rândurile fixe.
4. **La „Comandat”**: rândul statusurilor arată toate cele opt, stinse, cu „Comandat” închis la culoare; textul „Oferta e comandată din…”, rezumatul comenzii, total · avans · rest și nota „Preț ajustat pe comandă” stau într-o casetă „Comandă”, prima din Date generale; „preț ajustat” apare și ca marcaj în rândul ofertei.
5. **„Versiuni (variante de preț)”** → Prețuri și documente; **„Completări”** → Date generale; panourile deschise din „⋯” apar sub rândurile fixe, în fila în care ești. Eticheta statusului de lângă număr dispare (dublură cu rândul statusurilor). În rândul ofertei, sub număr, pe un rând mic: data · firma · contul și „completare la … · motiv”.
6. **Punctul roșu** = ceva din filă ar opri „Comandat” sau e o eroare: Date generale — lipsește telefonul; Produse — nu se poate comanda sau eroare de calcul; Prețuri și documente — linii sub achiziție sau eroare de preț. Sub numele filei scrie pe scurt ce lipsește; pe o ofertă comandată punctul nu apare.
7. **„Salvează”** salvează antetul și clientul (singurele nesalvate automat) și forțează salvarea produselor aflată în așteptare; restul se salvează pe loc, ca acum. „nesalvat” apare când antetul, clientul sau produsele au modificări netrimise.
8. **Scenariile de browser** (S25–S28) se rulează din nou, adaptate doar la navigarea pe file, și se mută în proiect, într-un folder de verificări — fără parole sau chei în ele.

**Telefon (390 px)** — se hotărăște pe capturi, de Ionuț: rândurile fixe să nu treacă de o treime din ecran; sugestie — rândul ofertei pe o singură linie (număr, total, „Salvează”, „⋯”, cu restul butoanelor în „⋯”); dacă tot nu încape, și varianta în care rândul statusurilor nu e fix pe telefon.
