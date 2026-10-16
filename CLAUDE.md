# CLAUDE.md — instrucțiuni de proiect (citit automat la fiecare sesiune)

## Ce este proiectul
Soft de ofertare și gestiune pentru distribuția de țiglă metalică (furnizor principal: Bilka).
Proprietar: Ionuț. Arhitectura completă, modelul de date, regulile de calcul și procesul de lucru
sunt în `docs/ARH.md`. Citește-l la începutul fiecărei sesiuni — mai ales §5 (reguli de calcul),
§7 (ordinea construcției), §8 (teste și înghețare), §11 (scurtături permise / interzise).
Citește și ultima intrare din `docs/JURNAL.md` ca să știi unde am rămas.
Specificația funcțională e în fișele din `docs/`: FISA-CONTURI, FISA-CATALOG-PRETURI, FISA-OFERTARE,
FISA-COMENZI (toate închise); fișierele de import în `docs/import/Bilka/`; machetele documentelor și
ale ecranelor (referința grafică) în `docs/design/`; foaia de parcurs în `docs/PLAN.md`.
Folderul `docs/` este scris direct de Claude (chat) în sesiunile de specificație — nu îl rescrie, doar îl citește și îl adaugă în git.

## Limbă
- Comunicarea cu Ionuț: română, clară, fără jargon inutil. Ionuț nu este programator —
  explică deciziile în termeni de business și de rezultat, nu de cod.
- Cod, baza de date, nume de fișiere și foldere: engleză, fără diacritice.
- Interfața aplicației, documentele generate și fișierele din `docs/`: română cu diacritice.

## Reguli de lucru (din ARH §10)
1. O sesiune = un singur obiectiv. Confirmă obiectivul și planul înainte de a modifica orice fișier.
2. Nu modifica nimic din zona înghețată (ARH §8) fără o cerere explicită de tip MODIFICARE;
   atunci se actualizează întâi testul, apoi codul.
3. Rulează toate testele înainte și după orice modificare. O sesiune nu se încheie cu teste roșii.
4. La final de sesiune: teste verzi → commit cu mesaj clar, în română → push pe GitHub,
   fără a cere confirmare (depozitul e privat și este copia de siguranță). Nu lăsa modificări necomise.
5. Când ceva se strică: revino la ultimul commit bun și pornește de acolo. Nu cârpi peste cârpeală.
6. Modificări punctuale, nu regenerarea fișierelor întregi.
7. Migrările bazei de date sunt doar aditive. Nu șterge tabele, coloane sau date.
8. Orice decizie de arhitectură nouă sau schimbare de regulă se scrie în `docs/ARH.md`
   (secțiunea potrivită + §13 Istoric) în aceeași sesiune.
9. La final de sesiune adaugă o intrare în `docs/JURNAL.md`: data, obiectivul, rezultatul,
   următorul pas propus.
10. Dacă o cerere e neclară sau contrazice ARH, întreabă înainte de a face.

## Format de cerere folosit de Ionuț
`Modul · Tip (BUG / MODIFICARE / NOU) · Acum · Corect ar fi · Exemplu cu cifre · Nu se atinge`
Modulele (glosarul din ARH §2): CAT, LP, MOT, OFE, DOC, CON, COM, STO, NOT, ADM, IMP, ETALON, ÎNGH.

## Interzis
- Ștergerea de fișiere sau date fără cerere explicită.
- Comenzi în afara folderului proiectului.
- Secrete (parole, chei, date de conectare) în cod sau în git — doar în fișiere `.env` ignorate de git.
- Prețuri, produse sau reguli de calcul scrise direct în cod: sunt configurare și stau în baza de date.
- Ocolirea testelor ca să „meargă" o modificare.
