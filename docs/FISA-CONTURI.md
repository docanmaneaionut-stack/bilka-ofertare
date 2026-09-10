# Fișa de modul — CONTURI (CON)

Versiunea 1.1 · 4 septembrie 2026 · Status: **ÎNCHISĂ** (aprobată de Ionuț; nu se mai reia fără cerere explicită de tip MODIFICARE)
Sursa: descrierea lui Ionuț din 03.09.2026 și răspunsurile din 03–04.09.2026. Înlocuiește ARH §3 și punctele 1–4 din ARH §12.

---

## 1. Rolurile și ierarhia

| Rol | Pe scurt |
|---|---|
| **Admin general** | unic; administrează infrastructura: creează Administratorii și firmele, creează conturile comune (Contabilitate, Gestiune), gestionează catalogul și prețurile de la furnizor |
| **Administrator** | unul per firmă; conduce firma lui în soft și **face și el oferte**, cu toate funcțiile unui agent |
| **Agent** | face oferte pentru firma Administratorului lui |
| **Colaborator** | face singur oferte complete, dar vede strict ce e al lui |
| **Contabilitate** | vizualizează comenzile și printează documentele pentru facturare; acces pe firme setabil |
| **Gestiune** | operează comenzile: recepție, programare livrare, livrare, avize; coordonează șoferii, de regulă încasează și plătește comisioanele fizic; acces pe firme setabil |

Ierarhie: **Admin general → Administrator (o singură firmă) → Agent / Colaborator.**
Conturile de Contabilitate și Gestiune sunt create de Admin general și au o **setare de acces**: general (toate firmele), o firmă anume, sau mai multe firme — modificabilă oricând, ca la 3–4 firme să nu apară conflicte.
Rolul „Director zonal" din discuțiile anterioare nu mai există.

---

## 2. Cine vede ce

| | Admin general | Administrator | Agent | Colaborator | Contabilitate | Gestiune |
|---|---|---|---|---|---|---|
| Catalog și prețurile de bază de la furnizor | vede și modifică | vede | nu — vede doar prețul lui de achiziție | la fel ca agentul | nu | nu |
| Oferte | toate | toate; lista standard arată ofertele lui, iar dintr-un selector alege ofertele oricărui cont | doar ale lui | doar ale lui | prin comenzi (PDF ofertă), pe firmele la care are acces | prin comenzi (PDF ofertă), pe firmele la care are acces |
| Lista de comenzi | toate | toate | lista completă | doar ale lui | pe firmele la care are acces | pe firmele la care are acces |
| Sume de încasat (avans, rest) și comisioane | toate | toate | toate | doar ale lui | toate (în accesul lui) | toate (în accesul lui) |
| Tabel de facturare și aviz | orice comandă | orice comandă | orice comandă | **nu** — vede doar PDF-ul ofertei lui | orice comandă | orice comandă |
| Locația comenzii și panotajul (trimitere pe WhatsApp) | da | da | da | pe ale lui | — | da |
| Liste de montatori predefiniți | toate | a lui + listele tuturor conturilor | a lui | a lui | — | — |
| Istoricul modificărilor | tot | tot ce vede | pe tot ce vede | pe ale lui | pe tot ce vede | pe tot ce vede |

Regula istoricului: **istoricul unei oferte sau comenzi e vizibil oricui poate vedea oferta / comanda respectivă.**

---

## 3. Cine face ce

| Acțiune | Cine |
|---|---|
| Creează Administratori și firmele lor (denumire, CUI, nr. Reg. Com., adresă, telefon, e-mail, siglă) | Admin general |
| Creează conturi Contabilitate și Gestiune și le setează accesul pe firme | Admin general |
| Creează conturi de Agent și Colaborator | Administrator |
| Modifică datele de contact ale firmei proprii | Administrator |
| Verifică, adaugă produse și modifică prețurile din catalog | **doar** Admin general |
| Stabilește și modifică adaosul % al fiecărui cont din subordine **și al contului personal** (cu istoric) | Administrator |
| Creează, modifică, transmite oferte; schimbă statusul ofertei; listă proprie de montatori | Administrator, Agent, Colaborator (pe ale lor) |
| Intervine pe oferta unui subordonat (cu istoric) | Administratorul lui |
| Trimite comanda — statusul ofertei devine **Comandat** | Administrator, Agent, Colaborator |
| Adaugă detalii pe o comandă (contacte, detalii apărute pe parcurs) — note care se adaugă, nu se rescriu | cine a făcut oferta; Administratorul; Gestiune |
| Modifică **prețul de vânzare** și **sumele de încasat** (avans, rest) ale unei comenzi — cu istoric | cine a făcut oferta (Agent / Colaborator / Administrator) **și** Administratorul firmei |
| Modifică comisionul montatorului (cu istoric) | cine a făcut oferta; Administratorul |
| Schimbă statusul logistic (cu istoric) | orice Administrator, pe **toate** comenzile; Gestiune |
| Notează lipsurile la „Recepționat parțial" | Gestiune; Administrator |
| Bifează avans încasat / rest încasat / comision achitat | **doar** Administratorul firmei, pe comenzile subordonaților lui |
| Programează ziua livrării | Gestiune; Administrator; Agent (pe comenzile lui) |
| Printează tabelul de facturare / avizul oricărei comenzi | toți, mai puțin Colaboratorul |
| Vede locația și panotajul, le trimite pe WhatsApp | Gestiune, Agent, Administrator |

