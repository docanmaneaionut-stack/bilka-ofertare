# Schiță, panotaj și măsurătoare cu drona — ciornă

Versiunea 0.1 · 20 noiembrie 2026 · Status: **CIORNĂ** — notițele discuțiilor din 19–20.11.2026 (Ionuț + Claude chat). Nu este fișă de modul: **nu se construiește din ea** și nu schimbă ARH, PLAN sau fișele închise.
Se leagă de: ARH §7 (SCH / GEO / PAN, sub-etapele E1–E5), PLAN „Etapa 8”, FISA-NOTITE-SCHITA §5. Când îi vine rândul, devine fișă de modul, închisă capitol cu capitol.
Documentul de lucru este în Claude: <https://claude.ai/artifact/5j6AymqfzvRxg4HAhMQZUA>. Copia aceasta se reîmprospătează la fiecare etapă a discuției.

Schița completă a acoperișului este baza, panotajul se face pe ape, iar drona este doar una dintre cele trei surse de schiță. Aceasta este ciorna discuției din 19.11.2026, nu o fișă închisă.

## Cum se citește ciorna

- **Stabilit** = hotărât de Ionuț în discuție.
- **Propus** = propunerea lui Claude, încă neconfirmată.
- **Estimare** = cifră apreciată, de verificat la test.
- **Deschis** = de lămurit sau de decis.

Prețurile și tarifele sunt cele găsite în 19.11.2026 și se pot schimba.

## Ideea de bază

Panotajul este necesar și fără dronă, iar orice panotaj pornește de la o schiță 2D. **Stabilit.**

- Schița vine din trei surse: măsurătoare fizică, schiță de la meseriaș sau plan de învelitoare de la client, când acoperișul încă nu există.
- Drona este a treia cale de a obține aceeași schiță, nu un flux separat.
- Schița și panotajul rămân utile și dacă testul cu drona iese prost.

Ordinea de construcție, fără nimic refăcut (**Propus**):

1. Formatul comun al acoperișului: ape, muchii, tipuri, cote.
2. Schița completă, desenată de agent.
3. Panotajul pe ape.
4. Măsurătoarea cu drona, ca sursă suplimentară de schiță.
5. Simularea pe casă.

Totul vine după go-live. **Deschis:** dacă schița trece înaintea modulelor de stoc și notițe.

## Schița 2D completă

Baza este schița completă a acoperișului, din care softul descompune apele. **Stabilit**; varianta cu ape introduse separat a fost respinsă.

- **Tip și lungime pe fiecare linie.** Exemplu: coamă 5,60 m. Tipurile sunt streașină, coamă dreaptă, coamă înclinată, dolie, fronton și bordură la perete.
- **Linia are două fețe.** Aceeași linie poate avea rol dublu sau combinat: pe o față streașina unei ape, pe cealaltă bordură la perete plus fronton pentru altă apă. Fiecare față are segmentele ei, fiecare cu tip și lungime. Așa se notează și părțile de acoperiș suprapuse peste altele mai joase.
- **Schița agentului este schematică, nu la scară.** Softul ia lungimile din cote, niciodată din desen. Proporțiile desenate folosesc doar la estimări.
- **Săgeată de scurgere pe fiecare apă.** Softul o propune din tipurile liniilor, de la coamă spre streașină sau dolie. Agentul o confirmă sau o întoarce.
- **Agentul nu desenează tehnic.** Desenul tehnic curat îl produce softul și se poate tipări.

Pașii, pentru schița de mână:

1. Agentul trage linii aproximative.
2. Adaugă semnificația fiecărei linii și cotele.
3. Softul sugerează direcția de scurgere și cotele lipsă.
4. Softul aduce desenul la scară.
5. Agentul confirmă schița și formele apelor.
6. Softul descompune schița pe ape numerotate, ușor de urmărit pe șantier.
7. Panotajul se face pe fiecare apă, după reguli.

## Cele trei surse de schiță

Toate sursele umplu aceeași schiță, iar de la confirmarea ei pașii sunt identici.

```text
Schiță de mână      Plan de învelitoare      Dronă
       └───────────────────┼───────────────────┘
                           ▼
                    Schiță completă
                           ▼
                    Ape numerotate
                           ▼
                Panotaj pe fiecare apă
                           ▼
       Ofertă · Formular Bilka · Fișă de montaj
```

