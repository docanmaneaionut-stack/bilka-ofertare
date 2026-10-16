# Generator de machete pentru documentele de ofertă (ofertă + rezumat), cu date de test.
# Rulare: python3 macheta-generator.py  → macheta-oferta.html/.pdf, macheta-rezumat.html/.pdf (PDF prin Chromium headless / playwright)
# Stilul (CSS) de aici e referința grafică pentru șabloanele PDF din soft (S15).
import html, os, re
from collections import OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
RATE = 5.2473; TVA = 0.21
NR = "IB-0152"; DATA = "18.09.2026"; CLIENT = "Popescu Andrei"

def ro(x, d=2):
    return f"{x:,.{d}f}".replace(",", "X").replace(".", ",").replace("X", ".")

# ---- datele de test: categorii → (denumire, familie, UM, cantitate, preț) ----
CATS = [
 ("Învelitori", "Țiglă metalică Hellenic · Grande Mat · 0,50 mm · RAL 8019", "30 de ani culoare și coroziune", [
   ["Țiglă metalică Hellenic · Grande Mat · 0,50 mm · RAL 8019", "Țiglă metalică Hellenic", "mp", 192.150, 11.20]]),
 ("Accesorii de tinichigerie", "Grande Mat 0,50 mm · RAL 8019", "30 de ani culoare și coroziune", [
   ("Coamă mică", "coamă mică", "buc", 8, 9.10), ("Bordură fronton 312 mm", "bordură fronton", "buc", 19, 9.10),
   ("Colector fronton 156 mm", "colector fronton", "buc", 23, 4.55), ("Bordură streașină 208 mm", "bordură streașină", "buc", 15, 6.05),
   ("Bordură la perete 208 mm", "bordură la perete", "buc", 4, 6.05), ("Dolie 417 mm", "dolie", "buc", 2, 12.10),
   ("Opritor zăpadă 2 m", "opritor zăpadă", "buc", 20, 6.05), ("Set coș fum (4 piese)", "set coș fum", "buc", 1, 36.30)]),
 ("Fixare și etanșare", "", "", [
   ("Holțșuruburi în culoare, lemn 4,8 × 35 mm (250 buc)", "holțșuruburi în culoare", "cutie", 8, 8.80),
   ("Capac coamă Grande Mat", "capac coamă", "buc", 2, 6.70), ("Bandă bituminoasă 15 cm × 10 m", "bandă bituminoasă", "rolă", 2, 16.00),
   ("Mastic etanșare premium 300 ml", "mastic etanșare", "buc", 1, 8.50), ("Folie anticondens 120 g · 75 mp", "folie anticondens", "rolă", 3, 51.00)]),
 ("Sistem pluvial", "125 / 90 · mat · RAL 8019", "20 de ani culoare, 30 de ani coroziune", [
   ("Jgheab 125 · 4 m", "jgheab", "buc", 7, 12.20), ("Burlan 90 · 3 m", "burlan", "buc", 5, 11.30),
   ("Cârlig jgheab 210 mm", "cârlig jgheab", "buc", 44, 2.05), ("Colier burlan 90", "colier burlan", "buc", 10, 1.20),
   ("Capac jgheab 125", "capac jgheab", "buc", 8, 1.20), ("Element îmbinare jgheab 125", "element îmbinare jgheab", "buc", 6, 1.95),
   ("Racord jgheab – burlan 125 / 90", "racord jgheab – burlan", "buc", 6, 3.25), ("Cot 60° 90", "cot 60°", "buc", 16, 3.25),
   ("Prelungitor intermediar 90 · 1 m", "prelungitor intermediar", "buc", 5, 3.80)]),
]
PANOTAJ = [(6.20, 10), (5.40, 8), (4.30, 7), (3.10, 6), (1.25, 4)]   # lungime (m) × bucăți — Hellenic, lățime totală 1,21 m
LATIME = 1.21
MP = round(sum(l * b for l, b in PANOTAJ) * LATIME, 3); COLI = sum(b for _, b in PANOTAJ)
CATS[0][3][0][3] = MP
SUPL = [("Manoperă montaj — prin terț colaborator (nu se facturează de noi)", 12500), ("Șipcă lemn 3 × 5 cm, montaj", 3200)]
if os.environ.get("FARA_SUPLIMENT"): SUPL = []   # test: fără linii în zona B → pagina de supliment nu există
if os.environ.get("MULTE"):   # test: ofertă lungă (a doua învelitoare cu accesoriile ei) → oferta pe mai multe pagini, anexa după ultima
    CATS = CATS + [("Învelitori", "Retro Plus Standard · mat · 0,50 mm · RAL 7016 (garaj)", "15 ani culoare și coroziune",
                    [("Retro Plus Standard · mat · 0,50 mm · RAL 7016", "Retro Plus", "mp", 48.600, 12.40)])] + \
           [(c, sp.replace("Grande Mat 0,50 mm · RAL 8019", "mat 0,50 mm · RAL 7016"), g, ls) for c, sp, g, ls in CATS[1:]] * 2