---

## 4. Statusurile și „proprietarii" lor

1. **Ofertă** — schimbat de cine a făcut-o (sau de Administratorul lui):
   În lucru → Transmisă → De revizionat → Acceptată → Avans luat → De comandat → **Comandat**.
   „Avans luat" nu e obligatoriu: o ofertă poate deveni comandă și fără avans.
   La **Comandat**, softul creează automat rândul în lista de comenzi, cu datele inițiale ale ofertei (ce anume se preia: fișa COMENZI).
2. **Comandă (logistic)** — schimbat de orice Administrator sau de Gestiune:
   Comandat → **Recepționat** sau **Recepționat parțial** (asterisc roșu + nota cu ce a lipsit la recepție) → Nelivrat / Livrat.
3. **Încasare și comision** — **numai** Administratorul firmei, după verificarea cu ce ajunge fizic la birou. Trei bife **independente**: avans încasat · rest de plată încasat · comision achitat. O comandă poate avea restul încasat și avansul neîncasat.

Gestiunea vede sumele și încasează fizic; bifele rămân ale Administratorului.

---

## 5. Istoric și trasabilitate

- Orice **sumă** modificată ulterior (preț de vânzare, avans, rest, comision montator, adaos % al unui cont) primește **asterisc roșu** și butonul **„Vezi istoric"**: fereastră separată cu valoarea inițială și cine a pus-o, fiecare modificare, cine, data și ora.
- Fiecare ofertă are istoricul modificărilor; intervențiile Administratorului sunt vizibile agentului.
- Detaliile pe comenzi sunt **note adăugate** (cine, ce, când); ce a fost scris nu se mai modifică.
- Schimbările de status (logistic, încasare, comision) se salvează cu cine și când.
- Istoricul e vizibil oricui poate vedea oferta / comanda.

---

## 6. Reguli comune

- Un Administrator are exact o firmă; Agenții și Colaboratorii lui lucrează pe firma lui.
- **Nimic nu se șterge și nicio ofertă nu se anulează**: toate rămân în istoric, cu ultimul lor status. Conturile se dezactivează.
- **Oferta devine comandă cu datele inițiale.** După comandă, modificările se fac numai în zona de comenzi.
- **Predarea unui cont de agent**: ofertele lui rămân vizibile Administratorului și pot deveni comenzi. Noul agent preia telefonul și istoricul: contul rămâne același, se schimbă numele, telefonul și parola; în istoric, fiecare acțiune păstrează numele persoanei de la momentul acțiunii.
- Prețul de achiziție afișat unui cont este o sumă, fără mențiunea „bază + X %". Administratorul decide dacă îi comunică procentul.

---

## 7. Prețul de achiziție al contului

Fiecare cont care face oferte (Administrator, Agent, Colaborator) are un **adaos %** stabilit de Administrator la crearea contului și modificabil oricând, cu istoric. Rolul lui:
- la agenți: minimul necesar facturării (de regulă 1 %), ridicabil când un agent tinde să vândă prea ieftin;
- la colaboratori: adaosul deja negociat, diferit de la caz la caz.

**Preț de achiziție al contului (lei) = preț de bază din catalog (EUR) + adaosul % al contului, convertit la cursul BNR + 1 %.**
De la această sumă pornește toată structura prețurilor de ofertare a contului respectiv. (Detaliile de calcul: fișa PREȚURI.)

---

## 8. Securitate — măsuri aprobate

1. **Cont de rezervă pentru Admin general**, creat la instalare, cu parola păstrată în afara softului; se folosește doar dacă admin-ul principal e pierdut.
2. **Parole complexe** (minim 10 caractere); fiecare persoană cu contul ei, fără conturi partajate; resetare de către superiorul din ierarhie.
3. **Jurnal de autentificare**: ultimele conectări (când, de pe ce dispozitiv); blocare temporară după încercări greșite repetate.
4. **Export de date** (descărcare completă) doar pentru Admin general și Administratori.

Neincluse (respinse pentru moment): verificarea în doi pași, deconectarea automată / forțată.

---

## 9. Istoric document

- v0.9 — 03.09.2026 — schiță din descrierea lui Ionuț.
- v1.0 — 03.09.2026 — răspunsurile la prima rundă.
- v1.1 — 04.09.2026 — ultimele actualizări; fișă închisă.
