import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Sablonul documentelor (FISA-OFERTARE cap. 13; machetele din docs/design,
// CSS-ul din macheta-generator.py e referinta grafica). Fonturile vin din proiect
// (server/fonturi, Arimo - OFL, metric compatibil cu Arial), incorporate in
// pagina, ca diacriticele si asezarea sa fie identice pe orice aparat.

const FOLDER_FONTURI = fileURLToPath(new URL("../../../../fonturi/", import.meta.url));

let cssFonturi: string | null = null;
function fonturi(): string {
  if (cssFonturi !== null) return cssFonturi;
  const font = (fisier: string, greutate: number, interval: string) => {
    const cale = path.join(FOLDER_FONTURI, fisier);
    if (!fs.existsSync(cale)) return "";
    const b64 = fs.readFileSync(cale).toString("base64");
    return `@font-face { font-family: "Arimo"; font-style: normal; font-weight: ${greutate}; font-display: block; src: url(data:font/woff2;base64,${b64}) format("woff2"); unicode-range: ${interval}; }`;
  };
  const latin = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
  const latinExt = "U+0100-02AF, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF";
  cssFonturi = [font("arimo-latin-400-normal.woff2", 400, latin), font("arimo-latin-700-normal.woff2", 700, latin), font("arimo-latin-ext-400-normal.woff2", 400, latinExt), font("arimo-latin-ext-700-normal.woff2", 700, latinExt)].join("\n");
  return cssFonturi;
}

// CSS-ul machetelor (docs/design/macheta-generator.py), cu fontul proiectului
export const CSS = `
@page { size: A4 portrait; margin: 11mm 14mm 15mm 14mm; }
* { box-sizing: border-box; }
body { font-family: "Arimo", Arial, Helvetica, "Liberation Sans", sans-serif; color: #1c1c1c; font-size: 10pt; line-height: 1.2; margin: 0; background: #fff; }
.sheet { width: auto; margin: 0; padding: 0; background: #fff; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; } tr.cat { page-break-after: avoid; }
.bottom { page-break-inside: avoid; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10mm; margin-top: -1mm; }
.firm { font-size: 8.5pt; line-height: 1.3; } .firm b { font-size: 11.5pt; letter-spacing: .2px; }
.logos { display: flex; flex-direction: column; align-items: flex-end; gap: 2mm; }
.logo-img { height: 11mm; width: auto; display: block; }
.suppliers { display: flex; gap: 2mm; } .suppliers img { height: 7mm; width: auto; display: block; }
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
th.q { width: 18mm; } th.p { width: 22mm; } th.v { width: 24mm; } th.d { width: 16mm; }
.bottom { display: flex; justify-content: space-between; align-items: flex-start; gap: 8mm; margin-top: 2.5mm; } .totals { width: 78mm; flex: none; font-size: 10pt; }
.totals div { display: flex; justify-content: space-between; padding: 1mm 0; border-bottom: 1px solid #e6e6e6; }
.totals .big { font-size: 12.5pt; font-weight: 700; border-bottom: 2px solid #1c1c1c; border-top: 1px solid #1c1c1c; padding: 1.8mm 0; }
.totals .lei { font-size: 12pt; font-weight: 700; border-bottom: none; }
.supl { margin-top: 4mm; flex: 1; } .page2 { page-break-before: always; } .page2 .title { margin-top: 0; }
.supl table { width: 100%; border-collapse: collapse; font-size: 9.5pt; } .supl td { padding: 1.1mm 1.5mm; border-bottom: 1px solid #e6e6e6; }
.supl .note { font-size: 8.5pt; color: #555; margin-top: .8mm; }
.foot { margin-top: 1mm; font-size: 8pt; color: #333; line-height: 1.4; flex: 1; }
.foot b { color: #1c1c1c; } .foot p { margin: 0 0 1.2mm; }
.intro { font-size: 10pt; margin: 2.5mm 0 3mm; }
.block { margin-bottom: 2.5mm; page-break-inside: avoid; }
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
.precizari { font-size: 8.5pt; color: #333; margin-top: 2mm; }
`;

export const esc = (s: string | null | undefined): string => (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// numerele romanesti: separator de mii ".", zecimale ","
export function ro(valoare: string | number, zecimale = 2): string {
  const n = typeof valoare === "number" ? valoare : Number(valoare);
  if (!Number.isFinite(n)) return String(valoare);
  const [intreg, fractie] = Math.abs(n).toFixed(zecimale).split(".");
  const cuMii = intreg.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${n < 0 ? "-" : ""}${cuMii}${fractie ? `,${fractie}` : ""}`;
}

// "30 de ani", "15 ani", "5 ani"
export function ani(n: number): string {
  return n >= 20 ? `${n} de ani` : `${n} ani`;
}

export function pagina(titlu: string, corp: string): string {
  return `<!DOCTYPE html><html lang="ro"><head><meta charset="utf-8"><title>${esc(titlu)}</title><style>${fonturi()}\n${CSS}</style></head><body>${corp}</body></html>`;
}

export function imagineDataUri(cale: string): string | null {
  if (!fs.existsSync(cale)) return null;
  const ext = path.extname(cale).toLowerCase();
  const tip = ext === ".png" ? "image/png" : ext === ".svg" ? "image/svg+xml" : "image/jpeg";
  return `data:${tip};base64,${fs.readFileSync(cale).toString("base64")}`;
}
