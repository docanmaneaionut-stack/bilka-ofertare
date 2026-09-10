import json, re, glob, os
from collections import defaultdict, Counter

LP = {r[0]: {"price": r[1], "cur": r[2], "um": r[3], "desc": r[4], "cat": r[5]} for r in json.load(open("/home/claude/listapret.json"))}
TXT = {os.path.basename(f)[:2]: open(f, encoding="utf-8").read().splitlines() for f in glob.glob("/home/claude/pdftxt/*.txt")}

PRICE = re.compile(r"(\d+[.,]\d\d)\s*Euro")

def thk(s):
    m = re.search(r"(\d)[,.](\d\d)\s*mm", s)
    return m.group(1) + m.group(2) if m else None

def fin_single(s):
    t = s.lower()
    if "ssab" in t or "dubluvopsit" in t or "dublu vopsit" in t or "dublu-vopsit" in t:
        return "DPL" if "lucios" in t else "DPM"
    if "magnelis" in t: return "MGN"
    if "zincat" in t: return "ZNC"
    if "grande mat" in t or "grandemat" in t or "gdm" in t: return "GDM"
    if "wood" in t: return "WOD"
    if "8003" in t: return "803"
    if "lucios" in t: return "LUC"
    if "mat" in t: return "MAT"
    return None

entries = []  # (file, label, code, pdf_price)

ALT = {"DPL060": ["SPX060", "SSB060"], "DPM060": ["MPX060"], "ZNC037": ["ZN2037"], "ZNC040": ["ZN2040"], "ZNC045": ["ZN2045"], "ZNC050": ["ZN2050"], "ZNC060": ["ZN2060"], "ZNC070": ["ZN2070"]}
def add(f, label, code, price):
    if code not in LP:
        for alt in ALT.get(code[5:], []):
            if code[:5] + alt in LP: code = code[:5] + alt; break
    entries.append((f, label.strip(), code, float(price.replace(",", "."))))

# ---------- single-line families ----------
TILE = {"DACIC": "DAC", "ADRIATIC": "ADR", "HELLENIC": "HEL", "BRITANIC / BRITANIC RETRO": "BRI", "CLASIC": "CLS",
        "BALCANIC": "BLC", "GOTIC": "GOT", "IBERIC": "IBE", "ROMANIC": "ROM"}

def single_lines(f, lines, rules):
    """rules: list of (regex on label, function(label, section)->family5) ; section tracking by header keywords"""
    section = ""; pending = None
    for ln in lines:
        s = ln.strip()
        up = s.upper()
        # section headers
        if "SOUNDCONTROL" in up and "Euro" not in s and not re.search(r"\d[,.]\d\d\s*mm", s): section = "SC"
        elif "DRIPSTOP" in up and "Euro" not in s and not re.search(r"\d[,.]\d\d\s*mm", s): section = "DR"
        elif ("RETRO PLUS - STANDARD" in up or "RETRO PANEL - STANDARD" in up or "RETRO DUO /" in up) and "CU " not in up and "Euro" not in s: section = ""
        elif "LATIME TOTALA 360" in up: section = "360"
        elif "LATIME TOTALA 560" in up: section = "560"
        elif re.match(r"^\s*(T8|T12|T18|T35|T45|SINUS|Tabla cutata - T35)\b", s) and "Euro" not in s and "DRIPSTOP" not in up: section = ""
        elif re.match(r"^\s*(A\. TABLA PLANA|B\. TABLA CUTATA|A\. TABLA CUTATA ZINCATA|B\. Tabla plana)", s): section = ""
        m = PRICE.search(s)
        if not m:
            if re.match(r"^(DACIC|ADRIATIC|HELLENIC|BRITANIC|CLASIC|BALCANIC|GOTIC|IBERIC|ROMANIC|RETRO|TABLA|Tabla|Coama|Capac|Inchidere)", s):
                pending = s
            continue
        label = s[:m.start()].strip()
        if not re.search(r"[a-z]{3}", label) and pending:
            label = pending; pending = None
        # strip finish column labels appended by layout (e.g. 'LUCIOS', 'MAT', 'GDM')
        label = re.sub(r"\s+(LUCIOS|MAT|WOOD|GDM|MAGNELIS|DUBLU|VOPSIT|ZINCAT)\s*$", "", label)
        for rx, fn in rules:
            if re.match(rx, label, re.I):
                fam = fn(label, section)
                if not fam: break
                fi = fin_single(label); th = thk(label)
                if fam in ("AXCAP", "AXINC"):
                    code = fam + fi + ("MIC" if "mica" in label.lower() else "000")
                else:
                    if fi is None or th is None: break
                    if fi in ("DPL", "DPM") and "ssab" in label.lower(): th = "060"
                    code = fam + fi + th
                add(f, label, code, m.group(1))
                break

