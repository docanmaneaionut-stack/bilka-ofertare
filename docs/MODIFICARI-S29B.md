# MODIFICĂRI S29b — accesoriile la lungimi și ordinea finisajelor

Versiunea 1.5 · 26 noiembrie 2026 (decizia 4: BUG-28 aprobat de Ionuț pentru S30) · v1.4 · 26 noiembrie 2026 (cauza BUG-24 găsită de Code și deciziile de la planul S29b — secțiunea de la sfârșit) · v1.3 · 26 noiembrie 2026 (rândurile listei de pornire le adaugă Code în S29b, odată cu codul care le citește; ordinea numerotată 1–13) · v1.2 · 25 noiembrie 2026 (din raportul S29: se adaugă **BUG-26** și **BUG-27**; completare la BUG-24) · v1.1 · 25 noiembrie 2026 (confirmate de Ionuț: Magnelis și Aluzinc la sfârșitul listei, în ordinea asta; confirmarea la ștergerea unui bloc întreg, peste tot în editor) · v1.0 · 25 noiembrie 2026 · Scris de Claude (chat) din observațiile lui Ionuț (25.11, după o ofertă reală de accesorii speciale la metru liniar). Format ca la celelalte `MODIFICARI-Sxx.md`: *Acum · Corect ar fi · Exemplu · Cum se verifică · Nu se atinge*. Lotul S29b = corecțiile **BUG-24**, **BUG-26**, **BUG-27** și **BUG-25** din `CERERI-BUG-S25.md` (în ordinea asta: întâi cele care ating corectitudinea) + **M14**. Se face imediat după S29 (pagina ofertei pe file), înaintea S30. Motorul nu se atinge: dacă la BUG-24 cauza se dovedește în `mot/`, Code se oprește și spune — întâi etalonul, apoi codul.

---

## Corecțiile luate în S29b (din `CERERI-BUG-S25.md`) — BUG-24 se face primul

- **BUG-24** — la **accesoriile la lungimi (ML)**, rândurile de lungime × bucăți **adăugate ulterior** la o desfășurată deja introdusă nu se mai adună la metrii liniari și nu ajung în formularul Bilka. Corect: orice rând adăugat, oricând — în aceeași deschidere a ofertei sau după salvare și redeschidere —, intră în cantitatea poziției (ml = Σ lungime × bucăți, 3 zecimale), în preț, pe documente și în formular. E cea mai gravă din lot: greșește cantitatea, prețul și comanda la fabrică.
  *Completare (raportul S29):* până la S29, o poziție fără lungimi completate pleca în ofertă drept cantitate 1; ofertele salvate înainte pot avea astfel de linii — intră în lista pentru Ionuț.
- **BUG-26** — la **Speciale 2 ML**, după redeschiderea ofertei, lista de trepte arată „D01” și „1–50 mm” pe rândurile salvate, deși produsul e cel corect (de exemplu D05). Corect: rândul salvat arată treapta lui; schimbarea cantității nu schimbă produsul.
- **BUG-27** — la **sistemul pluvial**, după redeschidere, sistemul unei linii salvate apare „125 / 90” și când e „150 / 100”, iar o piesă adăugată apoi intră la 125 (confirmat pe ecran la planul S29b). Corect: sistemul salvat apare cum e, liniile salvate nu-și schimbă produsul, iar piesele adăugate după redeschidere intră în același sistem.
- **BUG-25** — tot acolo, butonul care elimină **toată poziția** stă lângă „+ Adaugă rând"; un clic din greșeală șterge tot ce s-a scris la acea desfășurată. Corect: fiecare rând are coșul lui (șterge doar rândul), iar eliminarea poziției întregi stă în capul poziției, departe de „+ Adaugă rând", și cere confirmare când poziția are ceva completat. Aceeași regulă la celelalte blocuri cu rânduri din editor — șipca, sistemele pluviale adăugate, secțiunile de sine stătătoare, învelitoarea secundară (aprobat de Ionuț, 25.11.2026). De reverificat de Ionuț pe pagina nouă, după S29.

---

## M14 — Ordinea finisajelor în listele de selecție — APROBAT (cererea lui Ionuț, 25.11.2026)

**Acum.** Listele derulante de finisaj arată finisajele în altă ordine decât cea în care se lucrează.

**Corect ar fi.**
- Peste tot unde se alege un finisaj — cascada învelitorii, secțiunile de sine stătătoare, accesoriile la lungimi, șipca, sistemul pluvial, „Află preț", filtrele din Zona tehnică — ordinea e:
  **1 lucios · 2 mat · 3 Grande Mat · 4 Wood · 5 RAL 8003 · 6 zincat · 7 dubluvopsit lucios · 8 dubluvopsit lucios SSAB · 9 dubluvopsit mat · 10 dubluvopsit mat SSAB.**
