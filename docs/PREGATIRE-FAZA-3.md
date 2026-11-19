# Pregătirea punerii în funcțiune (Faza 3, roofdata.ro) — lista lui Ionuț

Versiunea 1.0 · 10 noiembrie 2026 · Scris de Claude (chat). Ce ai de făcut tu (și ce nu) ca, în ziua în care spunem „aplicația e gata", punerea în funcțiune să dureze câteva sesiuni, nu săptămâni. Bifezi pe măsură ce faci; ce e neclar, întrebi în chat. Referințe: ARH §9 (găzduire, backup, PDF pe Linux), PLAN „Faza 3", FISA-CONTURI (conturile), README (bibliotecile serverului).

Legendă: **acum** = se poate face de pe acum, oricând ai timp · **înainte** = cu 1–2 săptămâni înainte de punerea în funcțiune · **în ziua** = împreună cu Code, la punerea în funcțiune. Parolele și cheile nu se scriu niciodată în chat, în Code sau în depozit — doar în locul tău sigur.

## 0. Când spunem „aplicația e gata" (ca să știm când pornim Faza 3)

- [ ] Testarea în paralel încheiată: cel puțin 10 oferte reale făcute din soft, 3 comenzi cap-coadă (ofertă → comandă → aviz → încasare), un retur, formularul Bilka trimis efectiv de câteva ori fără corecții de mână.
- [ ] Lista de corecții (`CERERI-BUG-S25.md`) fără puncte deschise care te blochează; lista vizuală (`OBSERVATII-ECRAN.md`) — ce rămâne se poate face și după punerea în funcțiune.
- [ ] Rândurile „Ionuț" din `ACCEPTARE-ETAPA-3.md` și `ACCEPTARE-ETAPA-5.md` bifate (H5 ofertele reale, F5 comanda cap-coadă, D1 returul de 102,32 lei, E3 fișa șoferului pe telefon).

## 1. Domeniul roofdata.ro — **acum**

- [ ] Confirmă că domeniul e înregistrat pe Roofshop DMI SRL (decizia din 17.10; înregistrarea era planificată pe 19.10). Notează-ți: registrarul, contul (utilizatorul; parola în locul sigur), data expirării, **reînnoirea automată pornită** (un domeniu expirat = aplicația inaccesibilă pentru toți).
- [ ] Cont **Cloudflare** (gratuit) pe adresa firmei; adaugi roofdata.ro; la registrar schimbi serverele de nume pe cele două pe care ți le arată Cloudflare. Efect: DNS-ul, certificatul HTTPS și protecția de bază vin de la Cloudflare, independent de registrar. Până la VPS nu mai e nimic de setat.
- [ ] Decizie (propunerea mea): aplicația la **app.roofdata.ro**; roofdata.ro trimite spre app (sau o pagină simplă de prezentare, mai târziu); e-mailurile de notificare, când vor exista, de pe acest domeniu.
- [ ] Autentificare în doi pași (2FA) pe contul de registrar și pe cel Cloudflare — domeniul e „cheia" aplicației. (Nu are legătură cu 2FA din soft, care rămâne refuzat, cum ai decis.)

## 2. Serverul (VPS) — **înainte**

- [ ] Alege furnizorul și fă contul **pe firma care plătește** (Roofshop): date de facturare cu CUI, card, 2FA pe cont. Recomandarea mea: **Hetzner Cloud** (centre de date în Germania / Finlanda, deci în UE — important pentru datele clienților), raport preț / calitate foarte bun, backup-uri automate la câțiva euro în plus. Alternative: OVH, DigitalOcean. **Nu** găzduire „shared" / cPanel — nu merge pentru aplicația noastră (Node + PostgreSQL + Chrome pentru PDF).
- [ ] Mărimea: 2 vCPU, **4 GB RAM** (Chrome-ul care face PDF-urile are nevoie), 40–80 GB SSD, **Ubuntu 24.04 LTS**, o adresă IPv4, backup-urile automate ale furnizorului pornite; locația în UE. Cost orientativ: 8–12 € / lună cu backup.
- [ ] **Nu instala nimic pe el.** Instalarea o face Code în Faza 3 (sesiunile F1–F2), cu lista de biblioteci din ARH §9 / README. Tu îi dai doar accesul (punctul 3).
- [ ] Docker sau instalare directă — decidem eu cu Code la F1 (ARH spune Docker; alegem după ce vedem imaginea cu Chrome).

## 3. Accesul la server — **înainte / în ziua**

- [ ] **Cheia SSH** se face pe calculatorul tău, într-o sesiune Code (o comandă de zece secunde); partea publică o pui în contul de la furnizor când creezi serverul; partea privată rămâne pe calculatorul tău — nu în chat, nu în depozit. Code lucrează pe server de pe calculatorul tău, prin cheia ta.
- [ ] Parola de administrator a serverului (dacă furnizorul dă una) — în locul sigur.
- [ ] Regula rămâne cea de acum: secretele (parola bazei de date, cheile) stau în `.env` pe server, scris de Code la instalare; nimic în git.

## 4. Backup — **înainte / în ziua**