def tile_fam(label, section):
    for k, v in TILE.items():
        if label.upper().startswith(k):
            return ("TD" if "dripstop" in label.lower() else "TM") + v
    return None

rules01 = [
    (r"^(DACIC|ADRIATIC|HELLENIC|BRITANIC|CLASIC|BALCANIC|GOTIC|IBERIC|ROMANIC)\b", tile_fam),
    (r"^Tabla plana", lambda l, s: "TPLAN"),
    (r"^Coama mica", lambda l, s: "ACMIC"),
    (r"^Coama mare", lambda l, s: "ACMAR"),
    (r"^Capac coama", lambda l, s: "AXCAP"),
    (r"^Inchidere coama", lambda l, s: "AXINC"),
]
rules05 = [
    (r"^RETRO PLUS -", lambda l, s: {"": "REPRO", "DR": "REPDR", "SC": "REPSC"}[s]),
    (r"^RETRO PANEL -", lambda l, s: {"": "RETRO", "DR": "RETDR", "SC": "RETSC"}[s]),
    (r"^RETRO DUO -", lambda l, s: {"": "REDUO", "DR": "RDDUO"}.get(s, "REDUO")),
    (r"^TABLA FALTUITA -", lambda l, s: "TFA36" if s == "360" else "TFALT"),
]
def cut_fam(label, section):
    up = label.upper()
    for k, v in [("T8", "08"), ("T12", "12"), ("T18", "18"), ("T35", "35"), ("T45", "45")]:
        if re.search(r"\b" + k + r"\b", up):
            return ("TDT" if section == "DR" else "TCT") + v
    if "S18" in up or "SINUS" in up: return "SIN18"
    return None
rules06 = [
    (r"^Tabla plana", lambda l, s: "TPLAN"),
    (r"^Tabla (cutata|sinus)", cut_fam),
]

single_lines("01", TXT["01"], rules01)
single_lines("05", TXT["05"], rules05)
single_lines("06", TXT["06"], rules06)

# ---------- multi-column tables ----------
def multi(f, lines, start_pat, end_pat, cols, fammap, extra=None):
    """cols: list of (finish, thk) per price column; fammap: function(label, desf, length)->family5"""
    active = False; lastlabel = None
    for ln in lines:
        s = ln.rstrip()
        if re.search(start_pat, s): active = True; continue
        if active and re.search(end_pat, s): active = False; continue
        if not active: continue
        if "Indisponibil" in s: s = s.replace("Indisponibil", "0.00 Euro")
        prices = PRICE.findall(s)
        if not prices:
            if re.search(r"[A-Za-z]{4}", s) and "Euro" not in s: lastlabel = s.strip()
            continue
        if not re.search(r"[A-Za-z]{4}", s[:PRICE.search(s).start()]) and lastlabel:
            s = lastlabel + "   " + s
        if len(prices) != len(cols):
            if extra: extra(f, s, prices)
            continue
        head = s[:PRICE.search(s).start()]
        dm = re.search(r"(\d{3})\s*mm", head)
        desf = dm.group(1) if dm else None
        lm = re.search(r"/\s*(2m|1\.25m)|\b(2\.00|1\.25)\s*m\b", head)
        ln_ = None
        if lm:
            g = lm.group(1) or lm.group(2)
            ln_ = "1.25m" if g.startswith("1.25") else "2m"
        label = head.strip()
        fam = fammap(label, desf, ln_)
        if not fam:
            if extra: extra(f, s, prices)
            continue
        for (fi, th), pr in zip(cols, prices):
            if pr == "0.00": continue
            add(f, f"{label} [{fi} {th}]", fam + fi + th, pr)