Oricare ar fi sursa, schița confirmată se descompune pe ape, iar panotajul dă oferta, formularul Bilka și fișa de montaj.

| Sursă | Ce face agentul | Ce face softul |
| --- | --- | --- |
| De mână sau de la meseriaș | Desenează schița și trece cotele măsurate | Sugerează săgețile și cotele lipsă, aduce la scară |
| Plan de învelitoare de la client | Desenează schița și notează cotele și panta din plan | Calculează cotele complete, din plan în mărime reală |
| Dronă | Confirmă sau corectează apele și muchiile pe model | Propune apele și muchiile din modelul 3D, apoi cotează schița automat |

- **Stabilit:** schiță „din dronă” înseamnă model complet. Dacă modelul e parțial, acoperișul se măsoară manual și schița este de mână.
- **Propus:** schița rămâne una singură și fiecare cotă își poartă sursa (dronă, ruletă, estimat). O fâșie ascunsă se completează de mână, iar restul rămâne din măsurătoare.

## Cote și precizie

Panotajul se sprijină pe trei cote de bază; restul sunt ajutătoare. **Stabilit.**

| Fel de cotă | Care sunt | Regulă |
| --- | --- | --- |
| De bază | Lungimea apei (a pantei), lungimea la streașină, coamele drepte paralele cu streașina | Obligatorii. Intră în panotaj exact cum sunt date. Softul nu le corectează. |
| Oblice | Coame înclinate, dolii | Opționale. Dacă lipsesc, softul le calculează. Dacă sunt date, apar lângă cea calculată, informativ. |
| Estimate | Orice cotă propusă de soft | Rămân marcate. Bune pentru ofertă rapidă; comanda se blochează până sunt confirmate (Propus). |

- Conturul nu trebuie să se închidă matematic. Măsurătorile fizice au toleranțe, iar diferențele apar doar ca indicație.
- Toleranțele din măsurătoare rămân ale agentului.
- La acoperișul în 4 ape, coamele înclinate de regulă nu se măsoară, fiind riscant. Se calculează cu Pitagora.

**Excepție de știut (Propus):** apa cu două laturi oblice diferite, de exemplu coamă înclinată într-o parte și dolie în cealaltă. Cotele de bază dau mărimile, nu și decalajul coamei față de streașină. Decalajul schimbă lungimile foilor de pe oblice. Softul îl scoate de regulă din apele vecine sau cere o singură cotă în plus: o oblică ori panta.

## Panotajul

Panotajul se face pe fiecare apă, pe forma confirmată, după reguli și cu câteva variante la alegerea agentului. **Stabilit.**

- **Variante.** Panotajul se poate face în mai multe feluri, învățate din practică, ca să scadă pierderile din tăieturi. Softul le calculează pe toate și arată la fiecare suprafața de tablă și pierderea.
- **Rezultat.** Lista lungime × bucăți intră în ofertă și în formularul Bilka. Apele numerotate dau și o fișă de montaj pentru șantier.
- **Reguli.** Regulile de panotaj sunt încă de scris. **Deschis.**

Date tehnice necesare pe fiecare model, de la Ionuț:

- [ ] Lățimea utilă
- [ ] Modulul și rotunjirea lungimii foii
- [ ] Adaosul la streașină
- [ ] Lungimea minimă și maximă a foii
- [ ] Suprapunerea la rupere
- [ ] Ce se refolosește din tăieturile de la oblice

## Cerințe de implementare

Ionuț cere trei calități pentru schiță și panotaj: precizie, rapiditate la desen și viteză de procesare, ideal și offline. Cerințele sunt **Stabilite**; soluțiile sunt **Propuse**.

| Calitate | Cum se obține |
| --- | --- |
| Precizie | Lungimi numai din cote, calcul în milimetri. Aducerea la scară arată unde și cu cât nu se închid cotele. Schițele-etalon se testează automat la fiecare modificare. |
| Rapiditate la desen | Linii care se prind la orizontală, verticală și colțuri. Tip din listă sau dintr-o tastă, cote cu Tab. Schițe-tip (2 ape, 4 ape, L, T) și oglindire. |
| Viteză și offline | Calculul rulează pe dispozitivul agentului, nu pe server. Serverul doar salvează și sincronizează. |

