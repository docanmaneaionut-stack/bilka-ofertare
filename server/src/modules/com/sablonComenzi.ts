import { normalizeazaTelefon } from "../ofe/clienti.js";
import { esc } from "../ofe/documente/sablon.js";

// Bucatile de sablon ale documentelor comenzii (S23; FISA-COMENZI cap. 4c, 9; machetele
// docs/design/macheta-aviz.html si macheta-fisa-soferului.html): CSS-ul in plus fata de
// sablonul ofertei (randuri stranse pe aviz, totalul in cuvinte, casetele de semnaturi,
// blocurile fisei soferului) - injectat in pagina, sablonul ofertei nu se atinge.

export const CSS_COMENZI = `
.aviz table.lines td { padding: .4mm 1.5mm; font-size: 9pt; line-height: 1.15; }
.aviz table.lines tr.cat td { padding: 1mm 1.5mm; font-size: 9pt; }
.aviz table.lines tr.pan td, .aviz table.lines tr.panh td { padding: .3mm 1.5mm .3mm 9mm; font-size: 8.3pt; line-height: 1.15; }
.aviz .parties { margin: 1mm 0 1.5mm; } .aviz .intern { margin: -.5mm 0 1.5mm; }
.aviz-tot { margin-top: 1.5mm; font-size: 9.5pt; }
.semn { display: flex; gap: 8mm; margin-top: 2.5mm; page-break-inside: avoid; }
.sbox { flex: 1; border: 1px solid #c9c9c9; border-radius: 1.5mm; padding: 2mm 3mm 2.5mm; font-size: 9.5pt; }
.slbl { font-size: 8pt; text-transform: uppercase; letter-spacing: .6px; color: #6a6a6a; margin-bottom: 1mm; font-weight: 700; }
.sline { margin-top: 2.6mm; color: #333; }
.page2 .head { margin-top: 0; }
.dl { border: 1px solid #c9c9c9; border-radius: 1.5mm; margin: 3mm 0 0; page-break-inside: avoid; }
.dlh { display: flex; align-items: baseline; gap: 3mm; background: #f4f4f4; padding: 2mm 3mm; border-bottom: 1px solid #c9c9c9; font-size: 11pt; }
.dlh .n { color: #8a8a8a; width: 5mm; } .dlh b { font-size: 12.5pt; } .dlh .nr { color: #555; font-size: 9.5pt; } .dlh .tel { margin-left: auto; }
.dlb { display: grid; grid-template-columns: 22mm 1fr; row-gap: 1.6mm; column-gap: 2mm; padding: 2.5mm 3mm 2.5mm; font-size: 10pt; line-height: 1.35; }
.dlb .k { color: #6a6a6a; font-size: 8pt; text-transform: uppercase; letter-spacing: .5px; padding-top: .6mm; }
.dlb .sub { color: #555; font-size: 9pt; } .dlb .big { font-size: 14pt; font-weight: 700; }
a.tel { color: #1c1c1c; text-decoration: none; font-weight: 700; white-space: nowrap; } a { color: #1c1c1c; }
.fisa .cb { width: 3.6mm; height: 3.6mm; }
`;

export const dataRoDinIso = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
export const dataDoar = (d: Date) => d.toISOString().slice(0, 10);
export const dataLocala = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
export const marcaFisier = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()).replace(/[: ]/g, "-");

// telefon apelabil din PDF (cap. 4c): legatura tel: cu cifrele normalizate + numarul scris ca text
export function telefonApelabil(telefon: string | null | undefined): string {
  if (!telefon || !telefon.trim()) return "";
  const cifre = normalizeazaTelefon(telefon);
  return `<a class="tel" href="tel:${esc(cifre || telefon.trim())}">📞 ${esc(telefon.trim())}</a>`;
}

// numarul de pagini al unui PDF (ca in ofe/documente)
export const paginiPdf = (pdf: Buffer) => (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length || null;
