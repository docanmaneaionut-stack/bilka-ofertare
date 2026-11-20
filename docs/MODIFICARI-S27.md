# MODIFICĂRI S27 — lotul următor (se strâng; se construiesc când merită o sesiune)

Versiunea 0.4 · 20 noiembrie 2026 (M9: varianta A — motorul neatins, E13 aprobat; deciziile de la BUG-15 / BUG-16 din planul lui Code) · v0.3 · 20 noiembrie 2026 (M9 cu etalonul E13 scris; M10 — tabelul de comenzi; lotul S27 = M9, M10, BUG-15, BUG-16) · v0.2 · 19 noiembrie 2026 (M9 aprobat: și pentru o a doua cheie) · Scris de Claude (chat) din observațiile lui Ionuț din testarea în paralel. Format ca la `MODIFICARI-S26.md`: *Acum · Corect ar fi · Exemplu · Cum se verifică · Nu se atinge*. Statusul fiecărei modificări: **PROPUS** (de confirmat de Ionuț) → **APROBAT** → construit într-o sesiune S27. Corecțiile mici (fără schimbare de fișă) stau în `CERERI-BUG-S25.md`.

---

## M9 — Accesorii speciale 2 ML de sine stătătoare, cu cheia lor (fără învelitoare sau pentru o a doua cheie) — APROBAT de Ionuț (19.11.2026)

**Acum.** Accesoriile speciale 2 ML (FISA-OFERTARE cap. 5) **moștenesc cheia învelitorii principale** (finisaj, grosime, culoare) și nu pot fi alese direct; fără învelitoare pe ofertă nu există unde să se aleagă cheia lor. Secțiunile de sine stătătoare din cap. 3.8 (decise 11.09.2026) acoperă doar **tinichigeria standard** și **fixarea și etanșarea**. La export, în formularul Bilka, specialele 2 ML merg sub cheia formularului (macro-ul construiește codul SAP din numele rândului + cheia acoperișului principal), deci „se preiau ca cele standard".

**Corect ar fi.** Cap. 3.8 se extinde la **accesoriile speciale 2 ML**: butonul „+ Accesorii speciale 2 ML de sine stătătoare" creează o rubrică cu **cheia ei aleasă direct** (finisaj → grosime → culoare, din cascada catalogului, ca la secțiunile standard de sine stătătoare), cu aceleași 6 rânduri presetate pe D01 și „+" pentru altele. Regulile de pachet rămân cele din 3.4–3.5: la export, **un formular fără învelitoare per cheie**, în care intră împreună secțiunile de sine stătătoare cu aceeași cheie (standard + fixare + speciale 2 ML); o cheie diferită = alt formular. Rubrica legată de învelitoare rămâne cum e (moștenește strict).

**Exemplu.** Ofertă fără învelitoare: „Accesorii speciale 2 ML — mat 0,50 RAL 8017": colțar exterior 12 ml, șorț de streașină 8 ml → un formular Bilka fără învelitoare, cu cheia mat / 0,50 / 8017, cu cele două rânduri pe foaia de speciale. Dacă oferta are și „Fixare și etanșare — mat 0,50 RAL 8017" de sine stătătoare, intră în același formular; o secțiune „lucios 0,50 RAL 3005" face al doilea formular.

**Cum se verifică.** (1) **Etalonul E13** (`docs/etalon/E13.json`, ETALON.md v1.6 — scris de Claude chat, calcul de mână validat pe E01, E06, E10, E11, E12): ofertă fără învelitoare cu două rubrici de speciale 2 ML de sine stătătoare — 8017 mat 0,50 (D05 × 16, D08 × 6) și 9005 lucios 0,50 (D06 × 10) — plus fixare de sine stătătoare 8017 (holțșuruburi × 2); agent 1 %, țintă 20 %: achiziție 178,00 EUR = 1.163,49 lei cu TVA → document 215,74 + 45,31 = 261,05 EUR → **1.396,23 lei**; **2 formulare** fără învelitoare (8017 mat 0,50: specialele + fixarea; 9005 lucios 0,50: specialele). (2) **Cazul cu învelitoare**: E01 + o linie de sine stătătoare ASP06LUC050 × 10 cu cheia 9005 lucios 0,50 → formularele = formularul E01 neschimbat + un formular fără învelitoare cu cheia 9005 lucios 0,50 (în acest test se verifică doar formularele și pachetele — ținta fixă a E01 mută prețurile). (3) Test pe generator: celulele cheii, rândurile de speciale 2 ML, hash-urile VBA. (4) În browser: butonul, cascada cheii, rubrica fără învelitoare și pe lângă învelitoare, exportul. Cele 12 oferte-model vechi rămân la zero; cu E13 sunt 13 oferte-model (14 teste în suită). **Proba lui Code (20.11)**: motorul dă deja cifrele E13 și cele două formulare — M9 se face în editor și se confirmă pe generator, fără modificări în `mot/` (varianta A, fără tag nou); pachetele sunt cele două secțiuni pe cheie.

