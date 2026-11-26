# MODIFICĂRI S31 — ștergerea ofertelor „În lucru”, metoda de plată, felul încasării

Versiunea 0.1 · 26 noiembrie 2026 · Scris de Claude (chat) din cererile lui Ionuț (26.11.2026: „aș vrea ca ofertele în lucru să poată fi șterse, pentru a nu aglomera inutil cu oferte care nu mai ajung oferte”; metoda de plată la trecerea în comandă și pe comandă, neobligatorie, notată în zona de încasări de agent sau de administrator; la încasări, bife rapide „rest plată, plată parțială, avans”, cu textul liber păstrat). Format ca la celelalte `MODIFICARI-Sxx.md`: *Acum · Corect ar fi · Exemplu · Cum se verifică · Nu se atinge*. Cele trei modificări sunt **cerute de Ionuț**; precizările marcate *[de confirmat]* și *[propunere]* sunt ale lui Claude chat și se închid cu Ionuț înainte de sesiune. Lotul S31 = **M15 + M16 + M17**, după S30. Motorul nu se atinge.

---

## M15 — Ofertele „În lucru” se pot șterge — CERUT de Ionuț (26.11.2026); forma de mai jos *[de confirmat]*

**Acum.** FISA-CONTURI §6 spune: „Nimic nu se șterge și nicio ofertă nu se anulează”. Orice ofertă începută — o probă, un calcul abandonat, o ofertă deschisă din greșeală — rămâne pentru totdeauna în lista de oferte, „În lucru”, și intră în numărători („14 în lucru”), în „⚠ Prețuri vechi” și în căutare. M15 e o **excepție** de la regulă, doar pentru ofertele „În lucru”.

**Corect ar fi.**
- O ofertă cu statusul **„În lucru”** se poate **șterge**: din meniul „⋯” al rândului din lista de oferte și din „⋯” de pe pagina ofertei. Ofertele în orice alt status nu au butonul; cele „Comandat” niciodată.
- **Cere confirmare**, cu ce se șterge la vedere: „Ștergi oferta IDM-0041 — Popescu Ion, Golești, 4.820 € — cu 2 variante și 3 atașamente? Da, șterge / Nu”. Dacă oferta a avut cândva alt status (are istoric), confirmarea o spune: „a fost transmisă pe 12.11.2026”.
- **Cine**: cei care pot schimba statusul ofertei — cine a făcut-o și Administratorul firmei (FISA-CONTURI §3).
- **Ce înseamnă „ștearsă”** *[de confirmat — propunerea lui Claude chat]*: oferta **dispare** din lista de oferte, din căutare, din numărători, din „⚠ Prețuri vechi” și din „Client cu mai multe oferte”, dar **rămâne în bază**, marcată „ștearsă”, cu cine a șters-o și când — cu tot ce ține de ea (variantele, notițele, atașamentele). Cei care o pot șterge au în lista de oferte filtrul **„Șterse (n)”** și butonul **„Readu”**, care o întoarce „În lucru”, neschimbată. O ștergere din greșeală se repară într-un clic, iar din bază nu se pierde nimic.
- **Numărul nu se refolosește**: numerotarea rămâne continuă pe serie, iar numărul ofertei șterse rămâne al ei; nu se renumerotează nimic.
- **Nu se poate șterge** o ofertă de care sunt legate completări — softul spune de ce.
- **Clientul** rămâne în baza comună, cu fișa lui; ștergerea ofertei nu atinge clientul.
- Pentru tot restul, regula din FISA-CONTURI §6 rămâne: ofertele transmise, de revizionat, acceptate, neacceptate, cu avans, de comandat și comandate **nu se șterg și nu se anulează**; conturile se dezactivează.

**Exemplu.** Agentul deschide „+ Ofertă nouă” ca să vadă un preț și salvează din reflex → oferta rămâne „În lucru”. Lista → „⋯” → „Șterge” → confirmare → oferta dispare, numărătoarea scade de la „14 în lucru” la „13 în lucru”. A doua zi vede că îi trebuia: filtrul „Șterse (1)” → „Readu” → e înapoi, „În lucru”, cu tot ce avea.

**Cum se verifică.** Teste: ștergerea unei oferte „În lucru” (dispare din listă, căutare și numărători; rămâne în bază cu cine / când); refuz pentru alt status și pentru alt cont; refuz când are completări legate; „Readu” o întoarce neschimbată (produse, variante, notițe, atașamente); numărul următor pe serie nu refolosește numărul șters; exportul și restaurarea păstrează ofertele șterse, cu marcajul lor. În browser: „⋯” → „Șterge” cu confirmare, filtrul „Șterse”, „Readu” — desktop și 390 px.

**Nu se atinge.** Motorul; numerotarea; ofertele în alt status și comenzile; baza de clienți. Migrare aditivă.

---

## M16 — Metoda de plată pe comandă — CERUT de Ionuț (26.11.2026); punctele *[de confirmat]* deschise

**Acum.** Cum plătește clientul nu are un loc al lui: se scrie, când se scrie, în textul „ce reprezintă” al unei încasări („tranșa 2 numerar”, „transfer bancar”) sau în observații.

