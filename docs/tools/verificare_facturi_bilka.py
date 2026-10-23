#!/usr/bin/env python3
"""
Verificarea achiziției pe facturi Bilka — compară rând cu rând prețurile facturate (lei)
cu prețurile de catalog (EUR, docs/import/Bilka/*.csv) × cursul de pe factură (BNR + 1 %).

Rulare (din folderul proiectului):
    python docs/tools/verificare_facturi_bilka.py <folder_cu_PDF-uri> <folder_iesire>
Cerințe: Python 3, `pdftotext` (poppler) în PATH. Fișierele PDF sunt facturile Bilka așa cum vin pe e-mail.
Ieșire: facturi.json (rândurile citite), verificare-randuri.csv, verificare-totaluri.csv (+ .json).
Scris de Claude (chat), 23.10.2026 — prima rulare: 16 facturi, 16–22.10.2026 (docs/VERIFICARE-FACTURI-BILKA.md).
"""
import subprocess, sys, os, glob, re, json, csv
from decimal import Decimal, ROUND_HALF_UP

if len(sys.argv) < 3:
    print(__doc__); sys.exit(1)
PDF_DIR, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
TXT = os.path.join(OUT, "txt"); os.makedirs(TXT, exist_ok=True)
for f in sorted(glob.glob(os.path.join(PDF_DIR, "*.PDF")) + glob.glob(os.path.join(PDF_DIR, "*.pdf"))):
    subprocess.run(["pdftotext", "-layout", f, os.path.join(TXT, os.path.splitext(os.path.basename(f))[0] + ".txt")], check=True)
HERE = os.path.dirname(os.path.abspath(__file__))
CAT = os.path.normpath(os.path.join(HERE, "..", "import", "Bilka"))
if not os.path.isdir(CAT): CAT = os.path.normpath(os.path.join(HERE, "..", "import", "bilka"))
BASE = OUT

# ===================== 1. citirea facturilor =====================

def num(s):
    s = s.strip().replace(".", "").replace(",", ".")
    return float(s)

line_re = re.compile(
    r"^\s*(\d+)\s{2,}(.+?)\s{2,}(M2|M|BUC|CUT|ROLA|ROLĂ|SET|KG|ML)\s+([\d.]+,\d{3})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+(\d+)%\s+([\d.]+,\d{2})\s*$"
)

invoices = []
for f in sorted(glob.glob(os.path.join(TXT, "*.txt"))):
    t = open(f, encoding="utf-8").read()
    inv = {"file": os.path.basename(f), "lines": []}
    m = re.search(r"Nr factura:\s*(\d+)", t); inv["nr"] = m.group(1) if m else None
    m = re.search(r"Data\(ziua,luna,anul\):\s*([\d.]+)", t); inv["data"] = m.group(1) if m else None
    m = re.search(r"Curs valutar:\s*([\d,]+)", t); inv["curs"] = num(m.group(1)) if m else None
    m = re.search(r"Cumparator:\s*(.+?)\s{2,}", t); inv["cumparator"] = m.group(1).strip() if m else None
    m = re.search(r"Cotele TVA:\s*(\d+)%", t); inv["tva"] = int(m.group(1)) if m else None
    # totals: "Total din care   741,62   155,74" and "Total de plata ... 897,36"
    m = re.search(r"Total din care\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})", t)
    inv["total_fara_tva"] = num(m.group(1)) if m else None
    inv["total_tva"] = num(m.group(2)) if m else None
    # total de plata: last standalone number after "Total de plata"
    m = re.search(r"Total de plata[\s\S]*?\n\s*([\d.]+,\d{2})\s*\n", t)
    inv["total_plata"] = num(m.group(1)) if m else None
    for ln in t.split("\n"):
        mm = line_re.match(ln)
        if mm:
            nr, den, um, q, pu, val, cota, vat = mm.groups()
            inv["lines"].append({"nr": int(nr), "den": re.sub(r"\s+", " ", den.strip()), "um": um,
                                 "cant": num(q), "pret": num(pu), "val": num(val), "cota": int(cota), "tva": num(vat)})
    invoices.append(inv)