- [ ] Alege „al doilea loc", separat de VPS, pentru backup-ul zilnic (ARH §9: zilnic, automat, 30 de zile + o copie lunară 12 luni). Cel mai simplu: un spațiu de stocare separat la același furnizor (la Hetzner „Storage Box", ~4 € / lună) sau un cont de stocare în altă parte (Backblaze B2, Google Drive al firmei). Decizia e a ta; Code configurează.
- [ ] Până atunci, **exportul ZIP din Zona tehnică rămâne backup-ul tău**: săptămânal și după zilele cu multe oferte, în `D:\SOFT-BACKUP` și pe un stick / alt calculator (ZIP-ul conține parolele criptate ale conturilor — nu-l trimite nimănui).
- [ ] În ziua punerii în funcțiune: test de restaurare (backup → bază goală → aplicația pornește cu datele) — e sesiunea F3, îl vezi cu ochii tăi.

## 5. Datele și conturile — **acum → înainte**

- [ ] **Lista utilizatorilor reali** (mi-o dai, o pun într-un tabel): nume, e-mail real, rol (Administrator / Agent / Colaborator / Contabilitate / Gestiune), firma, **seria** (2–3 litere, unică), adaosul % pentru agenți și colaboratori, accesul pe firme pentru Contabilitate / Gestiune. Conturile le creezi tu, din Admin general, cu o zi înainte; fiecare își schimbă parola la prima conectare (deja construit).
- [ ] Contul de rezervă Admin general: există? parola scrisă, în plic, în seif (regula din CONTURI).
- [ ] Contul de test (test@roofshop.ro) și oferta TST-0001 se **dezactivează** la punerea în funcțiune (nu se șterg — nimic nu se șterge).
- [ ] Datele firmelor complete în Zona tehnică → Firme: nume, CUI, Reg. Com., adresă, telefon, e-mail (și contul bancar, dacă îl vrei pe documente).
- [ ] **Siglele**: Roofshop și Proroof (PNG la rezoluție bună sau SVG) și sigla Bilka — în `docs/design/sigle/` (promise din S16; fără ele documentele ies fără siglă).
- [ ] **Formularul Bilka**: ultima versiune „de zi" încărcată la ambele firme; cele **46 de corespondențe „de verificat"** din Referințe → Formular Bilka trecute prin mâna ta (lista e în JURNAL la S16b); numele listei de preț corectat (caracterul stricat).
- [ ] Lista de prețuri Bilka: la următoarea schimbare de prețuri îmi trimiți formularul / listele noi → fac CSV-ul → import cu ecranul de diferențe (nimic de mână).
- [ ] **Baza de date de la punerea în funcțiune = cea de pe calculatorul tău** (are deja comenzile reale IDM-0005…7): în ziua respectivă, export de pe calculator → restaurare pe server (mecanism construit și testat la S17a / S24), apoi calculatorul nu mai e sursa — toată lumea lucrează pe app.roofdata.ro. Până atunci, nu ține date în două locuri.
- [ ] Cursul BNR: pe server se încearcă din nou bnr.ro direct (blocarea era, probabil, a rețelei de la birou); rezerva cursbnr.ro și introducerea manuală rămân.

## 6. Ferestre (Fakro, Velux) — separat de Faza 3

- [ ] Când primești listele Fakro (prețul de catalog + discounturile tale pe categorii: ferestre, rame de etanșare, kituri / automatizări, accesorii, scări), mi le trimiți (PDF / Excel) → fac analiza ca la Bilka (fișă + CSV) → compartimentul „Ferestre" (Etapa 4). Nu condiționează punerea în funcțiune: intră prin migrare aditivă, pe sistemul în funcțiune.
- [ ] Velux: de aflat dacă și ce oferă (prețuri în lei, discount).

## 7. Organizatoric — **înainte**

- [ ] Cine e „omul de contact" pentru soft în firmă, în afară de tine (Gestiune? un Administrator?) — pentru conturi blocate, parole uitate.
- [ ] O oră de instruire pentru agenți la pornire, pe ecranele lor, cu o ofertă reală; după S18 ecranele nu se mai schimbă.
- [ ] Datele clienților (nume, telefon, adresă) ajung pe un server: găzduirea în UE și accesul doar prin conturi (asigurate de punctele de mai sus). Nu sunt consilier juridic; dacă vrei, îți pregătesc o notă internă scurtă despre cum sunt protejate datele.
- [ ] Telefon / WhatsApp: trimiterea documentelor rămâne manuală (descărcare + atașare) la punerea în funcțiune; automatizarea vine după.

## 8. Cum arată Faza 3 (ca să știi ce urmează)

- **F1 — serverul**: Ubuntu, utilizator fără drepturi de root pentru aplicație, firewall, PostgreSQL, Node, Chrome și bibliotecile pentru PDF, nginx + certificat HTTPS, aplicația ca serviciu care pornește singur la restart; app.roofdata.ro cu bază goală.
- **F2 — datele**: export de pe calculator → restaurare pe server; șabloanele, siglele, documentele; verificare: o ofertă veche se deschide identic, un PDF generat pe server e identic cu cel de pe calculator, un formular Bilka la fel (hash).
- **F3 — backup-ul automat + test de restaurare**, jurnalul de conectări, conturile reale, dezactivarea contului de test.
- **F4 — prima zi**: toată lumea pe app.roofdata.ro; calculatorul de la birou rămâne rezervă două săptămâni (nu se mai scrie în el), apoi `pornire.cmd` nu se mai folosește.
- **După**: offline-ul (aplicația instalabilă pe laptop și telefon) ca etapă scurtă; ASIST (asistentul prin API); ferestrele când sunt listele.