NPAG = 2 if SUPL else 1

total = sum(round(q * p, 2) for _, _, _, lines in CATS for _, _, _, q, p in lines)
tva = round(total * TVA, 2); cu = round(total + tva, 2); lei = round(cu * RATE, 2)

CSS = '''
@page { size: A4 portrait; margin: 11mm 14mm 15mm 14mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, "Liberation Sans", sans-serif; color: #1c1c1c; font-size: 10pt; line-height: 1.2; margin: 0; background: #e9e9e9; }
.sheet { width: 210mm; min-height: 297mm; margin: 10mm auto; background: #fff; padding: 12mm 14mm 12mm 14mm; }
@media print { body { background: #fff; } .sheet { margin: 0; padding: 0; width: auto; min-height: auto; }  }
thead { display: table-header-group; }              /* capul de tabel se repetă pe fiecare pagină */
tr { page-break-inside: avoid; } tr.cat { page-break-after: avoid; }   /* banda de categorie rămâne cu prima ei linie */
.bottom { page-break-inside: avoid; }               /* totalurile nu se rup între pagini */
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10mm; margin-top: -1mm; }
.firm { font-size: 8.5pt; line-height: 1.3; } .firm b { font-size: 11.5pt; letter-spacing: .2px; }
.logos { display: flex; flex-direction: column; align-items: flex-end; gap: 2mm; }
.logo { border: 1px dashed #b9b9b9; color: #8a8a8a; font-size: 8pt; text-align: center; padding: 2mm 3mm; width: 40mm; }
.logo.big { height: 9mm; display:flex; align-items:center; justify-content:center; }
.suppliers { display: flex; gap: 2mm; } .suppliers .logo { width: 19mm; padding: 1.2mm 2mm; }
.title { margin: 2.5mm 0 1.5mm; display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #1c1c1c; padding-bottom: 1.5mm; }
.title h1 { font-size: 17pt; margin: 0; font-weight: 700; letter-spacing: .3px; }
.title .nr { font-size: 11pt; } .title .nr b { font-size: 13pt; }
.parties { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; margin: 1.5mm 0 2mm; font-size: 9.2pt; line-height: 1.25; }
.parties .box { padding: 1.5mm 0 0; border-top: 1px solid #d5d5d5; }
.parties .lbl { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .6px; color: #6a6a6a; margin-bottom: 1mm; }
table.lines { width: 100%; border-collapse: collapse; font-size: 9.3pt; }
table.lines th { text-align: left; font-weight: 600; font-size: 8pt; text-transform: uppercase; letter-spacing: .5px; color: #4a4a4a; background: #f4f4f4; padding: 1.6mm 1.5mm; border-bottom: 1px solid #c9c9c9; }
table.lines td { padding: .75mm 1.5mm; border-bottom: 1px solid #e6e6e6; vertical-align: middle; }
table.lines tr.cat td { background: #f4f4f4; font-weight: 700; font-size: 9.5pt; padding: 1.3mm 1.5mm; border-top: 1px solid #c9c9c9; } table.lines tr.cat td.subv { font-weight: 600; color: #444; font-size: 9pt; }
td.n, th.n { width: 7mm; color: #8a8a8a; } td.c, th.c { text-align: center; width: 12mm; } td.r, th.r { text-align: right; white-space: nowrap; }
th.q { width: 18mm; } th.p { width: 22mm; } th.v { width: 24mm; }
.bottom { display: flex; justify-content: space-between; align-items: flex-start; gap: 8mm; margin-top: 2.5mm; } .totals { width: 78mm; flex: none; font-size: 10pt; }
.totals div { display: flex; justify-content: space-between; padding: 1mm 0; border-bottom: 1px solid #e6e6e6; }
.totals .big { font-size: 12.5pt; font-weight: 700; border-bottom: 2px solid #1c1c1c; border-top: 1px solid #1c1c1c; padding: 1.8mm 0; }
.totals .lei { font-size: 12pt; font-weight: 700; border-bottom: none; }
.supl { margin-top: 4mm; flex: 1; } .page2 { page-break-before: always; } .page2 .title { margin-top: 0; }   /* anexa începe mereu pe pagină nouă */ .supl h3 { font-size: 9pt; margin: 0 0 1mm; text-transform: uppercase; letter-spacing: .5px; color: #4a4a4a; }
.supl table { width: 100%; border-collapse: collapse; font-size: 9.5pt; } .supl td { padding: 1.1mm 1.5mm; border-bottom: 1px solid #e6e6e6; }
.supl .note { font-size: 8.5pt; color: #555; margin-top: .8mm; }
.foot { margin-top: 1mm; font-size: 8pt; color: #333; line-height: 1.4; flex: 1; }
.foot b { color: #1c1c1c; } .foot p { margin: 0 0 1.2mm; }
.pagefoot { margin-top: 2.5mm; display: flex; justify-content: space-between; font-size: 8pt; color: #8a8a8a; border-top: 1px solid #d5d5d5; padding-top: 1.5mm; }
/* rezumat: blocuri pe categorii (structura Novatik), în stilul benzilor din ofertă */
.intro { font-size: 10pt; margin: 2.5mm 0 3mm; }
.block { margin-bottom: 2.5mm; }
.bh { background: #f4f4f4; border-top: 1px solid #c9c9c9; padding: 1.6mm 1.5mm; font-size: 9.5pt; display: flex; gap: 2mm; align-items: baseline; }
.bh .bn { color: #8a8a8a; width: 6mm; flex: none; } .bh .bt { font-weight: 700; } .bh .bs { color: #333; }
.bb { display: grid; grid-template-columns: 24mm 1fr; row-gap: 1.2mm; column-gap: 2mm; padding: 2mm 1.5mm 1.5mm 9.5mm; font-size: 9.8pt; line-height: 1.3; border-bottom: 1px solid #e6e6e6; }
.bb .k { color: #6a6a6a; font-size: 8pt; text-transform: uppercase; letter-spacing: .5px; padding-top: .6mm; }
.bb .v b { font-size: 10.5pt; }
table.lines tr.pan td { background: #fbfbfb; font-size: 8.8pt; color: #333; padding: .6mm 1.5mm .6mm 9mm; border-bottom: 1px dotted #ddd; }
table.lines tr.pan td.r { padding-right: 1.5mm; } table.lines tr.panh td { background: #fbfbfb; font-size: 7.8pt; color: #6a6a6a; text-transform: uppercase; letter-spacing: .5px; padding: 1mm 1.5mm .4mm 9mm; border-bottom: none; }
.cb { display: inline-block; width: 3.4mm; height: 3.4mm; border: 1px solid #9a9a9a; vertical-align: middle; border-radius: .4mm; }
th.k, td.k { width: 10mm; text-align: center; }
.intern { font-size: 8.5pt; color: #6a6a6a; margin: -.5mm 0 2mm; }
/* fișa șoferului: un bloc per livrare, telefoane apelabile, de încasat mare */
.dl { border: 1px solid #c9c9c9; border-radius: 1.5mm; margin: 3mm 0 0; page-break-inside: avoid; }
.dlh { display: flex; align-items: baseline; gap: 3mm; background: #f4f4f4; padding: 2mm 3mm; border-bottom: 1px solid #c9c9c9; font-size: 11pt; }
.dlh .n { color: #8a8a8a; width: 5mm; } .dlh b { font-size: 12.5pt; } .dlh .nr { color: #555; font-size: 9.5pt; } .dlh .tel { margin-left: auto; }
.dlb { display: grid; grid-template-columns: 22mm 1fr; row-gap: 1.6mm; column-gap: 2mm; padding: 2.5mm 3mm 2.5mm; font-size: 10pt; line-height: 1.35; }
.dlb .k { color: #6a6a6a; font-size: 8pt; text-transform: uppercase; letter-spacing: .5px; padding-top: .6mm; }
.dlb .sub { color: #555; font-size: 9pt; } .dlb .big { font-size: 14pt; font-weight: 700; }
a.tel { color: #1c1c1c; text-decoration: none; font-weight: 700; white-space: nowrap; } a { color: #1c1c1c; }
.cb { display: inline-block; width: 3.6mm; height: 3.6mm; border: 1px solid #9a9a9a; vertical-align: middle; border-radius: .4mm; }
@media print { .pagefoot { display: none; } }   /* în PDF, subsolul paginii îl scrie motorul (număr de pagină corect pe orice lungime) */
'''