json.dump(invoices, open(os.path.join(OUT, "facturi.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for inv in invoices:
    s = sum(l["val"] for l in inv["lines"])
    print(f'{inv["nr"]} {inv["data"]} curs={inv["curs"]} {inv["cumparator"]:18} linii={len(inv["lines"]):2d} suma={s:10.2f} total_fara_tva={inv["total_fara_tva"]} tva={inv["total_tva"]} plata={inv["total_plata"]} {"OK" if inv["total_fara_tva"] is not None and abs(s-inv["total_fara_tva"])<0.015 else "DIFERA"}')

# ===================== 2. potrivirea cu catalogul =====================

# ---------- catalog ----------
cat = []
for f in sorted(glob.glob(os.path.join(CAT, "0*.csv"))):
    with open(f, encoding="utf-8-sig", newline="") as fh:
        for r in csv.DictReader(fh, delimiter=";"):
            r["_lista"] = os.path.basename(f)[:2]
            r["_pret"] = Decimal(r["pret_eur"])
            cat.append(r)

def find(pattern, fin=None, gr=None, lista=None, exact_name=None):
    out = []
    for r in cat:
        if lista and r["_lista"] != lista: continue
        if exact_name is not None:
            if r["denumire"] != exact_name: continue
        elif not re.search(pattern, r["denumire"]): continue
        if fin is not None and (r.get("finisaj") or "") != fin: continue
        if gr is not None and (r.get("grosime") or "") != gr: continue
        if r["denumire"].endswith("dripstop") or "soundcontrol" in r["denumire"].lower(): continue
        out.append(r)
    return out

# ---------- parsing invoice descriptions ----------
def finisaj_of(d):
    if re.search(r"GRANDEMAT|GDM", d): return "Grande Mat"
    if re.search(r"\bDPM\b|\d{4}DPM", d): return "dubluvopsit mat"
    if re.search(r"\bDPL\b|\d{4}DPL", d): return "dubluvopsit lucios"
    if "MAGNELIS" in d: return "Magnelis"
    if re.search(r"MAT\b", d): return "mat"
    return "lucios"

def grosime_of(d, fin):
    m = re.search(r"0\.(40|45|50|57|60|70)\s*MM", d)
    if m: return f"0,{m.group(1)} mm"
    if fin == "Grande Mat": return "0,50 mm"
    return None

def pluvial_of(d):
    if "MAGNELIS" in d: return "pluvial Magnelis"
    if re.search(r"MAT\b", d): return "pluvial mat"
    return r"pluvial colorat \(lucios\)"

def match(den, um):
    """returns (list_of_catalog_rows, multiplier, note)"""
    d = den.upper()
    if d.startswith("PALET"): return [], None, "ambalaj"
    fin = finisaj_of(d); gr = grosime_of(d, fin)
    # tigla
    m = re.match(r"(?:TIGLA METALICA )?(CLASIC|DACIC|BALCANIC|IBERIC|GOTIC|ADRIATIC|HELLENIC|BRITANIC|ROMANIC) 35\b", d)
    if m:
        model = m.group(1).capitalize()
        return find(rf"^Țiglă metalică {model} – ", fin, gr), 1, ""
    m = re.match(r"TABLA CUTATA (T\d+) ", d)
    if m:
        return find(rf"^Tablă cutată {m.group(1)} \(", fin, gr), 1, ""
    if d.startswith("TABLA PLANA"):
        rows = find(r"^Tablă plană cu folie protectoare", fin, gr)
        return rows, Decimal("2.5"), "coală 1,25 × 2,00 m = 2,5 mp"
    if d.startswith("COAMA MICA"): return find(r"^Coamă mică – ", fin, gr), 1, ""
    if d.startswith("COAMA MARE"): return find(r"^Coamă mare – ", fin, gr), 1, ""
    m = re.match(r"BORDURA FRONTON (\d+) ?MM", d)
    if m: return find(rf"^Bordură fronton – {m.group(1)} mm", fin, gr), 1, ""
    m = re.match(r"COLECTOR FRONTON (\d+) ?MM", d)
    if m: return find(rf"^Colector fronton – {m.group(1)} mm", fin, gr), 1, ""
    m = re.match(r"BORDURA STREASINA (\d+) ?MM", d)
    if m: return find(rf"^Bordură streașină – {m.group(1)} mm", fin, gr), 1, ""
    m = re.match(r"BORDURA LA PERETE (\d+) ?MM", d)
    if m: return find(rf"^Bordură la perete – {m.group(1)} mm", fin, gr), 1, ""
    m = re.match(r"OPRITOR ZAPADA (\d+) ?MM (2ML|1\.25ML)?", d)
    if m:
        lung = "1,25 m" if (m.group(2) or "").startswith("1.25") else "2 m"
        return find(rf"^Opritor zăpadă – {m.group(1)} mm / {lung} – ", fin, gr), 1, ""
    m = re.match(r"FIXAREA PLACILOR PE ZID (\d+) ?MM", d)
    if m: return find(rf"^Fixarea plăcilor pe zid – {m.group(1)} mm", fin, gr), 1, ""
    m = re.match(r"DOLIE (\d+) ?MM", d)
    if m: return find(rf"^Dolie – {m.group(1)} mm", fin, gr), 1, ""
    if d.startswith("SET COS FUM"): return find(r"^Set coș fum \(4 piese", fin, gr), 1, ""
    if d.startswith("CAPAC COAMA"): return find(r"^Capac coamă – ", fin, None), 1, ""
    m = re.match(r"ACCESORIU SPECIAL ML .*?D(\d\d)\b", d)
    if m:
        return find(rf"^Accesoriu special la metru liniar – D{m.group(1)} ", fin, gr, lista="09"), 1, ""
    m = re.match(r"ACCESORIU SPECIAL (\d+)-(\d+) ?MM", d)
    if m:
        a, b = m.group(1), m.group(2)
        return find(rf"^Accesoriu special 2 ML – D\d\d \({a}–{b} mm\)", fin, gr, lista="08"), 1, ""
    # pluvial
    pl = pluvial_of(d)
    m = re.match(r"JGHEAB .*?(\d{3})/(\d)ML", d)
    if m: return find(rf"^Jgheab {m.group(1)} / {m.group(2)}m – {pl}$"), 1, ""
    m = re.match(r"BURLAN .*?(\d{2,3})/(\d)ML", d)
    if m: return find(rf"^Burlan {m.group(1)} / {m.group(2)}m – {pl}$"), 1, ""
    m = re.match(r"CARLIG JGHEAB (\d{3})/(\d{3}) ", d)
    if m: return find(rf"^Cârlig jgheab {m.group(1)} / {m.group(2)} mm – {pl}$"), 1, ""
    m = re.match(r"CARLIG JGHEAB COMBI (\d{3})", d)
    if m: return find(rf"^Cârlig jgheab {m.group(1)} / combi – {pl}$"), 1, ""
    if d.startswith("BRIDA JGHEAB"): return find(rf"^Brida jgheab – {pl}$"), 1, ""
    m = re.match(r"COLIER BURLAN (\d{2,3}) ", d)
    if m: return find(rf"^Colier burlan {m.group(1)} – {pl}$"), 1, ""
    m = re.match(r"CAPAC JGHEAB (\d{3}) ", d)
    if m: return find(rf"^Capac jgheab {m.group(1)} – {pl}$"), 1, ""
    m = re.match(r"ELEMENT IMBINARE JGHEAB (\d{3}) ", d)
    if m: return find(rf"^Element îmbinare jgheab {m.group(1)} – {pl}$"), 1, ""
    m = re.match(r"RACORD JGHEAB/BURLAN (\d{3})/(\d{2,3}) ", d)
    if m: return find(rf"^Racord jgheab – burlan {m.group(1)} / {m.group(2)} – {pl}$"), 1, ""
    m = re.match(r"COT DE 60 GRADE (\d{2,3}) ", d)
    if m: return find(rf"^Cot de 60 grade {m.group(1)} – {pl}$"), 1, ""
    m = re.match(r"PRELUNGITOR .*?(\d{2,3})/1ML", d)
    if m: return find(rf"^Prelungitor intermediar {m.group(1)} / 1 m – {pl}$"), 1, ""
    m = re.match(r"COLTAR EXTERIOR (\d{3}) ", d)
    if m: return find(rf"^Colțar exterior de 90 grade {m.group(1)} – {pl}$"), 1, ""
    m = re.match(r"COLTAR INTERIOR (\d{3}) ", d)
    if m: return find(rf"^Colțar interior de 90 grade {m.group(1)} – {pl}$"), 1, ""
    # fixare si etansare
    m = re.match(r"HOLTSURUB 4\.8\*(\d+) PTR LEMN", d)
    if m: return find(rf"^Holțșuruburi în culoare, lemn – 4,8 × {m.group(1)} mm$"), 1, ""
    if d.startswith("MASTIC ETANSARE 300ML BILKA PREMIUM"): return find(r"^Mastic etanșare premium Bilka – 300 ml$"), 1, ""
    if d.startswith("MASTIC ETANSARE 300ML"): return find(r"^Mastic etanșare Bilka – 300 ml$"), 1, ""
    m = re.match(r"FOLIE ANTICONDENS (\d+)MP BILKA (\d+) GR", d)
    if m: return find(rf"^Folie anticondens {m.group(2)} g – .*\({m.group(1)} mp / rolă\)$"), 1, ""
    m = re.match(r"BANDA BITUMINOASA (\d+)CM\*(\d+)ML", d)
    if m: return find(rf"^Bandă bituminoasă – {m.group(1)} cm × {m.group(2)} m$"), 1, ""
    m = re.match(r"BANDA COAMA 5M\*(\d+)MM", d)
    if m: return find(rf"^Bandă coamă – rolă 5 m × {m.group(1)} mm$"), 1, ""
    m = re.match(r"BANDA ETANSARE COAMA (T\d+)", d)
    if m: return find(rf"^Bandă etanșare profilată {m.group(1)} – coamă$"), 1, ""
    m = re.match(r"BANDA ANTIPASARI SUP INOX .*?(\d+) TEPI", d)
    if m: return find(rf"^Bandă antipăsări suport inox – {m.group(1)} țepi$"), 1, ""
    if d.startswith("SPRAY RETUS"): return find(rf"^Spray corector 400 ml – {fin}$"), 1, ""
    m = re.match(r"SIPCA DE GARD (OSLO|HAGA|BERNA|SOFIA) ", d)
    if m: return find(rf"^Șipcă {m.group(1).capitalize()} – ", fin, gr, lista="07"), 1, ""
    return [], None, "fără regulă"

def q2(x): return Decimal(x).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

rows_out = []
unmatched = []
for inv in invoices:
    curs = Decimal(str(inv["curs"]))
    for l in inv["lines"]:
        rows, mult, note = match(l["den"], l["um"])
        rec = {"factura": inv["nr"], "data": inv["data"], "curs": str(curs), "nr": l["nr"], "descriere_factura": l["den"],
               "um_factura": l["um"], "cantitate": l["cant"], "pret_factura_lei": l["pret"], "valoare_factura_lei": l["val"]}
        if note == "ambalaj":
            rec.update({"tip": "ambalaj", "cod_bilka": "", "produs_catalog": "", "pret_catalog_eur": "", "pret_asteptat_lei": "", "diferenta_lei": "", "verdict": "ambalaj (exclus din comparație)"})
        elif not rows:
            rec.update({"tip": "produs", "cod_bilka": "", "produs_catalog": "", "pret_catalog_eur": "", "pret_asteptat_lei": "", "diferenta_lei": "", "verdict": f"NEPOTRIVIT ({note or 'nu există în catalog cu aceste caracteristici'})"})
            unmatched.append((l["den"], l["um"], l["pret"], str(curs)))
        else:
            prices = sorted(set(r["_pret"] for r in rows))
            r0 = rows[0]
            eur = r0["_pret"] * (mult or 1)
            exp = q2(eur * curs)
            diff = q2(Decimal(str(l["pret"])) - exp)
            verdict = "OK" if diff == 0 else ("OK (±0,01 rotunjire)" if abs(diff) <= Decimal("0.01") else "DIFERĂ")
            if len(prices) > 1: verdict += f" | ATENȚIE: {len(rows)} produse cu prețuri diferite în catalog"
            rec.update({"tip": "produs", "cod_bilka": r0["cod_furnizor"], "produs_catalog": r0["denumire"] + (f" × {mult}" if mult and mult != 1 else ""),
                        "pret_catalog_eur": str(eur), "pret_asteptat_lei": str(exp), "diferenta_lei": str(diff), "verdict": verdict,
                        "_eur_implicit": str((Decimal(str(l["pret"])) / curs).quantize(Decimal("0.001")))})
            if len(rows) > 1 and len(prices) == 1:
                rec["produs_catalog"] += f"  [{len(rows)} produse pe același cod, același preț]"
        rows_out.append(rec)

with open(os.path.join(BASE, "verificare-randuri.csv"), "w", encoding="utf-8-sig", newline="") as fh:
    cols = ["factura","data","curs","nr","descriere_factura","um_factura","cantitate","pret_factura_lei","valoare_factura_lei","tip","cod_bilka","produs_catalog","pret_catalog_eur","pret_asteptat_lei","diferenta_lei","verdict"]
    w = csv.DictWriter(fh, fieldnames=cols, delimiter=";", extrasaction="ignore"); w.writeheader(); w.writerows(rows_out)
json.dump(rows_out, open(os.path.join(BASE, "verificare-randuri.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print("linii:", len(rows_out))
from collections import Counter
print(Counter(r["verdict"].split(" |")[0] for r in rows_out))
print("\nNEPOTRIVITE:")
for u in sorted(set(unmatched)): print("  ", u)
print("\nDIFERĂ / ±0,01 / ATENȚIE:")
for r in rows_out:
    if r["verdict"].startswith("DIFER") or "ATENȚIE" in r["verdict"] or "0,01" in r["verdict"]:
        print(f'  {r["factura"]} #{r["nr"]:2d} {r["descriere_factura"][:52]:52} fact={r["pret_factura_lei"]:>7} asteptat={r["pret_asteptat_lei"]:>7} (cat {r["pret_catalog_eur"]} EUR; implicit {r.get("_eur_implicit")}) {r["cod_bilka"]} {r["produs_catalog"][:60]}')


# ---------- totaluri pe factură ----------
print("\nTOTALURI PE FACTURĂ (fără palet):")
tot_rows = []
for inv in invoices:
    recs = [r for r in rows_out if r["factura"] == inv["nr"]]
    palet = sum(Decimal(str(r["valoare_factura_lei"])) for r in recs if r["tip"] == "ambalaj")
    fact_prod = sum(Decimal(str(r["valoare_factura_lei"])) for r in recs if r["tip"] == "produs")
    # valoarea așteptată = preț așteptat × cantitate, rotunjit la 2 zecimale (ca pe factură)
    exp_prod = sum(q2(Decimal(r["pret_asteptat_lei"]) * Decimal(str(r["cantitate"]))) for r in recs if r["tip"] == "produs" and r["pret_asteptat_lei"])
    # verificarea aritmeticii facturii: valoare = round(pret × cant)
    arit = [r for r in recs if r["tip"] == "produs" and q2(Decimal(str(r["pret_factura_lei"])) * Decimal(str(r["cantitate"]))) != Decimal(str(r["valoare_factura_lei"]))]
    tot_fact = Decimal(str(inv["total_fara_tva"]))
    ok_sum = (fact_prod + palet) == tot_fact
    diff = fact_prod - exp_prod
    tot_rows.append({"factura": inv["nr"], "data": inv["data"], "curs": inv["curs"], "linii_produse": len([r for r in recs if r["tip"]=="produs"]),
                     "palet_lei": str(palet), "total_factura_fara_tva": str(tot_fact), "produse_factura_lei": str(fact_prod),
                     "produse_asteptat_lei": str(exp_prod), "diferenta_lei": str(diff), "diferenta_pct": str((diff / exp_prod * 100).quantize(Decimal("0.01"))) if exp_prod else "",
                     "aritmetica_ok": "da" if not arit else f"nu ({len(arit)} rânduri)", "suma_liniilor_egal_total": "da" if ok_sum else "nu"})
    print(f'  {inv["nr"]} {inv["data"]} palet={palet:>7} total={tot_fact:>10} produse={fact_prod:>10} asteptat={exp_prod:>10} dif={diff:>8} ({tot_rows[-1]["diferenta_pct"]}%) aritm={"ok" if not arit else arit} suma=total:{ok_sum}')
with open(os.path.join(BASE, "verificare-totaluri.csv"), "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=list(tot_rows[0].keys()), delimiter=";"); w.writeheader(); w.writerows(tot_rows)
json.dump(tot_rows, open(os.path.join(BASE, "verificare-totaluri.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