- **Țintă (Estimare):** un acoperiș în 4 ape desenat în 1–2 minute.
- **Offline (Stabilit):** schița și panotajul stau în ofertă, se salvează pe dispozitiv împreună cu ea și intră în baza de date la prima conectare, după regulile ofertei offline. Lățimile și modulul modelelor merg în catalogul local.
- Internet cere numai partea de dronă.

## Măsurătoarea cu drona

Zborul și fotogrametria există deja la terți; în soft se construiește doar ce ține de acoperiș și de ofertă. Unealta este strict pentru uz intern, la minimum 20 de măsurători pe lună. **Stabilit.**

| Etapă | Cine o face | Cost |
| --- | --- | --- |
| Zborul și pozele | Aplicația DJI a dronei | Inclus |
| Procesarea în model 3D | Platformă externă în cloud | Contracost |
| Ape, cote, schiță | Softul nostru, cu confirmarea agentului | Dezvoltare |

Limite:

- Modelul 3D conține doar ce a văzut camera. Părțile acoperite apar numai cât le-au prins pozele oblice.
- Recunoașterea complet automată a apelor nu este promisă. Softul propune, agentul confirmă.
- Coamele și doliile pot ieși mai precis ca intersecții între ape decât din click.
- Tabla lucioasă și uniformă iese mai slab în fotogrametrie decât țigla sau azbocimentul.
- Fără schiță și panotaj, drona dă doar cifre de introdus manual.

## Procesarea

Procesarea rămâne în cloud, la WebODM Lightning; stația proprie a fost abandonată. **Stabilit.**

Stația proprie cu WebODM gratuit a căzut din două motive: durata procesării și complicația a două măsurători suprapuse. Reper de cost: o stație refurbished cu 64 GB RAM costa 5.500–7.300 lei.