def head(title, nr_label="Nr."):
    return f'''<div class="head">
  <div class="firm"><b>SC ROOFSHOP DMI SRL</b><br>CUI RO45403526 · J39/1239/2021<br>Str. Mărășești nr. 37, Focșani, jud. Vrancea<br>Tel. 07xx xxx xxx · office@roofshop.ro</div>
  <div class="logos"><div class="logo big">sigla firmei</div><div class="suppliers"><div class="logo">sigla Bilka</div><div class="logo">sigla Fakro</div></div></div>
</div>
<div class="title"><h1>{title}</h1><div class="nr">{nr_label} <b>{NR}</b> / {DATA}</div></div>
<div class="parties">
  <div class="box"><div class="lbl">Client</div><b>{CLIENT}</b><br>Str. Florilor nr. 12, Câmpineanca, jud. Vrancea<br>Tel. 07xx xxx xxx</div>
  <div class="box"><div class="lbl">Agent</div><b>Ionuț Bîrlădeanu</b><br>Tel. 07xx xxx xxx<br>ionut@roofshop.ro</div>
</div>'''

def totals():
    return f'''<div class="totals">
  <div><span>Total fără TVA</span><span>{ro(total)} €</span></div>
  <div><span>TVA 21 %</span><span>{ro(tva)} €</span></div>
  <div class="big"><span>Total cu TVA</span><span>{ro(cu)} €</span></div>
  <div class="lei"><span>Total în lei</span><span>{ro(lei)} lei</span></div>
</div>'''