def fam_res(label, desf, ln_):
    l = label.lower()
    if l.startswith("opritor zapada omega"): return None
    if l.startswith("opritor zapada"): return "AOZ12" if ln_ == "1.25m" else "AOZ20"
    if l.startswith("bordura streasina"): return "AST" + desf[:2]
    if l.startswith("fixarea placilor"): return "AFP" + desf[:2]
    if l.startswith("bordura fronton sub"): return None
    if l.startswith("bordura fronton"): return "ABF" + desf[:2]
    if l.startswith("paravant"): return None
    if l.startswith("colector fronton"): return "ACF" + desf[:2]
    if l.startswith("ruperea pantei") or l.startswith("rup. pantei"): return "ARP" + desf[:2]
    if l.startswith("dolie"): return "ADO" + desf[:2]
    if l.startswith("bordura la perete"): return "ABP" + desf[:2]
    if l.startswith("coama unghiulara britanic"): return "ACB41"
    if l.startswith("semicoama britanic"): return "ASB41"
    if l.startswith("set cos fum"): return "ASCF4"
    if l.startswith("profil"):
        m = re.search(r"T(\d+)", label); return "APU" + m.group(1).zfill(2)
    if l.startswith("coama unghiulara britanic"): return "ACB41"
    if l.startswith("semicoama britanic"): return "ASB41"
    if desf is None: return None
    if l.startswith("coama unghiulara industriala"): return "ACI" + desf[:2]
    if l.startswith("coama unghiulara"): return "ACU" + desf[:2]
    if l.startswith("subcoama industriala"): return "ASI" + desf[:2]
    if l.startswith("coltar"): return "ACL" + desf[:2]
    if l.startswith("profil"):
        m = re.search(r"T(\d+)", label); return "APU" + m.group(1).zfill(2)
    if l.startswith("semicoama"): return "ASM31"
    if l.startswith("set cos fum"): return "ASCF4"
    return None

unm = []
def rec(f, s, prices): unm.append((f, s.strip()[:70], len(prices)))

L01 = TXT["01"]
multi("01", L01, r"NUANTE LUCIOASE", r"NUANTE MATE|Accesoriile marcate", [("LUC", "060"), ("LUC", "050"), ("LUC", "045"), ("LUC", "040"), ("WOD", "050"), ("WOD", "045")], fam_res, rec)
multi("01", L01, r"NUANTE MATE", r"Accesoriile marcate cu \* sunt obligatorii pentru invelitoarea ROMANIC\s*$", [("MAT", "060"), ("MAT", "050"), ("MAT", "045"), ("MAT", "040"), ("803", "045"), ("GDM", "050")], fam_res, rec)

L06 = TXT["06"]
multi("06", L06, r"C\. ACCESORII DE TINICHIGERIE - FINISAJ LUCIOS", r"Nota : accesoriile", [("LUC", "070"), ("LUC", "060"), ("LUC", "050"), ("LUC", "045"), ("LUC", "040")], fam_res, rec)
multi("06", L06, r"C\. ACCESORII DE TINICHIGERIE - FINISAJ MAT", r"Nota : accesoriile", [("MAT", "060"), ("MAT", "050"), ("MAT", "045"), ("MAT", "040")], fam_res, rec)
multi("06", L06, r"FINISAJ GDM \+ FINISAJ WOOD \+ RAL 8003", r"Nota : accesoriile", [("GDM", "050"), ("WOD", "050"), ("WOD", "045"), ("803", "045")], fam_res, rec)
multi("06", L06, r"C\. ACCESORII DE TINICHIGERIE - FINISAJ DUBLUVOPSIT", r"Nota : accesoriile", [("DPL", "040"), ("DPM", "040"), ("DPL", "050"), ("DPM", "050"), ("DPL", "060"), ("DPM", "060")], fam_res, rec)
multi("06", L06, r"C\. ACCESORII DE TINICHIGERIE - ZINCATE", r"Nota : accesoriile", [("ZNC", "037"), ("ZNC", "040"), ("ZNC", "045"), ("ZNC", "050"), ("ZNC", "060"), ("ZNC", "070")], fam_res, rec)
multi("06", L06, r"D\. ACCESORII DE TINICHIGERIE INDUSTRIALE - ZINCATE", r"Nota : accesoriile", [("ZNC", "037"), ("ZNC", "040"), ("ZNC", "045"), ("ZNC", "050"), ("ZNC", "060"), ("ZNC", "070")], fam_res, rec)

