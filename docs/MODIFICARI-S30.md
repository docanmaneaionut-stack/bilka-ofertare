# MODIFICĂRI S30 — locația lucrării pe ofertă

Versiunea 1.0 · 25 noiembrie 2026 (**APROBAT** de Ionuț: câmpul lângă adresa lucrării, pragul de 100 m) · v0.2 · 25 noiembrie 2026 (locul câmpului precizat: lângă adresa lucrării **a ofertei**) · v0.1 · 25 noiembrie 2026 · Scris de Claude (chat) din cererea lui Ionuț (25.11: „ar fi ideal să poți salva locația de la client, din curte") și din fișa `FISA-NOTITE-SCHITA.md` §3 (închisă 16.10.2026: locația lucrării se vede pe ofertă, pe comandă și pe fișa șoferului; două surse — link de hartă primit sau „folosește locația mea"). Pe **comandă** linkul la locație există din S23; pe **ofertă** încă nu. Lotul S30 = **M13**. Motorul nu e atins. Simulare: `docs/design/simulari/S29-simulare-navigare-oferta-v3.pdf`, paginile 3 și 4.

---

## M13 — Locația lucrării se salvează pe ofertă: link lipit, coordonate scrise sau „Ia locația de aici" — APROBAT (Ionuț, 25.11.2026: câmpul lângă adresa lucrării, pragul de 100 m; principiul era decis din 16.10.2026, fișa NOTIȚE §3)

**Acum.** Oferta are localitatea și adresa lucrării, ca text. Locația pe hartă se poate scrie abia **după „Comandat"**, pe comandă (S23: un link http / https în caseta „Livrare și facturare", cu istoric; apare pe fișa șoferului ca „locația pe hartă"). Agentul care măsoară, în curtea clientului, nu are unde s-o pună.

**Corect ar fi.**
- **Câmpul „Locația lucrării"**, pe ofertă, în fila *Date generale*, lângă **adresa lucrării a ofertei** (câmpurile „Adresa lucrării" / „Localitatea lucrării" de azi; simularea le arată grupate cu clientul). Ține de **lucrare**, nu de fișa clientului (un client poate avea mai multe lucrări — regula de la BUG-18). E opțional și nu blochează niciun status.
- **Trei feluri de a o pune**, cu același rezultat:
  1. **Lipești un link de hartă** primit sau copiat (Google Maps, Waze, Apple Maps, locația trimisă pe WhatsApp) — doar http / https, ca pe comandă.
  2. **Scrii coordonatele** citite de pe telefon, de exemplu `45.69612, 27.18446` (se acceptă și cu virgulă zecimală — `45,69612 27,18446` — și forma cu grade, minute și secunde pe care o arată hărțile). Softul le verifică (latitudine și longitudine valide; avertizează dacă pică în afara României) și face el linkul de hartă.
  3. **„Ia locația de aici"** — softul cere poziția aparatului și o arată **cu precizia ei** („± 6 m"), apoi o salvezi. Dacă precizia e mai slabă de **100 m**, softul **nu o salvează** și spune de ce: „poziție prea aproximativă (± … m) — aparatul nu are GPS; ia locația de pe telefon sau scrie coordonatele".
- **Ce se vede după salvare**: coordonatele (când se cunosc) sau linkul, de unde vine („lipită", „scrisă", „GPS ± 6 m"), cine și când; butonul **„Deschide pe hartă"** și coșul (șterge, doar cu clic). Orice schimbare intră în istoricul ofertei.
- **De la ofertă la comandă — o singură locație pe lucrare**: până la „Comandat" se scrie pe ofertă; **la „Comandat" trece pe comandă**, în câmpul existent din S23 (deci apare în „Livrare și facturare" și pe fișa șoferului fără nimic în plus); după „Comandat" se corectează **din comandă**, de cine poate azi (Gestiune, Administratori, agentul pe comenzile lui), iar pagina ofertei o arată pe aceea. Unde softul preia azi adresa lucrării dintr-o ofertă în alta (completarea la o lucrare), preia și locația.
- **Unde lucrează butonul „Ia locația de aici"** — limite ale browserelor și ale aparatelor, nu ale softului:
  - browserul dă poziția **doar pe adresă securizată (https)**: butonul lucrează de când softul e pe `roofdata.ro` (Faza 3); pe adresa din rețeaua biroului (`http://192.168…`) apare stins, cu explicația dedesubt. Linkul lipit și coordonatele scrise merg de pe acum, de oriunde;
  - **telefon** și **tabletă cu GPS**: poziția vine din GPS, la câțiva metri, **și fără internet** (GPS-ul nu are nevoie de internet; prima citire poate dura până la un minut);
  - **laptop** și tabletă fără GPS: poziția e ghicită din rețea — fără internet nu vine deloc, cu internet poate greși cu sute de metri sau mai mult; de aceea pragul de 100 m. Pe laptop se scriu coordonatele de pe telefon sau se lipește linkul.
- **Fără internet** (când va exista modul offline, după Faza 3): locația se salvează pe aparat odată cu oferta și urcă la sincronizare împreună cu ea; butonul merge fără internet pe telefon și pe tableta cu GPS, coordonatele scrise merg pe orice aparat.

**Exemplu.** În curtea clientului, cu telefonul: fila Date generale → „Ia locația de aici" → „45.69612, 27.18446 · ± 6 m" → Salvează. La „Comandat", comanda are deja locația în „Livrare și facturare", iar fișa șoferului are „locația pe hartă". Cu laptopul: pe telefon, în aplicația de hărți, ții apăsat pe hartă în locul unde ești → apare un ac cu coordonatele lui (GPS-ul telefonului merge și fără internet) → le scrii în câmp.

**Cum se verifică.** Teste: linkul (doar http / https; altceva → refuz cu mesaj); coordonatele în cele trei scrieri → aceeași pereche de numere și același link; valori imposibile → refuz; precizie 6 m → se salvează, 2.300 m → nu se salvează; intrarea în istoricul ofertei; la „Comandat" comanda primește locația, iar comenzile vechi și cele manuale rămân neschimbate; completarea preia locația. În browser, pe `localhost`, cu poziția simulată și cu permisiunea acordată / refuzată, desktop și 390 px: cele trei feluri, „Deschide pe hartă", butonul stins pe adresă nesecurizată, mesajul la permisiune refuzată. Capturi pentru Ionuț.

**Nu se atinge.** Motorul; documentele pentru client (locația nu apare pe niciun PDF de ofertă); fișa șoferului și caseta „Livrare și facturare" (primesc doar valoarea); fișa clientului; regulile statusurilor. Migrare aditivă.

**Decizii (Ionuț, 25.11.2026):** locul câmpului — în fila Date generale, lângă adresa lucrării; pragul de 100 m pentru poziția luată cu butonul. Corectarea locației după „Comandat” rămâne **din comandă**, cum e azi (S23) — Ionuț nu a cerut altceva.
