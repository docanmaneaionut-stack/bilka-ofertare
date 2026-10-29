import fs from "node:fs";
import puppeteer, { type Browser } from "puppeteer";

// Motorul de PDF (FISA-OFERTARE 13.8): acelasi Chrome pe orice aparat - cel adus
// de puppeteer (npx puppeteer browsers install chrome); cand lipseste (instalare
// fara internet), rezerva e Edge-ul din Windows. Fonturile vin din proiect
// (server/fonturi, incorporate in sablon), deci randarea nu depinde de sistem.
// Un singur browser pe proces, deschis la prima cerere.

const CAI_EDGE = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"];

export async function caleBrowser(): Promise<{ cale: string | undefined; sursa: string }> {
  try {
    const implicita = await puppeteer.executablePath();
    if (implicita && fs.existsSync(implicita)) return { cale: implicita, sursa: "chrome (puppeteer)" };
  } catch {
    // fara Chrome descarcat
  }
  const edge = CAI_EDGE.find((c) => fs.existsSync(c));
  if (edge) return { cale: edge, sursa: "edge (rezerva Windows)" };
  return { cale: undefined, sursa: "niciunul" };
}

let browser: Browser | null = null;
let pornire: Promise<Browser> | null = null;

async function browserul(): Promise<Browser> {
  if (browser && browser.connected) return browser;
  if (pornire) return pornire;
  const { cale, sursa } = await caleBrowser();
  if (!cale) throw new Error("Nu există niciun browser pentru PDF: rulează `npx puppeteer browsers install chrome` în server/ (sau instalează Microsoft Edge)");
  pornire = puppeteer
    .launch({ executablePath: cale, headless: true, args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"] })
    .then((b) => {
      browser = b;
      pornire = null;
      console.log(`PDF: browser pornit (${sursa})`);
      b.on("disconnected", () => {
        browser = null;
      });
      return b;
    })
    .catch((e) => {
      pornire = null;
      throw e;
    });
  return pornire;
}

export interface OptiuniPdf {
  // subsolul paginii: firma · documentul · numarul · clientul (stanga); "Pagina x din y" il pune motorul
  subsolStanga: string;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// A4 portret, fundaluri tiparite, marginile din @page, subsol pe fiecare pagina (13.1)
export async function randeazaPdf(html: string, optiuni: OptiuniPdf): Promise<Buffer> {
  const b = await browserul();
  const page = await b.newPage();
  try {
    await page.setContent(html, { waitUntil: "load", timeout: 60_000 });
    await page.emulateMediaType("print");
    const footer = `<div style="width:100%;font-family:Arimo,Arial,Helvetica,sans-serif;font-size:8px;color:#8a8a8a;padding:0 53px;display:flex;justify-content:space-between;border-top:1px solid #d5d5d5;padding-top:4px;"><span>${escapeHtml(optiuni.subsolStanga)}</span><span>Pagina <span class="pageNumber"></span> din <span class="totalPages"></span></span></div>`;
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: "<span></span>", footerTemplate: footer, timeout: 60_000 });
    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => undefined);
  }
}

export async function inchideBrowserPdf(): Promise<void> {
  const b = browser;
  browser = null;
  if (b) await b.close().catch(() => undefined);
}