# Retro accessories (05)
def fam_retro(label, desf, ln_):
    l = label.lower()
    m = re.search(r"\(\s*(\d{2,3})\s*mm", label); d = m.group(1) if m else ""
    if l.startswith("coama retro"): return "ACR41"
    if l.startswith("semicoama retro"): return "ASR31"
    if l.startswith("suport coama"): return "ASC12"
    if l.startswith("bordura fronton retro"): return "AFR31"
    if l.startswith("dolie retro"): return "ADR" + d[:2]
    if l.startswith("bordura streasina retro"): return "ASTR3" if d == "312" else "ASTR2"
    if l.startswith("bordura perete laterala"): return "ABPL2"
    if l.startswith("bordura perete orizontala"): return "ABPO3"
    if l.startswith("ruperea pantei"): return "ARPR3"
    if l.startswith("element mic"): return "AES60"
    if l.startswith("element mare"): return "AES80"
    if l.startswith("set cos fum"): return "ASCFR"
    return None
L05 = TXT["05"]
multi("05", L05, r"A\. ACCESORII DE TINICHIGERIE - FINISAJ LUCIOS", r"\* Nota", [("LUC", "060"), ("LUC", "050"), ("LUC", "045"), ("WOD", "050"), ("WOD", "045")], fam_retro, rec)
multi("05", L05, r"B\. ACCESORII DE TINICHIGERIE - FINISAJ MAT", r"\* Nota", [("MAT", "060"), ("MAT", "050"), ("MAT", "045"), ("803", "045"), ("GDM", "050")], fam_retro, rec)
multi("05", L05, r"C\. ACCESORII DE TINICHIGERIE - FINISAJ DUBLUVOPSIT", r"\* Nota", [("DPL", "060"), ("DPM", "060"), ("DPL", "050"), ("DPM", "050")], fam_retro, rec)
# single-price retro items
for ln in L05:
    if "Opritor de zapada ,, Retro" in ln and PRICE.search(ln): add("05", "Opritor zapada Retro tip bara", "AOZRB2ML000", PRICE.search(ln).group(1))
    if "Piesa conectoare" in ln and PRICE.search(ln): add("05", "Piesa conectoare", "APCOZRB0000", PRICE.search(ln).group(1))

# Special accessories (08 = ASP, 09 = AML)
def special(f, lines, fam3):
    cols = None
    for ln in lines:
        up = ln.upper()
        if "A. FINISAJ LUCIOS" in up: cols = [("LUC", "040"), ("LUC", "045"), ("LUC", "050"), ("LUC", "060"), ("LUC", "070")]
        elif "FINISAJ MAT" in up and "GRANDEMAT" in up: cols = [("MAT", "040"), ("MAT", "045"), ("MAT", "050"), ("MAT", "060"), ("GDM", "050")]
        elif up.strip().startswith("B. DUBLUVOPSIT"): cols = [("DPL", "060"), ("DPM", "060"), ("DPL", "050"), ("DPM", "050"), ("DPL", "040"), ("DPM", "040")]
        elif "C. FINISAJ DUBLUVOPSIT" in up: cols = [("DPM", "060"), ("DPL", "060"), ("DPL", "050"), ("DPM", "050"), ("DPL", "040"), ("DPM", "040")]
        elif "WOOD + MAGNELIS" in up: cols = [("WOD", "050"), ("WOD", "045"), ("MGN", "050"), ("803", "045")]
        elif "ZINCAT" in up and ("C." in up): cols = [("ZNC", "037"), ("ZNC", "040"), ("ZNC", "045"), ("ZNC", "050"), ("ZNC", "060"), ("ZNC", "070")]
        m = re.match(r"\s*D(\d\d)\s+AC\.?\s*SPECIAL", ln)
        if m and cols:
            prices = PRICE.findall(ln)
            if len(prices) == len(cols):
                for (fi, th), pr in zip(cols, prices):
                    add(f, f"D{m.group(1)} [{fi} {th}]", fam3 + m.group(1) + fi + th, pr)
            else:
                rec(f, ln, prices)
