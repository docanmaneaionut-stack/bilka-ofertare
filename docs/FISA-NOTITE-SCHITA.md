# Fișa de modul — NOTIȚE, ATAȘAMENTE, LOCAȚIE (NOT)

Versiunea 1.0 · 16 octombrie 2026 · Status: ÎNCHISĂ (deciziile lui Ionuț din 16.10.2026). Se reia doar printr-o cerere explicită de MODIFICARE.
Se sprijină pe: FISA-OFERTARE cap. 14 (notițele și atașamentele stau pe ofertă), FISA-COMENZI cap. 1 și 4c (observații pe comandă, locația pe fișa șoferului), FISA-CONTURI (Gestiunea vede locația și trimite pe WhatsApp).

## 1. Notițe

- Stau **pe ofertă** și rămân pe același obiect când oferta devine comandă; **nu există notițe pe client** (decis 16.10.2026).
- Text liber; fiecare notiță are **autorul și data**; notițele **nu se șterg și nu se editează** — se adaugă alta (istoricul rezultă de la sine).
- Pot adăuga: autorul ofertei și Administratorul lui; după „Comandat", și Gestiunea și Contabilitatea (observațiile pe comandă din FISA-COMENZI cap. 1 sunt aceleași notițe). Le văd toți cei care văd oferta / comanda, după regulile de vizibilitate din FISA-CONTURI.
- Sunt **interne**: nu apar pe niciun document pentru client.

## 2. Atașamente

- Stau **pe ofertă**, vizibile și pe comandă. Tipuri: **PDF** (planul de învelitoare primit de la client, documente), **JPG / PNG / HEIC** și orice format produc telefoanele la poze (pozele de pe agenda proprie de la măsurătoare, planul clientului fotografiat, schița de mână, panotajul pe hârtie). Softul acceptă orice imagine și PDF; HEIC (iPhone) se convertește la încărcare în JPG, ca să se deschidă oriunde.
- Se încarcă **din fișier** sau **direct cu camera telefonului**, din ecranul ofertei, pe loc, la măsurătoare. Fiecare atașament: autor, dată, o denumire scurtă (implicit numele fișierului), previzualizare.
- **Nu se șterg**: se pot marca „greșit / înlocuit" (dispar din lista curentă, rămân în istoric), de autor sau de Administrator.
- Stau pe **discul serverului**, nu în baza de date; intră în backup odată cu baza. Limită rezonabilă per fișier (ex. 20 MB), fără limită de număr.
- Se pot **trimite pe WhatsApp** (vezi 4) și descărca.

## 3. Locația lucrării

- Stă pe **adresa lucrării** (clientul ofertei) și se vede pe ofertă, pe comandă și pe **fișa șoferului** („locația pe hartă").
- Două surse, ambele acceptate (decis 16.10.2026): **link de hartă primit** de la client sau colaborator (Google Maps, Waze — se lipește în câmp) sau **pinul salvat la fața locului** de agentul care măsoară („folosește locația mea", de pe telefon). Softul păstrează coordonatele și le arată ca link de hartă, oricare ar fi sursa.
- Se poate corecta ulterior, cu istoric.

## 4. Trimiterea pe WhatsApp (regulă valabilă peste tot în soft)

- Softul **nu trimite singur** mesaje pe WhatsApp (ar cere un cont WhatsApp Business cu API, costuri și aprobări). Butonul **„Trimite pe WhatsApp"** deschide WhatsApp (pe telefon aplicația, pe PC WhatsApp Web) către numărul potrivit — clientul, montatorul, șoferul — cu **textul gata scris** (numărul comenzii, clientul, link-ul locației), iar PDF-ul sau poza se partajează din telefon ca orice fișier.
- Dacă mai târziu se vrea trimitere automată (documente trimise de soft, fără om), se adaugă API-ul WhatsApp Business ca un modul separat, fără să se schimbe nimic din restul.

## 5. Schița

- **Acum**: schița e un atașament — poza schiței de mână, planul clientului (PDF sau poză), panotajul pe hârtie. Nimic desenat în soft.
- **Mai târziu**: schița digitală (contur, ape, cote → geometrie → panotaj automat) este etapa **SCH / GEO / PAN** din ARH v0.2, după punerea în funcțiune, cu fișa ei. Regula celor 15 cm la rupere e parcată acolo.

## 6. Ce apare pe ecran (pentru construcție)

- Pe ofertă și pe comandă, un panou **„Notițe și atașamente"**: sus câmpul de notiță nouă + lista cronologică (autor, dată, text); dedesubt atașamentele ca miniaturi (poze) sau pictograme (PDF), cu butoanele „Încarcă fișier", „Fotografiază" (pe telefon), „Trimite pe WhatsApp", „Descarcă"; marcarea „greșit / înlocuit" din meniul atașamentului.
- Locația: câmp pe client / adresa lucrării, cu „Lipește link" și „Folosește locația mea", plus butonul „Deschide pe hartă".
- Pe telefon, acest panou e cel mai folosit ecran la măsurătoare: butoane mari, fotografierea și încărcarea să meargă fără pași intermediari.