def pagefoot(doc, i, n):   # doar pentru previzualizarea HTML; în PDF subsolul îl pune motorul (vezi FOOTER)
    return f'<div class="pagefoot"><span>SC ROOFSHOP DMI SRL · {doc} {NR} / {DATA} · {CLIENT}</span><span>Pagina {i} din {n}</span></div>'

def footer_template(doc, mid=None):
    mid = mid if mid is not None else f"{NR} / {DATA} · {CLIENT}"
    return (f'<div style="width:100%;font-family:Arial,Helvetica,sans-serif;font-size:8px;color:#8a8a8a;padding:0 53px;'
            f'display:flex;justify-content:space-between;border-top:1px solid #d5d5d5;padding-top:4px;">'
            f'<span>SC ROOFSHOP DMI SRL · {doc} {mid}</span>'
            f'<span>Pagina <span class="pageNumber"></span> din <span class="totalPages"></span></span></div>')

def page2(doc):
    if not SUPL: return ""   # regulă (13.10.2026): pagina de supliment apare doar dacă există linii completate
    supl = "".join(f'<tr><td>{html.escape(a)}</td><td class="r">{ro(b, 0)} lei</td></tr>' for a, b in SUPL)
    return f'''<div class="sheet page2">
<div class="title"><h1>SUPLIMENT LA OFERTĂ</h1><div class="nr">la {doc.lower()} <b>{NR}</b> / {DATA} · {CLIENT}</div></div>
<div class="supl"><table>{supl}</table><div class="note">Conținutul și mențiunile acestei pagini se stabilesc după consultarea expertului fiscal.</div></div>
{pagefoot(doc, 2, 2)}
</div>'''