special("08", TXT["08"], "ASP")
special("09", TXT["09"], "AML")

# Șipcă (07): known row order per profile, zipped with (thickness, price) sequence
SEQ_STD = [("DPL","060"),("DPM","060"),("LUC","050"),("LUC","045"),("LUC","040"),("DPL","050"),("DPL","040"),("803","045"),("WOD","050"),("WOD","045"),("MAT","050"),("MAT","045"),("MAT","040"),("DPM","050"),("DPM","040"),("GDM","050"),("MGN","050"),("ZNC","050"),("ZNC","045"),("ZNC","040")]
SEQ_OSLO = [("DPL","060"),("DPM","060"),("LUC","060"),("LUC","050"),("LUC","045"),("LUC","040"),("DPL","050"),("DPL","040"),("803","045"),("WOD","050"),("WOD","045"),("MAT","060"),("MAT","050"),("MAT","045"),("MAT","040"),("DPM","050"),("DPM","040"),("GDM","050"),("MGN","050"),("ZNC","060"),("ZNC","050"),("ZNC","045"),("ZNC","040")]
def sipca(lines):
    cur = None; buf = defaultdict(list)
    for ln in lines:
        m = re.search(r"SIPCA\s+(HAGA|OSLO|BERNA|SOFIA)", ln.upper())
        if m and "Euro" not in ln: cur = m.group(1); continue
        if cur and PRICE.search(ln) and re.search(r"\d[.,]\d\d\s*mm", ln):
            buf[cur].append((thk(ln), PRICE.search(ln).group(1)))
    fam = {"HAGA": "SIHAG", "OSLO": "SIPCA", "BERNA": "SIBER", "SOFIA": "SISOF"}
    for prof, seq in buf.items():
        order = SEQ_OSLO if prof == "OSLO" else SEQ_STD
        if len(seq) != len(order):
            unm.append(("07", f"SIPCA {prof}: {len(seq)} randuri vs {len(order)} asteptate", 0)); continue
        for (fi, th), (t, pr) in zip(order, seq):
            if t != th: unm.append(("07", f"SIPCA {prof}: grosime {t} vs {th} la {fi}", 0))
            add("07", f"Sipca {prof} [{fi} {th}]", fam[prof] + fi + th, pr)
sipca(TXT["07"])

# ---------- results ----------
seen = {}
ok = diff = missing = 0
diffs = []; miss = []
for f, label, code, pr in entries:
    if code in seen: continue
    seen[code] = 1
    if code not in LP: missing += 1; miss.append((f, label, code, pr)); continue
    lp = LP[code]["price"]
    if lp is not None and abs(float(lp) - pr) < 0.005: ok += 1
    else: diff += 1; diffs.append((f, label, code, pr, lp))
print(f"Pozitii PDF verificate: {len(seen)} | identice: {ok} | diferite: {diff} | cod inexistent in ListaPret: {missing}")
print("\nDIFERENTE:")
for d in diffs: print("  ", d)
print("\nCOD INEXISTENT (PDF are, ListaPret nu):")
for m_ in miss: print("  ", m_)
print("\nRANDURI NEPROCESATE (necesita tratare manuala):")
for u in unm: print("  ", u)
# coverage per file
print("\nAcoperire pe fisier:", Counter(f for f, *_ in entries))
json.dump({"ok": ok, "diff": diffs, "missing": miss, "unmatched": unm, "entries": entries}, open("/home/claude/compare_result.json", "w"))
