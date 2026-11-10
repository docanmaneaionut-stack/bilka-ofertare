# Observații de ecran — pentru S18 (finisajul vizual)

Versiunea 1.3 · 10 noiembrie 2026 · Scris de Claude (chat) din observațiile lui Ionuț și ale testerilor. Se completează pe măsură ce apar, pe ecrane; înainte de S18, Claude chat face simulări grafice pentru punctele mai mari, Ionuț le alege, iar planul S18 pornește de la lista finală. **Nimic de funcționalitate aici** — acelea sunt în `CERERI-BUG-S25.md`.

Legendă priorități: **A** deranjează la fiecare folosire · **B** vizibil, de făcut în S18 · **C** gust, dacă încape.

## Tot softul — stilul general (de făcut o singură dată, în S18)
| Nr | Observația (în cuvintele lui Ionuț) | Prioritate | Simulare / decizie |
|---|---|---|---|
| V2 | (10.11) „grafica să fie mai compactă pentru tot softul, distanțele între rânduri să fie mai mici” | A | `design/simulari/S25-simulare-invelitoare.pdf`, pag. 3: rând de produs 28 px, căsuță 24 px, 2–4 px între rânduri; blocul învelitorii se face deja așa în S25 (BUG-7) — **făcut S18** (10.11.2026, commit „S18: finisaj vizual — stilul compact pe tot softul”) |
| V3 | (10.11) „liniile care definesc categoriile etc. să nu mai fie, să fie definite cumva din culoare (o nuanță de alb mai închis sau ceva de genul ăsta)” | A | pag. 3: categoria = bandă de alb mai închis (#EEF0F3) cu numele ei; produsele pe alb curat; fără linii orizontale, fără contururi de bloc — **făcut S18** (10.11.2026, commit „S18: finisaj vizual — stilul compact pe tot softul”) |
| V4 | (10.11) „în loc de butonul de X să apară un coș mic” | A | pag. 3–4: coș mic, gri, roșu la mouse; partea de comportament (ștergere doar cu clic, Tab sare peste el) e BUG-11 în S25 — **făcut S18** (10.11.2026, commit „S18: finisaj vizual — stilul compact pe tot softul”) |
| V7 | (10.11, după S25) „extinzi structura pe tot softul, ca să fie peste tot mai compact” | A | `design/simulari/S18-simulare-stil-compact.pdf` pag. 1 (ghidul: rând 28 px în editor, 30 px în liste, căsuță 24 px, 2 px între rânduri, 6 px între categorii, 10 px între zone) și pag. 2–4 (editor, liste, zona tehnică, telefon); variabilele CSS din S25 — **făcut S18** (10.11.2026, commit „S18: finisaj vizual — stilul compact pe tot softul”) |
| V8 | (10.11) „titlurile (capurile de tabel, denumirea zonelor etc.) încadrate pe un fundal alb murdar, gri, din care să fie vizibile” | A | pag. 1: bandă de zonă #E3E6EA (titluri de zonă, bold, majuscule mici), bandă de categorie / cap de tabel #EDEFF2 — **făcut S18** (10.11.2026, commit „S18: finisaj vizual — stilul compact pe tot softul”) |
| V9 | (10.11) „eliminăm toate liniile negre stil tabel” | A | pag. 1 (înainte / după) și pag. 3: fără linii; rândurile despărțite de 2 px și, pe listele lungi, de zebra #FAFBFC; doar căsuțele păstrează contur subțire — **făcut S18** (10.11.2026, commit „S18: finisaj vizual — stilul compact pe tot softul”) |
| V10 | (10.11) „butoanele să fie text pe un fundal gri sau antracit și să se coloreze ca butonul cu coșul când ești cu mouse-ul pe el” | A | pag. 1: principal antracit #2F3640 → albastru #2563EB la mouse; secundar gri #E4E7EB → gri închis; ștergere → roșu #DC2626 la mouse; dezactivat gri deschis cu motivul alături; „+ Adaugă” contur punctat → albastru la mouse — **făcut S18** (10.11.2026, commit „S18: finisaj vizual — stilul compact pe tot softul”) |
| V11 | (10.11) „compactezi și zonele dintre categorii, cât mai puțin spațiu gol, dar să rămână clare și vizibile zonele” | A | pag. 2: 6 px între categorii, 10 px între zone, cardul cu margine de 10 px; zonele se disting prin cele două tonuri de bandă — **făcut S18** (10.11.2026, commit „S18: finisaj vizual — stilul compact pe tot softul”) |

## Lista de oferte
| Nr | Observația (în cuvintele lui Ionuț) | Prioritate | Simulare / decizie |
|---|---|---|---|
| — | | | |

## Pagina ofertei — antet, client, prețuri
| Nr | Observația | Prioritate | Simulare / decizie |
|---|---|---|---|
| — | | | |

## Editorul — zona produselor
| Nr | Observația | Prioritate | Simulare / decizie |
|---|---|---|---|
| V1 | (28.10) „ecranul de produse să fie mai comprimat, acum e foarte diluat și lung" — parțial făcut la S15 (rânduri dense); de revăzut la S18 cu Ionuț | B | **făcut S18** (10.11.2026, commit „S18: finisaj vizual — stilul compact pe tot softul”) |
| V5 | (10.11, Claude chat, din capturile S25 `verificari/S25-capturi/`) la blocul învelitorii coloana de selecție e lată (~430 px) iar căsuțele de poziții sunt înguste și departe una de alta; proporțiile din simularea v2: selecția ~340 px, căsuțele de lungime / bucăți mai late, coloanele de poziții apropiate | B | de potrivit cu stilul compact general — **făcut S18** (10.11.2026, commit „S18: finisaj vizual — stilul compact pe tot softul”) |
| V6 | (10.11, Claude chat) „Lățime totală 1,2 m” → „1,20 m” (două zecimale la lățime; suprafața rămâne la 3 zecimale, FISA 3.2) | C | **făcut S18** (10.11.2026, commit „S18: finisaj vizual — stilul compact pe tot softul”) |

## Comenzi, vânzări, paleți
| Nr | Observația | Prioritate | Simulare / decizie |
|---|---|---|---|
| — | | | |

## Documente (PDF)
| Nr | Observația | Prioritate | Simulare / decizie |
|---|---|---|---|
| — | | | |

## Zona tehnică
| Nr | Observația | Prioritate | Simulare / decizie |
|---|---|---|---|
| — | | | |

## Telefon
| Nr | Observația | Prioritate | Simulare / decizie |
|---|---|---|---|
| — | | | |