| Plan [Lightning](https://webodm.net/pricing) | Preț | Hărți | Lucrări simultan |
| --- | --- | --- | --- |
| La bucată | Pe credite | Se plătește fiecare hartă | Până la 30 |
| Starter | 24 $ pe lună, cu plata anuală | 12 pe 30 de zile | 1 |
| Pro | 35 $ pe lună anual sau 42 $ lunar | Nelimitat | 2 |

- Credite = poze împărțit la 2,25. La 100–150 de poze rezultă 45–67 de credite.
- La minimum 20 de măsurători pe lună, planul Pro înseamnă cel mult 1,75 $ pe acoperiș.
- Creditele gratuite de la înscriere ajung pentru 338 de poze, adică 2–3 acoperișuri de test ([întrebări frecvente](https://webodm.net/faq)).
- La bucată, rezultatele se păstrează 10 zile. Softul trebuie să le descarce imediat.

**Deschis:** prețul unui credit (apare doar în calculatorul de pe site), durata reală a procesării și legătura cu softul prin tokenul de acces. Toate trei se verifică la test.

## Zborul

Ambele drone zboară cu aplicația gratuită DJI; Dronelink este doar varianta comodă. **Stabilit** pentru test, restul **Propus**.

- **Număr de poze (Estimare):** 100–150 la o casă obișnuită. Grila de deasupra dă 40–80, iar cercul înclinat în jurul casei încă 36–72. Sub vreo 80 apar goluri la streșini.
- **Matrice 4E:** DJI Pilot 2, pe telecomandă. Planificarea, zborul și capturile sunt complet automate.
- **Mini 4 Pro:** DJI Fly. Planul de zbor vine dintr-un planificator gratuit, de exemplu [WaypointMap](https://www.waypointmap.com/), și se instalează pe telecomandă. Pozele se fac pe temporizator: 12 MP, o poză la 3 secunde, 2–7 m/s. Singurul gest manual este pornirea temporizatorului.
- **Dronelink:** 299,99 $ pe an pe planul Starter, pentru uz comercial. Opțional.
- **Mai târziu (Propus):** fișierul de zbor generat direct din soft, validat pe drona reală.

## Drone

Testul se face cu Mini 4 Pro (**Stabilit**). Matrice 4E s-ar cumpăra doar dacă testul arată că Mini limitează precizia (**Propus**).

| Dronă | Preț cu TVA | Clasă | Obturator și RTK | De știut |
| --- | --- | --- | --- | --- |
| [Mini 4 Pro, cu RC-N2](https://drona.compari.ro/dji/mini-4-pro-rc-n2-cp-ma-00000731-01-p1003226242/) | 3.450–3.900 lei | Sub 250 g | Electronic, fără RTK | Cele mai puține restricții lângă oameni. Cere măsurătoare de referință, recomandat două. |
| [Matrice 4E](https://www.topotech.ro/produs/drona-dji-matrice-4e) | 24.700–26.100 lei (20.400–21.600 fără TVA) | C2 | Mecanic, RTK integrat | Certificat A2 și 30 m față de persoane neimplicate, sau 5 m în modul lent. |
| [Mavic 3E](https://drona.compari.ro/dji/mavic-3e-p864344541/) | 17.300–19.400 lei | C2, cu o ediție C1 | Mecanic, RTK separat | Producție încheiată. Nerecomandată. |

- Air 3S, Mavic 4 Pro și Mini 5 Pro lipsesc din SDK-ul DJI, deci pot fi zburate doar prin artificii.
- [Bateria Matrice 4E](https://store.dji.com/product/dji-matrice-4-series-battery) are 99 Wh și ține până la 49 de minute. În cutie vine una; o rezervă costă 1.100 lei.
- Bateriile Mini 2 SE nu se potrivesc nici la Matrice 4E, nici la Mini 4 Pro.
- RTK prin [ROMPOS](https://rompos.ro/) costă 100 lei pe lună sau 1.000 lei pe an de aparat și cere internet la fața locului.

**Precizie (Estimare):** diferența dintre Mini 4 Pro și Matrice 4E este de 1–2 cm la lungimile unui acoperiș. Date publicate: [Mini](https://aerocartwright.com/library/dji-mini-mapping-accuracy-benchmarks/), 2,0 cm pe orizontală și 2,8 cm pe verticală cu repere topografice; [Matrice 4E](https://bench-mark.ca/dji-matrice-4e-suitable-for-land-surveying/), 2–5 cm și 3–7 cm cu RTK, fără repere. Clicul pe muchie și zonele ascunse adaugă 1–2 cm la ambele.

## Testul de precizie

Testul se face cu Mini 4 Pro, fără abonament, înainte de orice cumpărătură. **Stabilit.**

- Se zboară 2–3 acoperișuri deja măsurate de mână.
- Zborul se face din DJI Fly, iar procesarea pe creditele gratuite Lightning.
- Cotele se măsoară direct în vizualizatorul WebODM și se compară cu cele de mână.
- Dacă precizia ține, modulul de dronă se construiește după go-live, împreună cu schița.

De verificat cu aceeași ocazie:

- [ ] Durata procesării pentru 100–150 de poze
- [ ] Legătura cu softul prin tokenul de acces
- [ ] Dacă rezultatele conțin poziția camerei pentru fiecare poză
- [ ] Prețul unui credit

## Simularea pe casă

După o măsurătoare cu drona, softul poate arăta casa clientului cu acoperișul în modelul și culoarea dorite. Este o idee de viitor, după modulul de măsurare. **Propus.**

- **Pe pozele reale din zbor:** acoperișul este „revopsit” în fotografie, cu modulul real al profilului și culoarea din catalog. Este varianta cea mai fidelă.
- **Pe modelul 3D rotit:** mai spectaculos, dar mai puțin fotorealist de aproape.
- Se sprijină pe apele confirmate și pe poziția camerei pentru fiecare poză.
- Culoarea de pe ecran nu înlocuiește mostra.

## Calculatoare online de analizat

Ionuț a ales primele trei, cele românești; ce am aflat este în secțiunea următoare. AppliCad rămâne de văzut de Ionuț. Restul listei este doar din rezultatele căutării. **Deschis.**

| Calculator | Ce pare să facă | De ce ne interesează |
| --- | --- | --- |
| [Expert Tablă](https://experttabla.ro/calculator/ro/) | Acoperiș în 1, 2 sau 4 ape, în L sau 2 ape cu lucarnă, pentru Bilka, Wetterbest, Caretta și Novatik. Generează schițe, număr de foi și accesorii, fără pantă. Are și garduri și pluvial. | Același profil de produse, inclusiv Caretta. |
| [Tinu House Art](https://www.tinuhouseart.ro/calculator) | Foi și lungimi, accesorii și o schiță cu așezarea foilor. 1, 2, 4 ape sau formă specială. | Schița de panotaj arătată clientului. |
| [Tigla-online](https://tigla-online.ro/calculator-tabla-tigla/) | Bilka sau Metigla. 1, 2, 4 ape, în L sau cu lucarnă. | Formele în L și lucarna. |
| [Tabla-online](https://newcalculator.tabla-online.ro/) | Pași: tablă, măsurători, accesorii, preț. Are și „acoperiș personalizat”. | Fluxul pe pași și forma liberă. |
| [Blocklayer](https://www.blocklayer.com/roof/hip-valley-sheet-cut) | Desenează tăierea foilor la coamă înclinată și dolie, cu refolosirea tăieturilor. | Regulile pe oblice. |
| [vCalc](https://vcalc.com/wiki/metal-for-hip-roof) | Număr și lungimi de panouri pentru 4 ape, cu refolosirea resturilor. Formulele sunt vizibile. | Matematica gata scrisă. |
| [RoofCalc](https://www.roofcalc.org/?p=15326) | Listă de tăiere pe fiecare panou la tablă fălțuită, inclusiv la 4 ape. | Lista de tăiere. |
| [AppliCad Roof Wizard](https://applicad.com/) | Soft profesional: model 3D, așezarea panourilor și listă de tăiere pe fiecare apă, cu refolosirea tăieturilor. | Referința pentru variantele care scad pierderea. |

Există și calculatoare în limba rusă cu așezarea foilor, la Metall Profil și Poetalon. Nu sunt trecute în tabel.

## Ce am aflat din calculatoarele românești

Expert Tablă lucrează cu aceleași cote de bază ca regula lui Ionuț; Tinu pornește de la zid și pantă, iar Tigla-online nu își arată câmpurile. Toate trei pornesc de la o formă aleasă dintr-o listă. Am citit paginile lor publice la 19.11.2026; pașii interactivi au rămas nevăzuți.

| Calculator | Ce cere | Ce scoate | Unde se oprește |
| --- | --- | --- | --- |
| [Expert Tablă](https://experttabla.ro/calculator/ro/) | Cotele apelor, măsurate pe pantă: lățimea la streașină și lungimea apei. Fără pantă. La [4 ape](https://experttabla.ro/calculator/ro/calcul/4-ape/modele): bazele și înălțimile triunghiurilor și ale trapezului, fără muchii oblice. | Schițe pe ape, număr de foi, accesorii propuse după formă, preț orientativ, ofertă salvată ca PDF. | Forme-șablon: 1, 2, 4 ape, L, o lucarnă pe 2 ape. Restul merge la calcul manual, „forme geometrice” sau specialist. |
| [Tinu House Art](https://tinuhouseart.ro/calculator/acoperis) | Cotele zidului (A, B), panta în grade, cât iese acoperișul peste zid, coșuri, laturi cu jgheab. 35° dacă nu știi panta. | Desen care se schimbă odată cu cifrele, suprafața totală, accesorii bifate din start, total cu TVA. | 1, 2, 4 ape și „altă formă”. Nicio regulă publicată. |
| [Tigla-online](https://www.tigla-online.ro/calculator-tabla-tigla/) | Tipul acoperișului, marca și modelul (Bilka sau Metigla), dimensiunile. | Listă de materiale cu cantități, pentru coș sau cerere de ofertă. | 1, 2, 4 ape, L, lucarnă. La forme complicate cere poză sau schiță. Nicio regulă publicată. |

Expert Tablă are două șabloane cu cote pe litere, bune ca model pentru schițele noastre șablon:

| Șablon | Cotele cerute | Limite declarate |
| --- | --- | --- |
| [Formă de L](https://experttabla.ro/calculator/ro/calcul/forma-de-l/modele) | La streașină: B lungimea totală, C latura, D și E lățimile celor două capete. Pe pantă: F și G, înălțimile triunghiurilor de capăt, sau panta în grade. | Șase ape, fără frontoane, streșini la aceeași înălțime. Nu acoperă T, U sau aripă mai joasă. |
| [2 ape cu lucarnă](https://experttabla.ro/calculator/ro/calcul/2-ape-cu-lucarna/modele) | Acoperiș: B lățimea la streașină, C și D lungimile celor două ape. Lucarnă: E lățimea feței, F coama, G muchia feței de la streașină la coamă, H streașina, K latura pe acoperiș până la dolie. Poziție: I de la colțul din stânga, J de la streașina casei. | O singură lucarnă în două ape, care nu ajunge la coamă. |

După calcul, la forma de L se poate deschide orice apă pentru a-i schimba cotele sau panta. Un convertor separat, [pantă și suprafață](https://experttabla.ro/calculator/ro/calcul-panta-suprafata-acoperis), trece din cotele în plan și pantă la lungimea apei.

### Ce luăm pentru modulul nostru

- **Cotele de bază se confirmă.** Expert Tablă cere lățimea la streașină și lungimea apei, fără oblice. Tinu pornește de la zid și pantă, adică drumul nostru „plan de învelitoare”. (**Stabilit**, confirmat din afară.)
- **Șabloane cu cote pe litere.** Agentul completează 6–10 cote în loc să deseneze, apoi modifică liber schița. Literele lor sunt punct de plecare pentru L și lucarnă. (**Propus**)
- **Corecție pe apă.** La confirmarea apelor, agentul schimbă o cotă direct pe apă. Corecția se scrie pe fața liniei care ține de acea apă, deci schița rămâne sursa unică. (**Propus**)
- **Lungimi valide.** La tabla tip țiglă, [regula publicată](https://experttabla.ro/intrebari-frecvente) este intercalare + n × modul; altă lungime urcă la următoarea validă. Exemplele lor, 0,50 / 0,85 / 1,20 m, dau modul 0,35 m și intercalare 0,15 m (dedus din exemple). Retropanel, Retroduo și fălțuita merg din 5 în 5 cm. (**De confirmat** de Ionuț pe fiecare model.)
- **Reper de pierdere.** [Articolul lor despre 4 ape](https://experttabla.ro/blog-acoperis/calcul-acoperis-in-4-ape) dă tabla facturată peste suprafață: circa 28% la tabla tip țiglă, 23% la cutată, 13% la fălțuită. La 2 ape: 13%, 8,5% și 5%. Fiecare variantă de panotaj ar afișa același procent, pentru comparație. (**Propus**)
- **Accesorii din tipul liniilor.** Ei propun accesoriile după formă: coamă și pe muchii, dolii la intersecții, șorț la streașină, bordură la perete la lucarnă. La noi cantitățile ies din tipul și lungimea fiecărei linii, pe ambele fețe, iar agentul le poate schimba. (**Propus**)
- **Desen pe loc.** Schița se aduce la scară în timp ce agentul scrie cotele, ca la Tinu. Se leagă de cerința de calcul pe dispozitiv. (**Propus**)

Din ce se vede public, niciunul nu arată schiță liberă, linii cu rol dublu, părți suprapuse, streșini la înălțimi diferite, mai multe lucarne sau variante de panotaj comparate. Acolo este locul modulului nostru. Modurile „forme geometrice” și „manual” de la Expert Tablă și „altă formă” de la Tinu rămân de văzut la rularea de probă.

### Ce nu se vede din paginile publice

Nu am putut vedea schițele generate și lista de foi: lungimile în trepte la muchii, rotunjirile și dacă refolosesc tăieturile. Pașii aceia se construiesc doar în browser, iar Chrome nu era conectat. **Deschis.**

Test propus, de pe PC: acoperișul din exemplul lor, 4 ape de 10 × 8 m la streașină cu apa de 5 m, adică 100 m². Îl rulez prin Expert Tablă și Tinu House Art, fără date personale și fără cerere de ofertă. Dacă Ionuț îl panotează și de mână, devine primul etalon, cu trei rezultate alăturate. (**Propus**)

## Legătura cu proiectul

Ciorna este salvată în proiect ca `docs/CIORNA-SCHITA-PANOTAJ-DRONA.md`. Nu schimbă ARH, PLAN sau fișele închise. **Stabilit** (20.11.2026).

- Ține de Etapa 8 din PLAN, SCH / GEO / PAN, descrisă în ARH §7 și în FISA-NOTITE-SCHITA §5.
- Când îi vine rândul, devine fișă de modul, închisă capitol cu capitol. Atunci diferențele față de ARH se notează în ARH §13.
- Documentul din Claude rămâne cel de lucru. Copia din proiect se reîmprospătează la fiecare etapă.
- PLAN cere deja de la Ionuț regulile de panotaj pe model și 10–15 acoperișuri reale cu lista de coli montată. Schițele-etalon din ciornă sunt începutul lor.

Ce spune ARH §7 altfel decât ciorna, de împăcat la scrierea fișei (**Deschis**):

| Subiect | ARH §7 | Ciorna |
| --- | --- | --- |
| Introducerea schiței | „Desen prin cote” (segmente cu lungime și direcție) ca interfață principală; mouse-ul doar pentru corecții | Linii aproximative, apoi tip și cote; softul aduce desenul la scară. Șabloane cu cote pe litere (Propus) |
| Ordinea | Cinci sub-etape E1–E5; bibliotecile GEO și PAN testate pe acoperișuri reale înaintea interfeței de desen | Format comun, schiță, panotaj, dronă, simulare (Propus) |
| Cote | Ape, pante și dimensiuni reale (E2); coame și dolii generate din contur (E5) | Cotele de bază intră cum sunt date; oblicele sunt opționale; conturul nu trebuie să se închidă |
| Linii | Marcare pe tipuri, cu lungimi pe tipuri direct în ofertă (E1) | Linia are două fețe; părțile suprapuse se notează pe fețe |
| Dronă | Import, în E5 | A treia sursă a aceleiași schițe, după testul de precizie |

Restul se potrivește: PAN dă liste de coli pe care MOT le prețuiește, refolosirea și pierderile vin după panotajul de bază (E4), iar drona vine la urmă.

## Puncte deschise și pașii următori

Următorul pas este seria de schițe a lui Ionuț, cu panotajul făcut de mână.

De făcut de Ionuț:

- [ ] Schițe de mână pe agendă: 2 ape, 4 ape, în L cu dolie, linie cu rol dublu, plan de învelitoare cu pantă
- [ ] Panotajul fiecărei schițe, făcut de mână pe hârtia de panotaj
- [ ] Detaliile tehnice pe fiecare model
- [x] Alegerea calculatoarelor online de analizat
- [ ] AppliCad: de văzut și de spus dacă îl analizăm
- [ ] Testul de precizie cu Mini 4 Pro

De făcut de Claude:

- [ ] Descompunerea schițelor pe ape și refacerea panotajului alături de cel de mână, înainte de orice cod
- [x] Analiza calculatoarelor alese, din paginile publice
- [ ] Rularea acoperișului de probă în Expert Tablă și Tinu House Art, de pe PC
- [x] Cum și unde se salvează fișa în proiect

De decis:

- După go-live, schița trece înaintea modulelor de stoc și notițe?
- Sursa pe fiecare cotă în loc de regula „model complet sau schiță de mână”?

## Surse

Pagini din care provin cifrele, găsite în 19.11.2026; unele au fost citite doar din rezultatele căutării: [WebODM Lightning, prețuri](https://webodm.net/pricing) · [WebODM Lightning, întrebări frecvente](https://webodm.net/faq) · [Dronelink, drone suportate](https://www.dronelink.com/supported-drones) · [EASA, categoria deschisă](https://www.easa.europa.eu/en/node/119320) · [ROMPOS](https://rompos.ro/) · [DJI, baterie Matrice 4](https://store.dji.com/product/dji-matrice-4-series-battery) · [Topotech, Matrice 4E](https://www.topotech.ro/produs/drona-dji-matrice-4e) · [Compari, Mini 4 Pro](https://drona.compari.ro/dji/mini-4-pro-rc-n2-cp-ma-00000731-01-p1003226242/) · [AeroCartwright, precizie Mini](https://aerocartwright.com/library/dji-mini-mapping-accuracy-benchmarks/) · [Bench-Mark, precizie Matrice 4E](https://bench-mark.ca/dji-matrice-4e-suitable-for-land-surveying/).

Calculatoare, citite la 19.11.2026: [Expert Tablă, calculator](https://experttabla.ro/calculator/ro/) · [Expert Tablă, întrebări frecvente](https://experttabla.ro/intrebari-frecvente) · [Expert Tablă, calcul la 4 ape](https://experttabla.ro/blog-acoperis/calcul-acoperis-in-4-ape) · [Tinu House Art](https://tinuhouseart.ro/calculator/acoperis) · [Tigla-online](https://www.tigla-online.ro/calculator-tabla-tigla/).