**Corect ar fi.**
- Comanda are câmpul opțional **„Metoda de plată”**, ales dintr-o listă scurtă. Lista de pornire *[de confirmat de Ionuț]*: **numerar · card · transfer bancar (OP)**. Stă într-o listă de referință (`metoda_plata` în `docs/import/configurare/optiuni-liste.csv`, ca „sursa clientului”), nu în cod: Admin general o poate completa din Zona tehnică → Referințe.
- **La trecerea ofertei în „Comandat”**: pasul de confirmare are și câmpul „Metoda de plată” — **neobligatoriu**; lăsat gol nu oprește nimic. Ce se alege trece pe comandă. (Dacă azi „Comandat” nu are un pas de confirmare când nu lipsește nimic, Code spune în plan și propune locul.)
- **Pe comandă**: câmpul stă în caseta **Încasări** din rândul desfășurat, deasupra listei de încasări. Se completează sau se schimbă **de agent, pe comenzile lui, și de Administratorul firmei**; fiecare schimbare intră în istoricul comenzii (cine, când, ce era înainte). La **comanda manuală**: câmp opțional în „+ Comandă manuală”, apoi același loc.
- **Unde se vede**: în caseta Încasări; în tabelul de comenzi, în coloana „Încasat”, pe rândul mic de sub etichetă *[propunere]*; pe **fișa șoferului**, lângă „de încasat” *[de confirmat — FISA-COMENZI cap. 4c e închis cu „nimic altceva nu se adaugă”; aici ar ajuta: șoferul știe dacă are de luat bani la livrare]*.
- *[De confirmat]* **O metodă pe comandă sau și pe fiecare încasare?** Forma de mai sus e o singură metodă pe comandă („cum plătește clientul”). Dacă se vrea și la fiecare sumă notată (avans numerar, rest prin bancă), „+ Notează încasare” primește același câmp, precompletat cu metoda comenzii.

**Exemplu.** IDM-0052 → „Comandat”, cu „transfer bancar (OP)” → pe comandă, în caseta Încasări: „Metoda de plată: transfer bancar (OP)”. Clientul se răzgândește și plătește restul la livrare: agentul schimbă în „numerar”; istoricul arată ambele valori, cu cine și când.

**Cum se verifică.** Teste: „Comandat” cu metodă și fără (fără → comanda fără metodă, nimic oprit); schimbarea pe comandă de către agentul comenzii și de Administratorul firmei, cu istoric; refuz pentru celelalte conturi; valoare din afara listei → refuz; comanda manuală cu și fără metodă; exportul și restaurarea. În browser: pasul de la „Comandat”, caseta Încasări, tabelul — desktop și 390 px.

**Nu se atinge.** Statusul încasării (rezultă tot din sumele confirmate); cine notează și confirmă încasările (doar Administratorul firmei); documentele pentru client; motorul. Migrare aditivă.

---

## M17 — Felul încasării: avans · plată parțială · rest de plată — CERUT de Ionuț (26.11.2026)

**Acum.** La „+ Notează încasare” se scriu suma, data și un text obligatoriu „ce reprezintă” (FISA-COMENZI cap. 2). De cele mai multe ori textul e unul din trei: avans, plată parțială, rest de plată — scris de mână de fiecare dată.

**Corect ar fi.**
- Lângă sumă, trei bife rapide, cu un singur clic: **Avans · Plată parțială · Rest de plată**. Se alege cel mult una; al doilea clic pe aceeași o scoate.
- Bifa **completează singură** textul „ce reprezintă” cu numele ei; textul rămâne la vedere și se poate completa („Avans — luat de agent”) sau înlocui. **Fără bifă**, textul se scrie de mână, ca azi — pentru orice altceva. O încasare are deci mereu o explicație: bifa, textul sau amândouă.
- *[Propunere]* Bifa „Rest de plată” pe o sumă necompletată pune în sumă restul de încasat al comenzii (se poate schimba); sub sumă, softul arată cât rămâne după această încasare.
- Avansul venit de la „Avans luat” (încasarea propusă la „Comandat”) primește singur felul „Avans”.
- În lista de încasări, felul apare ca etichetă lângă sumă. Încasările notate până acum rămân cum sunt, cu textul lor.

**Exemplu.** Total 12.400 lei, avans confirmat 4.000 lei. „+ Notează încasare” → 5.000 → „Plată parțială” → Salvează: „26.11.2026 · 5.000 lei · Plată parțială”; rest 3.400 lei. La livrare: „Rest de plată” → suma se completează cu 3.400 → Salvează → comanda e „încasat”.

**Cum se verifică.** Teste: încasare cu bifă și fără text scris de mână (textul = numele bifei); cu bifă și text; fără bifă și fără text → refuz; felul „Avans” pe avansul propus la „Comandat”; încasările vechi neschimbate; statusul încasării calculat ca până acum. În browser: caseta Încasări — desktop și 390 px.

**Nu se atinge.** Cine notează, confirmă și anulează încasările; stările (propusă · confirmată · anulată); statusul încasării și restul; anularea cu motiv. Migrare aditivă.