- Unde nu există toate finisajele, cele care există își păstrează ordinea între ele (la sistemul pluvial: lucios, mat…).
- „colorat (lucios)" de la sistemul pluvial ține locul lui „lucios" (în listă stă imediat după el; cele două nu apar niciodată în aceeași listă derulantă).
- Finisajele care nu sunt în lista lui Ionuț — azi **Magnelis** și **Aluzinc** — vin după cele zece, în ordinea asta (confirmat de Ionuț, 25.11.2026: le omisese din listă). Un finisaj nou, nepus încă în listă, apare la sfârșit, alfabetic.
- Ordinea stă într-o **listă de referință**, nu în cod: Admin general o poate schimba din Zona tehnică. Lista de pornire: `docs/import/configurare/optiuni-liste.csv`, lista `ordine_finisaj` — rândurile de mai jos le adaugă **Code, în S29b**, odată cu codul care le citește (excepție punctuală de la regula „`docs/` e scris doar de Claude chat”: doar aceste rânduri, nimic altceva din fișier). Dacă ordinea se ține mai bine altundeva, Code spune în plan.

**Exemplu.** Țiglă metalică Iberic: lucios · mat · Grande Mat · Wood · RAL 8003. Sistem pluvial: colorat (lucios) · mat · Magnelis · Aluzinc. Tablă cutată: lucios · mat · Grande Mat · Wood · RAL 8003 · zincat · dubluvopsit lucios · dubluvopsit lucios SSAB · dubluvopsit mat · dubluvopsit mat SSAB · Magnelis.

**Cum se verifică.** Test pe funcția de ordonare: lista completă, liste parțiale, un finisaj necunoscut (la sfârșit), „colorat (lucios)" pe locul lui „lucios", schimbarea ordinii din lista de referință. În browser: cascada unei țigle și a unei table cutate, sistemul pluvial, o poziție la lungimi, o secțiune de sine stătătoare.

**Nu se atinge.** Catalogul și prețurile; ce finisaje există pentru un produs (vine tot din catalog); ordinea grosimilor și a culorilor; motorul.

**Lista de pornire** (rândurile care intră în `optiuni-liste.csv`):

| lista | valoare | ordine |
|---|---|---|
| ordine_finisaj | lucios | 1 |
| ordine_finisaj | colorat (lucios) | 2 |
| ordine_finisaj | mat | 3 |
| ordine_finisaj | Grande Mat | 4 |
| ordine_finisaj | Wood | 5 |
| ordine_finisaj | RAL 8003 | 6 |
| ordine_finisaj | zincat | 7 |
| ordine_finisaj | dubluvopsit lucios | 8 |
| ordine_finisaj | dubluvopsit lucios SSAB | 9 |
| ordine_finisaj | dubluvopsit mat | 10 |
| ordine_finisaj | dubluvopsit mat SSAB | 11 |
| ordine_finisaj | Magnelis | 12 |
| ordine_finisaj | Aluzinc | 13 |

Numele sunt cele din listele Bilka importate (`docs/import/bilka/*.csv`, coloana `finisaj`), verificate pe 25.11.2026: cele treisprezece de mai sus sunt toate finisajele din catalog.

---

## Ce a găsit Code la planul S29b (26.11.2026) și ce s-a hotărât

**Cauza BUG-24.** Motorul e corect și nu se atinge. În editor sunt patru defecte reale, toate reproduse; primele două explică „nu se mai adună și nu ajung în formular”:
- **a. Salvarea refuzată blochează tot ce scrii după ea.** Un rând neterminat (lungimea „5,”) sau o poziție nouă fără culoare face serverul să refuze toată salvarea; rândurile bune adăugate apoi nu mai ajung în ofertă cât rămâne rândul cu problema. Singurul semn era „eroare la salvare”, sus; la plecarea din pagină nu avertiza nimic, iar statusul și formularul Bilka se puteau face pe cantitatea veche. Se întâmplă la fel la panotajul învelitorii și la șipcă.
- **b. Două poziții cu aceeași desfășurată și aceeași culoare** arată amândouă metrii primei (în ofertă sunt corecte).
- **c. După redeschidere, lista de trepte arată „D01” la orice poziție salvată**; dacă atingi apoi Finisajul sau Grosimea, **produsul se schimbă pe tăcute în D01**. Aceeași rădăcină ca BUG-26 și BUG-27.
- **d. Un rând cu lungime, dar fără bucăți**, e sărit fără niciun semn (la fel la panotaj și la șipcă).

