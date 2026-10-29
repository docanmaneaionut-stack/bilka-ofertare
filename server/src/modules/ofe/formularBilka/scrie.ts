import { coloanaDinLitere, desfaAdresa } from "./sablon.js";

// Scrierea valorilor in XML-ul unei foi (S16b, FORMULAR-BILKA-HARTA §7): doar
// valorile celulelor de intrare - numere in <v>, texte ca inlineStr - cu stilul
// celulei pastrat; null goleste celula. O celula cu formula nu se scrie niciodata
// (ar fi o greseala a hartii, nu a datelor).

export type ValoareCelula = number | string | null;

export class EroareScriere extends Error {}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function celulaNoua(adresa: string, atribute: string, valoare: ValoareCelula): string {
  const attrs = atribute.replace(/\s+t="[^"]*"/g, "").replace(/\s+$/, "");
  if (valoare === null) return `<c r="${adresa}"${attrs}/>`;
  if (typeof valoare === "number") {
    if (!Number.isFinite(valoare)) throw new EroareScriere(`Valoare numerică invalidă pentru ${adresa}`);
    return `<c r="${adresa}"${attrs}><v>${valoare}</v></c>`;
  }
  return `<c r="${adresa}"${attrs} t="inlineStr"><is><t xml:space="preserve">${escape(valoare)}</t></is></c>`;
}

export function scrieCelule(xml: string, celule: Map<string, ValoareCelula>): string {
  let out = xml;
  for (const [adresa, valoare] of celule) {
    const re = new RegExp(`<c r="${adresa}"([^>]*?)(?:/>|>([\\s\\S]*?)</c>)`);
    const m = re.exec(out);
    if (m) {
      if (m[2] !== undefined && /<f[\s>/]/.test(m[2])) throw new EroareScriere(`Celula ${adresa} are formulă; harta nu trebuie să scrie peste ea`);
      out = out.slice(0, m.index) + celulaNoua(adresa, m[1], valoare) + out.slice(m.index + m[0].length);
      continue;
    }
    if (valoare === null) continue;
    // celula lipseste din rand: o inseram in ordinea coloanelor (sau cream randul)
    const { col, rand } = desfaAdresa(adresa);
    const nouaCelula = celulaNoua(adresa, "", valoare);
    const reRand = new RegExp(`<row r="${rand}"([^>]*?)(?:/>|>([\\s\\S]*?)</row>)`);
    const r = reRand.exec(out);
    if (r) {
      const continut = r[2] ?? "";
      let pozitie = continut.length;
      for (const c of continut.matchAll(/<c r="([A-Z]+)\d+"/g)) {
        if (coloanaDinLitere(c[1]) > coloanaDinLitere(col)) {
          pozitie = c.index!;
          break;
        }
      }
      const randNou = `<row r="${rand}"${r[1].replace(/\s*\/$/, "")}>${continut.slice(0, pozitie)}${nouaCelula}${continut.slice(pozitie)}</row>`;
      out = out.slice(0, r.index) + randNou + out.slice(r.index + r[0].length);
      continue;
    }
    // randul lipseste: inainte de primul rand cu numar mai mare, altfel la sfarsitul sheetData
    let inserat = false;
    for (const rr of out.matchAll(/<row r="(\d+)"/g)) {
      if (Number(rr[1]) > rand) {
        out = out.slice(0, rr.index) + `<row r="${rand}">${nouaCelula}</row>` + out.slice(rr.index);
        inserat = true;
        break;
      }
    }
    if (!inserat) {
      const i = out.indexOf("</sheetData>");
      if (i < 0) throw new EroareScriere("Foaia nu are sheetData");
      out = out.slice(0, i) + `<row r="${rand}">${nouaCelula}</row>` + out.slice(i);
    }
  }
  return out;
}

// Excel recalculeaza toate formulele la deschidere (valorile salvate in sablon sunt vechi)
export function activeazaRecalcul(workbookXml: string): string {
  if (/<calcPr\b[^>]*fullCalcOnLoad="1"/.test(workbookXml)) return workbookXml;
  if (/<calcPr\b/.test(workbookXml)) return workbookXml.replace(/<calcPr\b([^>]*?)(\/?)>/, (_, a: string, slash: string) => `<calcPr${a.replace(/\s*fullCalcOnLoad="[^"]*"/, "")} fullCalcOnLoad="1"${slash}>`);
  return workbookXml.replace("</workbook>", '<calcPr fullCalcOnLoad="1"/></workbook>');
}