def doc(title, body):
    return f'<!DOCTYPE html>\n<html lang="ro"><head><meta charset="utf-8"><title>{title} {NR} — machetă</title>\n<style>{CSS}</style></head><body>{body}</body></html>'

# ---- OFERTA ----
rows = []; n = 0
for cat, spec, _, lines in CATS:
    sub = sum(round(q * p, 2) for _, _, _, q, p in lines)
    label = cat if not spec or cat == "Învelitori" else f"{cat} · {spec}"
    rows.append(f'<tr class="cat"><td colspan="5">{html.escape(label)}</td><td class="r subv">{ro(sub)}</td></tr>')
    for name, fam, um, q, p in lines:
        n += 1; qs = ro(q, 3) if um == "mp" else ro(q, 0)
        rows.append(f'<tr><td class="n">{n}</td><td>{html.escape(name)}</td><td class="c">{um}</td><td class="r">{qs}</td><td class="r">{ro(p)}</td><td class="r">{ro(round(q*p,2))}</td></tr>')
oferta = f'''<div class="sheet">
{head("DEVIZ OFERTĂ")}
<table class="lines">
<thead><tr><th class="n">Nr.</th><th>Produs</th><th class="c">UM</th><th class="r q">Cantitate</th><th class="r p">Preț unitar (€)</th><th class="r v">Valoare (€)</th></tr></thead>
<tbody>{"".join(rows)}</tbody></table>
<div class="bottom">
<div class="foot">
  <p><b>Garanții:</b> învelitoare 30 de ani culoare și coroziune; sistem pluvial 20 de ani culoare, 30 de ani coroziune.</p>
  <p><b>Curs EURO – {ro(RATE, 4)}</b></p>
</div>
{totals()}
</div>
{pagefoot("Deviz ofertă", 1, NPAG)}
</div>
{page2("Deviz ofertă")}'''

# ---- REZUMAT ----
blocks = []
for i, (cat, spec, gar, lines) in enumerate(CATS, 1):
    if cat == "Învelitori":
        mp = sum(q for _, _, um, q, _ in lines if um == "mp")
        bh = f'<div class="bh"><span class="bn">{i}.</span><span class="bt">Învelitoare</span><span class="bs">— {html.escape(spec)}</span></div>'
        bb = f'<div class="bb"><span class="k">Suprafață</span><span class="v"><b>{ro(mp, 3)} mp</b></span><span class="k">Garanție</span><span class="v">{gar}</span></div>'
    else:
        fams = list(OrderedDict.fromkeys(f for _, f, _, _, _ in lines))
        pieces = sum(q for _, _, _, q, _ in lines)
        unit = "piese" if all(um == "buc" for _, _, um, _, _ in lines) else "articole (cutii, role, bucăți)"
        bh = f'<div class="bh"><span class="bn">{i}.</span><span class="bt">{html.escape(cat)}</span>' + (f'<span class="bs">— {html.escape(spec)}</span>' if spec else "") + '</div>'
        bb = f'<div class="bb"><span class="k">Cuprinde</span><span class="v">{html.escape(", ".join(fams))}</span><span class="k">Total</span><span class="v"><b>{ro(pieces,0)} {unit}</b></span>'
        if gar: bb += f'<span class="k">Garanție</span><span class="v">{gar}</span>'
        bb += '</div>'
    blocks.append(f'<div class="block">{bh}{bb}</div>')