**BUG-26** — confirmat pe ecran. **BUG-27** — confirmat pe ecran: un sistem 150 / 100 apare după redeschidere „125 / 90”, iar o piesă adăugată apoi intră la 125 (sisteme amestecate în ofertă).

**Baza de lucru (doar citită):** cele 5 oferte cu accesorii la lungimi — IDM-0018, IDM-0026, IDM-0032, IDM-0033, MGM-0004, toate „Comandat” — au metrii salvați egali cu suma rândurilor, iar formularele citite înapoi au toate rândurile salvate. **Atenție:** verificarea asta nu poate vedea rândurile care n-au ajuns niciodată în ofertă (defectul a) și nici o treaptă schimbată pe tăcute (defectul c) — acelea nu lasă urmă. Siguranța o dă doar compararea cu comanda făcută clasic; o face Ionuț.

**Deciziile de la plan (26.11.2026)** — propunerile lui Code, cu precizările lui Claude chat; sunt cele din mesajul cu care Ionuț aprobă planul:
1. **Salvarea refuzată rămâne „totul sau nimic”, dar la vedere**: rândul cu problema se marchează pe loc, cu mesajul lângă el (marcajul apare la ieșirea din căsuță, nu la fiecare tastă); cât salvarea e refuzată, starea din rândul ofertei spune limpede că oferta **nu e salvată**, ce e de corectat și unde, un clic duce la rând, iar fila Produse are punctul roșu cât ține; la plecarea din pagină cu modificări nesalvate apare o avertizare. Rândul cu lungime și fără bucăți (sau invers) se marchează „incomplet” (lungimi, panotaj, șipcă). Rândurile goale de produs — fără cantitate, BUG-20 — **nu** sunt „incomplete”: nu se marchează și nu opresc nimic. Salvarea parțială (fără rândul greșit) nu se face acum; dacă în lucru refuzul se dovedește incomod, se rediscută.
2. **Oprire la status, la documente și la acțiunile din „⋯”**: înainte de schimbarea statusului, de generarea oricărui document (PDF-uri, formulare Bilka) și de copiere / variantă / completare / preluare de prețuri, pagina trimite întâi ce e nesalvat; dacă salvarea e refuzată sau există un rând „incomplet”, se oprește și arată unde. Regulile statusurilor de pe server nu se schimbă (acordul explicit cerut de Code: e dat prin mesajul de aprobare și privește doar butoanele de pe pagină).
3. **Panotajul învelitorii rămâne fără coș pe rând** (așezarea aprobată în S25); rândul se golește din căsuțe.
4. **Formularul Bilka generat înainte de o modificare a produselor** rămâne azi în listă fără semn — nu intră în S29b; e BUG-28 în `CERERI-BUG-S25.md`, **aprobat de Ionuț pentru S30** (26.11.2026: formularul apare „generat pe necesarul vechi”).
5. **Treapta și sistemul**: oferta redeschisă își aduce treapta fiecărei linii și sistemul pluvial salvat; niciun selector atins după redeschidere nu schimbă pe tăcute produsul unei linii salvate (lungimi, speciale 2 ML, pluvial) — cu test. Aceeași rădăcină se caută la **toate** rubricile unde selectoarele se refac la redeschidere (cascada învelitorii, învelitoarea secundară, secțiunile de sine stătătoare, șipca, sistemele pluviale adăugate); unde există, se corectează la fel, cu test, și se spune în raport.
6. **Liste de pe baza de lucru, doar citire, la raport — pentru Ionuț:** ofertele cu piese de 125 și de 150 în același sistem pluvial (urma defectului BUG-27); liniile de accesorii speciale (2 ML și la lungimi) aflate pe D01 (urma defectului c) — număr de ofertă, status, produs, cantitate; și pe ce alte căi s-ar fi putut schimba un produs pe tăcute până acum. Nimic nu se corectează de la sine pe ofertele existente.
7. **BUG-25**: la lungimi coșul pe rând există deja; se adaugă la pozițiile de șipcă și la tronsoane. Eliminarea blocului se mută în antetul lui, cu nume limpede („Scoate accesoriul”, nu „Scoate rândul”), cu confirmare când blocul are ceva completat. Coșul de pe rând nu scoate niciodată blocul întreg, nici când e ultimul rând.
8. **M14**: lista `ordine_finisaj` stă în lista de opțiuni din bază (fără migrare), se schimbă din Zona tehnică → Referințe; unde azi se preselectează „primul finisaj”, primul devine cel din ordinea nouă; ofertele salvate nu se schimbă.
