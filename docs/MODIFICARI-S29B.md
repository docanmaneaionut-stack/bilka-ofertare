# MODIFICĂRI S29b — accesoriile la lungimi și ordinea finisajelor

Versiunea 1.1 · 25 noiembrie 2026 (confirmate de Ionuț: Magnelis și Aluzinc la sfârșitul listei, în ordinea asta; confirmarea la ștergerea unui bloc întreg, peste tot în editor) · v1.0 · 25 noiembrie 2026 · Scris de Claude (chat) din observațiile lui Ionuț (25.11, după o ofertă reală de accesorii speciale la metru liniar). Format ca la celelalte `MODIFICARI-Sxx.md`: *Acum · Corect ar fi · Exemplu · Cum se verifică · Nu se atinge*. Lotul S29b = corecțiile **BUG-24** și **BUG-25** din `CERERI-BUG-S25.md` + **M14**. Se face imediat după S29 (pagina ofertei pe file), înaintea S30. Motorul nu se atinge: dacă la BUG-24 cauza se dovedește în `mot/`, Code se oprește și spune — întâi etalonul, apoi codul.

---

## Corecțiile luate în S29b (din `CERERI-BUG-S25.md`) — BUG-24 se face primul

- **BUG-24** — la **accesoriile la lungimi (ML)**, rândurile de lungime × bucăți **adăugate ulterior** la o desfășurată deja introdusă nu se mai adună la metrii liniari și nu ajung în formularul Bilka. Corect: orice rând adăugat, oricând — în aceeași deschidere a ofertei sau după salvare și redeschidere —, intră în cantitatea poziției (ml = Σ lungime × bucăți, 3 zecimale), în preț, pe documente și în formular. E cea mai gravă dintre cele trei: greșește cantitatea, prețul și comanda la fabrică.
- **BUG-25** — tot acolo, butonul care elimină **toată poziția** stă lângă „+ Adaugă rând"; un clic din greșeală șterge tot ce s-a scris la acea desfășurată. Corect: fiecare rând are coșul lui (șterge doar rândul), iar eliminarea poziției întregi stă în capul poziției, departe de „+ Adaugă rând", și cere confirmare când poziția are ceva completat. Aceeași regulă la celelalte blocuri cu rânduri din editor — șipca, sistemele pluviale adăugate, secțiunile de sine stătătoare, învelitoarea secundară (aprobat de Ionuț, 25.11.2026). De reverificat de Ionuț pe pagina nouă, după S29.

---

## M14 — Ordinea finisajelor în listele de selecție — APROBAT (cererea lui Ionuț, 25.11.2026)

**Acum.** Listele derulante de finisaj arată finisajele în altă ordine decât cea în care se lucrează.

**Corect ar fi.**
- Peste tot unde se alege un finisaj — cascada învelitorii, secțiunile de sine stătătoare, accesoriile la lungimi, șipca, sistemul pluvial, „Află preț", filtrele din Zona tehnică — ordinea e:
  **1 lucios · 2 mat · 3 Grande Mat · 4 Wood · 5 RAL 8003 · 6 zincat · 7 dubluvopsit lucios · 8 dubluvopsit lucios SSAB · 9 dubluvopsit mat · 10 dubluvopsit mat SSAB.**
- Unde nu există toate finisajele, cele care există își păstrează ordinea între ele (la sistemul pluvial: lucios, mat…).
- „colorat (lucios)" de la sistemul pluvial ține locul lui „lucios".
- Finisajele care nu sunt în lista lui Ionuț — azi **Magnelis** și **Aluzinc** — vin după cele zece, în ordinea asta (confirmat de Ionuț, 25.11.2026: le omisese din listă). Un finisaj nou, nepus încă în listă, apare la sfârșit, alfabetic.
- Ordinea stă într-o **listă de referință**, nu în cod: Admin general o poate schimba din Zona tehnică. Lista de pornire: `docs/import/configurare/optiuni-liste.csv`, lista `ordine_finisaj` (o scrie Claude chat la închiderea S29, ca să nu schimbe datele de pornire în timpul sesiunii).

**Exemplu.** Țiglă metalică Iberic: lucios · mat · Grande Mat · Wood · RAL 8003. Sistem pluvial: colorat (lucios) · mat · Magnelis · Aluzinc. Tablă cutată: lucios · mat · Grande Mat · Wood · RAL 8003 · zincat · dubluvopsit lucios · dubluvopsit lucios SSAB · dubluvopsit mat · dubluvopsit mat SSAB · Magnelis.

**Cum se verifică.** Test pe funcția de ordonare: lista completă, liste parțiale, un finisaj necunoscut (la sfârșit), „colorat (lucios)" pe locul lui „lucios", schimbarea ordinii din lista de referință. În browser: cascada unei țigle și a unei table cutate, sistemul pluvial, o poziție la lungimi, o secțiune de sine stătătoare.

**Nu se atinge.** Catalogul și prețurile; ce finisaje există pentru un produs (vine tot din catalog); ordinea grosimilor și a culorilor; motorul.

**Lista de pornire** (rândurile care intră în `optiuni-liste.csv`):

| lista | valoare | ordine |
|---|---|---|
| ordine_finisaj | lucios | 1 |
| ordine_finisaj | colorat (lucios) | 1 |
| ordine_finisaj | mat | 2 |
| ordine_finisaj | Grande Mat | 3 |
| ordine_finisaj | Wood | 4 |
| ordine_finisaj | RAL 8003 | 5 |
| ordine_finisaj | zincat | 6 |
| ordine_finisaj | dubluvopsit lucios | 7 |
| ordine_finisaj | dubluvopsit lucios SSAB | 8 |
| ordine_finisaj | dubluvopsit mat | 9 |
| ordine_finisaj | dubluvopsit mat SSAB | 10 |
| ordine_finisaj | Magnelis | 11 |
| ordine_finisaj | Aluzinc | 12 |

Numele sunt cele din listele Bilka importate (`docs/import/bilka/*.csv`, coloana `finisaj`), verificate pe 25.11.2026: cele treisprezece de mai sus sunt toate finisajele din catalog.