rezumat = f'''<div class="sheet">
{head("REZUMAT OFERTĂ")}
<div class="intro">Vă prezentăm pe scurt materialele cuprinse în oferta noastră:</div>
{"".join(blocks)}
<div class="bottom">
<div class="foot">
  <p>Oferta detaliată, cu cantitățile pe fiecare produs, se predă la confirmarea comenzii.</p>
  <p><b>Curs EURO – {ro(RATE, 4)}</b></p>
</div>
{totals()}
</div>
{pagefoot("Rezumat ofertă", 1, NPAG)}
</div>
{page2("Rezumat ofertă")}'''

# ---- OFERTA DETALIATĂ (oferta + panotajul fiecărei învelitori + căsuță de recepție pe fiecare linie) ----
rows = []; n = 0
for cat, spec, _, lines in CATS:
    sub = sum(round(q * p, 2) for _, _, _, q, p in lines)
    label = cat if not spec or cat == "Învelitori" else f"{cat} · {spec}"
    rows.append(f'<tr class="cat"><td colspan="5">{html.escape(label)}</td><td class="r subv">{ro(sub)}</td><td></td></tr>')
    for name, fam, um, q, p in lines:
        n += 1; qs = ro(q, 3) if um == "mp" else ro(q, 0)
        rows.append(f'<tr><td class="n">{n}</td><td>{html.escape(name)}</td><td class="c">{um}</td><td class="r">{qs}</td><td class="r">{ro(p)}</td><td class="r">{ro(round(q*p,2))}</td><td class="k"><span class="cb"></span></td></tr>')
        if um == "mp":
            rows.append('<tr class="panh"><td colspan="2">Panotaj — lungime coală × bucăți</td><td></td><td class="r">mp</td><td colspan="3"></td></tr>')
            for l, b in PANOTAJ:
                rows.append(f'<tr class="pan"><td colspan="2">{ro(l, 2)} m × {b} buc</td><td></td><td class="r">{ro(l*b*LATIME, 3)}</td><td colspan="2"></td><td class="k"><span class="cb"></span></td></tr>')
            rows.append(f'<tr class="pan"><td colspan="2"><b>{COLI} coli · lățime totală {ro(LATIME, 2)} m</b></td><td></td><td class="r"><b>{ro(MP, 3)}</b></td><td colspan="3"></td></tr>')
detaliata = f'''<div class="sheet">
{head("DEVIZ OFERTĂ — DETALIAT")}
<table class="lines">
<thead><tr><th class="n">Nr.</th><th>Produs</th><th class="c">UM</th><th class="r q">Cantitate</th><th class="r p">Preț unitar (€)</th><th class="r v">Valoare (€)</th><th class="k">Primit</th></tr></thead>
<tbody>{"".join(rows)}</tbody></table>
<div class="bottom">
<div class="foot">
  <p><b>Garanții:</b> învelitoare 30 de ani culoare și coroziune; sistem pluvial 20 de ani culoare, 30 de ani coroziune.</p>
  <p><b>Curs EURO – {ro(RATE, 4)}</b></p>
  <p>Coloana „Primit": de bifat la recepția mărfii.</p>
</div>
{totals()}
</div>
{pagefoot("Deviz ofertă", 1, NPAG)}
</div>
{page2("Deviz ofertă")}'''