**Nu se atinge.** Motorul (`mot/` — acceptă deja liniile de sine stătătoare; E13 îl fixează ca etalon), rubrica legată de învelitoare, formularul Bilka (VBA).

**Decizia lui Ionuț (19.11.2026):** rubrica de sine stătătoare există **și când oferta are învelitoare**, pentru o a doua cheie — caz real: închiderile perimetrale de o culoare și glafurile de la geamuri de altă culoare, pentru contrast pe fațadă. Deci: specialele 2 ML legate de învelitoare rămân cum sunt (moștenesc strict), iar „+ Accesorii speciale 2 ML de sine stătătoare” se poate apăsa oricând, o rubrică per cheie; la export, cheia diferită = formular fără învelitoare separat, cu cheia ei. Până la S27, ocolirea (o secțiune standard de sine stătătoare cu cheia dorită) e de verificat în soft; dacă nu merge, comanda se face pe formularul Bilka de mână.

---

## M10 — Tabelul de comenzi: coloana 1 fără responsabil, coloana Client cu adresa lucrării — APROBAT (cererea lui Ionuț, 20.11.2026)

**Acum.** Coloana 1 arată numărul, data și **responsabilul** dedesubt („trimisă de Ionuț B."; la comenzile manuale „adăugat de Maria P. pentru: Dănuț S.") — decizia din 13.10.2026 (COMENZI cap. 1). Coloana Client arată numele, localitatea și telefonul; **adresa lucrării nu apare**.

**Corect ar fi.**
- **Coloana 1**: doar **seria și numărul** și, dedesubt, **data comenzii**. Responsabilul se mută în **rândul desfășurat**, ca primă linie deasupra casetelor: „Responsabil: trimisă de …" / „adăugat de … pentru: …". Pastila **„neidentificată"** (comandă manuală fără cont alocat) rămâne în coloana 1 — e o stare de rezolvat, numărată în capul tabelului, nu un nume *(adaosul lui Claude chat; de confirmat de Ionuț — dacă nu o vrea, se mută și ea în rândul desfășurat)*.
- **Coloana 2 (Client)**: numele, **localitatea și adresa lucrării** pe un rând („Cotești · str. Probei 1"), telefonul; la completări „completare la …" rămâne. La comenzile manuale, ce există (localitatea; adresa dacă a fost scrisă). Căutarea găsește și după adresă.
- Filtrul pe agent, căutarea după numele agentului și vizibilitatea rămân cum sunt. Pe telefon: cardul primește localitatea și adresa sub client; responsabilul apare la desfășurare.

**Exemplu.** „IDM-0007 · 12.11.2026 | SC Agrovest SRL · Focșani · str. Mare 12 · 0730 126 010 | …"; desfășurat: „Responsabil: trimisă de Ionuț B.". „CM-0002 · 19.11.2026 · neidentificată | …"; desfășurat: „Responsabil: adăugat de Maria P.; cont nealocat".

**Cum se verifică.** Test pe răspunsul listei (adresa lucrării prezentă; căutarea după adresă); în browser, desktop și 390 px: coloana 1 fără nume, rândul desfășurat cu responsabilul, coloana Client cu localitatea și adresa.

**Nu se atinge.** Ordinea, filtrele, numărătorile, celelalte coloane, fișa șoferului (are deja adresa).

---

## Corecții luate în S27 (din `CERERI-BUG-S25.md`)

- **BUG-15** — autocompletare și pe **numele** clientului la ofertă nouă (de la 3 litere; telefonul și localitatea alături; alegerea completează datele și leagă oferta de client; telefonul rămâne cheia de deduplicare).
- **BUG-16** — montatorul de execuție scris de mână **intră în lista autorului ofertei** (și când îl scrie Gestiunea sau un Administrator pe comandă), ca să apară la autocompletare data următoare.

**Decizii la planul S27 (20.11.2026):** BUG-15 — sugestiile pe nume arată doar clienții cu oferte vizibile contului și pe cei creați de el (căutarea după telefon rămâne pe toată baza); un client ales din listă fără telefon se leagă prin alegere, nu se dublează. BUG-16 — „adăugat de …” e o coloană nouă pe lista de persoane (migrarea 22, aditivă); „clientul este montatorul” intră și el în listă; la comanda manuală montatorul intră în lista contului alocat, dacă există.