# ---- TABELUL DE FACTURARE (intern, pentru contabilitate; în lei, la cursul ofertei) ----
rows = []; n = 0; tl = 0.0; tv = 0.0
for cat, spec, _, lines in CATS:
    for name, fam, um, q, p in lines:
        n += 1; ul = round(p * RATE, 4); val = round(q * ul, 2); tvl = round(val * TVA, 2); tl += val; tv += tvl
        qs = ro(q, 3) if um == "mp" else ro(q, 3)
        rows.append(f'<tr><td class="n">{n}</td><td>{html.escape(name)}</td><td class="c">{um}</td><td class="r">{qs}</td><td class="r">{ro(ul, 4)}</td><td class="r">{ro(val)}</td><td class="r">{ro(tvl)}</td></tr>')
for a, b in SUPL[:0]: pass   # liniile din zona B intră doar dacă sunt bifate „preia în factură" (în acest test: niciuna)
facturare = f'''<div class="sheet">
{head("TABEL DE FACTURARE", "pentru oferta")}
<div class="intern">Document intern, pentru contabilitate — cantitățile și prețurile de facturat, în lei, la cursul ofertei ({ro(RATE, 4)}). Date de facturare: cele ale clientului, dacă în comandă nu sunt altele.</div>
<table class="lines">
<thead><tr><th class="n">Nr.</th><th>Denumire</th><th class="c">UM</th><th class="r q">Cantitate</th><th class="r p">Preț unitar (lei)</th><th class="r v">Valoare (lei)</th><th class="r v">TVA 21 % (lei)</th></tr></thead>
<tbody>{"".join(rows)}</tbody></table>
<div class="bottom"><div class="foot"></div>
<div class="totals">
  <div><span>Total fără TVA</span><span>{ro(tl)} lei</span></div>
  <div><span>TVA 21 %</span><span>{ro(tv)} lei</span></div>
  <div class="big"><span>Total de facturat</span><span>{ro(tl + tv)} lei</span></div>
</div></div>
{pagefoot("Tabel de facturare", 1, 1)}
</div>'''


# ---- FIȘA ȘOFERULUI (una sau mai multe comenzi selectate din tabelul de comenzi; pentru încărcare și livrare) ----
DELIV = [
 dict(nr="IB-0152", client="Popescu Andrei", tel="0722 000 111", adresa="Str. Florilor nr. 12, Câmpineanca, jud. Vrancea",
      rez="Hellenic 8019 Grande Mat 0,5 — 192,27 mp; sistem pluvial 8019 mat; accesorii tinichigerie + fixare 8019 Grande Mat",
      coli="35 coli (6,20 × 10 · 5,40 × 8 · 4,30 × 7 · 3,10 × 6 · 1,25 × 4)", piese="tinichigerie 92 buc · fixare 16 art. · pluvial 107 buc",
      montator="Gheorghe V. · 0733 000 222", rest="9.799,54 lei", instr="marți 20.10, după 14:00; sună înainte; acces cu camionul pe strada din spate", loc="https://maps.app.goo.gl/exemplu1"),
 dict(nr="IB-0149 (completare la IB-0147)", client="Asociația Cercul Unirea", tel="0744 000 333", adresa="Str. Mărului nr. 7, Câmpineanca, jud. Vrancea",
      rez="accesorii tinichigerie 8019 Grande Mat 0,5 (fără învelitoare)", coli="—", piese="tinichigerie 12 buc",
      montator="Gheorghe V. · 0733 000 222", rest="862,13 lei", instr="odată cu IB-0147, joi 16.10; jgheaburile rămân pe paleți", loc="https://maps.app.goo.gl/exemplu2"),
]
blocks = []
for i, d in enumerate(DELIV, 1):
    tel = d["tel"].replace(" ", "")
    blocks.append(f'''<div class="dl">
  <div class="dlh"><span class="n">{i}</span><b>{html.escape(d["client"])}</b><span class="nr">comanda {html.escape(d["nr"])}</span><a class="tel" href="tel:{tel}">📞 {html.escape(d["tel"])}</a></div>
  <div class="dlb">
    <span class="k">Adresa</span><span class="v">{html.escape(d["adresa"])} &nbsp;·&nbsp; <a href="{d["loc"]}">locația pe hartă</a></span>
    <span class="k">Marfa</span><span class="v">{html.escape(d["rez"])}<br><span class="sub">{html.escape(d["coli"])} &nbsp;·&nbsp; {html.escape(d["piese"])}</span></span>
    <span class="k">Livrare</span><span class="v">{html.escape(d["instr"])}</span>
    <span class="k">Montator</span><span class="v">{html.escape(d["montator"].split(" · ")[0])} &nbsp;·&nbsp; <a class="tel" href="tel:{d["montator"].split(" · ")[1].replace(" ", "")}">📞 {html.escape(d["montator"].split(" · ")[1])}</a></span>
    <span class="k">De încasat</span><span class="v big">{html.escape(d["rest"])}</span>
    <span class="k">Predat</span><span class="v"><span class="cb"></span> marfă &nbsp;&nbsp; <span class="cb"></span> bani &nbsp;&nbsp; <span class="cb"></span> aviz semnat</span>
  </div>
</div>''')
fisa_sof = f'''<div class="sheet">
<div class="head">
  <div class="firm"><b>SC ROOFSHOP DMI SRL</b><br>Depozit: Str. Mărășești nr. 37, Focșani<br>Gestiune: Maria P. · <a class="tel" href="tel:0755000444">📞 0755 000 444</a></div>
  <div class="logos"><div class="logo big">sigla firmei</div></div>
</div>
<div class="title"><h1>FIȘA ȘOFERULUI</h1><div class="nr">joi, <b>16.10.2026</b> · {len(DELIV)} livrări · mașina noastră</div></div>
<div class="intern">Document intern, pentru încărcare și livrare. Telefoanele se pot apela direct din PDF. Ordinea de mai jos e ordinea propusă a traseului.</div>
{"".join(blocks)}
<div class="foot"><p><b>Documente anexate:</b> aviz de marfă IB-0152 · aviz de marfă IB-0149 (tipărite din același ecran). &nbsp; <b>La întoarcere:</b> fișa semnată și banii la Gestiune.</p></div>
<div class="pagefoot"><span>SC ROOFSHOP DMI SRL · Fișa șoferului · 16.10.2026 · 2 livrări</span><span>Pagina 1 din 1</span></div>
</div>'''

for name, title, body in (("macheta-oferta", "Deviz ofertă", oferta), ("macheta-rezumat", "Rezumat ofertă", rezumat),
                          ("macheta-oferta-detaliata", "Deviz ofertă detaliat", detaliata), ("macheta-tabel-facturare", "Tabel de facturare", facturare),
                          ("macheta-fisa-soferului", "Fișa șoferului", fisa_sof)):
    open(os.path.join(HERE, name + ".html"), "w", encoding="utf-8").write(doc(title, body))
print("html ok · total", ro(total), "· tva", ro(tva), "· cu TVA", ro(cu), "· lei", ro(lei))

try:
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page()
        for name, label in (("macheta-oferta", "Deviz ofertă"), ("macheta-rezumat", "Rezumat ofertă"),
                            ("macheta-oferta-detaliata", "Deviz ofertă detaliat"), ("macheta-tabel-facturare", "Tabel de facturare"),
                            ("macheta-fisa-soferului", "Fișa șoferului")):
            pg.goto("file://" + os.path.join(HERE, name + ".html")); pg.emulate_media(media="print")
            pg.pdf(path=os.path.join(HERE, name + ".pdf"), format="A4", print_background=True, prefer_css_page_size=True,
                   display_header_footer=True, header_template="<span></span>",
                   footer_template=footer_template(label, "· 16.10.2026 · 2 livrări" if name == "macheta-fisa-soferului" else None))
        b.close()
    print("pdf ok")
except Exception as e:
    print("pdf: playwright indisponibil —", e)
