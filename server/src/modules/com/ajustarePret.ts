import { Prisma, type Utilizator } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { calculeazaOferta } from "../mot/calcul.js";
import type { IntrareOferta, RezultatOferta } from "../mot/tipuri.js";
import { factorTva, la2, z as zec } from "../mot/zecimal.js";
import { ro } from "../ofe/documente/sablon.js";
import { includeProduse, intrareMot } from "../ofe/intrareMot.js";
import { comandaVizibila, EroareComanda, rezumatIncasari, scrieIstoricComanda, spreRand } from "./comenzi.js";
import { ajustarePublica, selectAjustare } from "./pretAjustat.js";
import { poateScrieBani } from "./vizibilitate.js";

// S26b - MODIFICAREA M5 (docs/MODIFICARI-S26.md; FISA-COMENZI cap. 1, 7; FISA-CONTURI §3): ajustarea
// pretului de vanzare dupa "Comandat". Doar Administratorul firmei comenzii, cu suma noua (totalul cu
// TVA, in lei) si motiv obligatoriu, cat comanda nu e incasata integral. Motorul ruleaza NESCHIMBAT pe
// intrarea inghetata a ofertei comandate, cu tinta = suma noua ("suma cu TVA in lei"): aceleasi
// produse, cantitati, preturi de baza, cursuri, cont, mod de prezentare, preturi fixe. Garda "nu sub
// achizitie" ramane (exceptia completarilor e a motorului). Rezultatul se salveaza ca versiune noua pe
// comanda; rezultatul de la "Comandat" ramane pe oferta. Comenzile manuale au mecanismul lor de sume.

export const ajustareRouter = Router({ mergeParams: true });

const schemaAjustare = z.object({
  totalLei: z
    .string()
    .trim()
    .regex(/^\d+([.,]\d{1,2})?$/, "sumă în lei, cu cel mult două zecimale")
    .transform((s) => s.replace(",", ".")),
  motiv: z.string().trim().min(1, "motivul e obligatoriu — ca să nu se uite de ce").max(1000),
});

// numarul maxim de rulari ale motorului la cautarea sumei minime / a celei mai apropiate sume
const PASI_CAUTARE = 40;
const PASI_APROPIERE = 5;

const cuTinta = (intrare: IntrareOferta, totalLei: string): IntrareOferta => ({ ...intrare, tinta: { tip: "total_cu_tva_lei", valoare: totalLei } });
const gardaTrece = (r: RezultatOferta) => !r.garda.aplicata || r.garda.respectata;
const dinBani = (bani: number) => (bani / 100).toFixed(2);
const inBani = (suma: string) => Math.round(Number(suma) * 100);

// partea de bani a unui rezultat, camp cu camp (rezultatul salvat vine din JSONB: ordinea cheilor nu se
// pastreaza, iar rezultatele vechi pot sa nu aiba campuri adaugate ulterior)
function baniiRezultatului(r: RezultatOferta): string {
  const t = r.totaluri;
  return JSON.stringify([
    [t.documentTotalLei, t.documentCuTvaEur, t.documentFaraTvaEur, t.achizitieContLeiCuTva, t.achizitieRealaLeiCuTva],
    [r.vanzari.pretVanzareLei, r.vanzari.costAchizitieLei, r.vanzari.adaosNetLei, r.vanzari.adaosBrutLei, r.vanzari.tabel],
    r.linii.map((l) => [l.id, l.cantitate, l.achizitieContEur, l.achizitieRealaEur, l.pretDocumentEur, l.valoareEur]),
  ]);
}

// Intrarea INGHETATA a ofertei comandate: cea salvata la "Comandat" (de la S26b); la comenzile dinainte
// se reconstruieste din oferta (produsele, cantitatile, preturile de baza si cursurile sunt inghetate in
// baza; adaosul contului se citeste din cont) si se accepta doar daca reproduce la ban rezultatul salvat.
async function intrareInghetata(ofertaId: string): Promise<IntrareOferta> {
  const o = await prisma.oferta.findUniqueOrThrow({ where: { id: ofertaId }, include: includeProduse });
  if (o.intrareMotor) return o.intrareMotor as unknown as IntrareOferta;
  const salvat = o.rezultatMotor as unknown as RezultatOferta | null;
  if (!salvat) throw new EroareComanda("Comanda n-are rezultatul salvat la „Comandat”", 409);
  let intrare: IntrareOferta;
  let refacut: RezultatOferta;
  try {
    intrare = await intrareMot(o);
    refacut = JSON.parse(JSON.stringify(calculeazaOferta(intrare))) as RezultatOferta;
  } catch (e) {
    throw new EroareComanda(`Oferta comenzii nu se mai poate calcula: ${e instanceof Error ? e.message : String(e)}`, 409);
  }
  if (baniiRezultatului(refacut) !== baniiRezultatului(salvat)) {
    throw new EroareComanda("Prețul nu se poate ajusta: adaosul contului s-a schimbat de la comandă; ajustarea nu se poate face pe alt cost.", 409);
  }
  return intrare;
}

// Suma minima care respecta garda. Garda nu e perfect monotona (rotunjirile de prezentare), asa ca:
// intai pragul teoretic - fiecare linie la achizitia reala adusa la cursul documentului (liniile cu pret
// fix raman cum sunt); daca el nu trece, cautare binara MARGINITA (numar fix de pasi) intre el si pretul
// curent. Suma intoarsa a fost rulata prin motor: trece garda si iese exact.
function sumaMinima(intrare: IntrareOferta, calculat: RezultatOferta, cerutaBani: number, curentBani: number): string | null {
  const potrivita = (bani: number) => {
    const r = calculeazaOferta(cuTinta(intrare, dinBani(bani)));
    return gardaTrece(r) && r.totaluri.documentTotalLei === dinBani(bani);
  };
  const faraTva = calculat.linii.reduce((s, l) => s.plus(zec(l.pretFix ? l.valoareEur : la2(zec(l.achizitieRealaDocEur).times(zec(l.cantitate))))), zec(0));
  const pragBani = inBani(la2(zec(la2(faraTva.times(factorTva(intrare.tvaPct)))).times(zec(intrare.cursBnr))));
  for (const candidat of [pragBani, pragBani + 1]) {
    if (candidat > cerutaBani && candidat <= curentBani && potrivita(candidat)) return dinBani(candidat);
  }
  let jos = Math.max(cerutaBani, Math.min(pragBani, curentBani - 1));
  let sus = curentBani;
  if (!potrivita(sus)) return null;
  for (let pas = 0; pas < PASI_CAUTARE && sus - jos > 1; pas++) {
    const mijloc = Math.floor((jos + sus) / 2);
    if (potrivita(mijloc)) sus = mijloc;
    else jos = mijloc;
  }
  return dinBani(sus);
}

// cand suma ceruta nu iese la ban (preturi fixe, rotunjiri): suma pe care motorul o atinge exact, cautata
// in cel mult PASI_APROPIERE rulari pornind de la "cat iese"
function sumaApropiata(intrare: IntrareOferta, catIese: string): string | null {
  let s = catIese;
  for (let pas = 0; pas < PASI_APROPIERE; pas++) {
    const r = calculeazaOferta(cuTinta(intrare, s));
    if (r.totaluri.documentTotalLei === s) return gardaTrece(r) ? s : null;
    s = r.totaluri.documentTotalLei;
  }
  return null;
}

// refuzul cu o suma propusa (suma minima / cea mai apropiata suma); clasa de sine statatoare - modulul
// se incarca in cerc cu comenzi.ts, deci nu poate mosteni EroareComanda la incarcare
export class EroareAjustare extends Error {
  readonly status = 409;
  constructor(
    message: string,
    public extra: Record<string, string>,
  ) {
    super(message);
  }
}

export async function ajusteazaPretul(comandaId: string, date: z.infer<typeof schemaAjustare>, u: Utilizator) {
  const c = await comandaVizibila(u, comandaId);
  if (!c) throw new EroareComanda("Comanda nu există sau nu e vizibilă", 404);
  if (!poateScrieBani(u, c)) throw new EroareComanda("Prețul de vânzare al unei comenzi îl ajustează doar Administratorul firmei comenzii", 403);
  if (c.tip !== "DIN_OFERTA" || !c.ofertaId) throw new EroareComanda("Comanda manuală n-are ofertă: sumele ei se corectează din tabelul de vânzări (cost și vânzare)", 409);
  const incasari = rezumatIncasari(c);
  if (Number(incasari.restLei) <= 0) throw new EroareComanda("Comanda e încasată integral — prețul nu se mai poate ajusta.", 409);
  const noua = la2(date.totalLei);
  if (Number(noua) <= 0) throw new EroareComanda("Suma nouă trebuie să fie mai mare ca zero", 400);
  if (noua === c.totalLei.toFixed(2)) throw new EroareComanda(`Comanda are deja prețul de ${ro(noua)} lei`, 409);
  if (Number(noua) < Number(incasari.incasatLei)) throw new EroareComanda(`Suma nouă (${ro(noua)} lei) e sub ce s-a încasat deja: ${ro(incasari.incasatLei)} lei.`, 409);

  const intrare = await intrareInghetata(c.ofertaId);
  let rezultat: RezultatOferta;
  try {
    rezultat = calculeazaOferta(cuTinta(intrare, noua));
  } catch (e) {
    throw new EroareComanda(`Prețul nu se poate calcula: ${e instanceof Error ? e.message : String(e)}`, 409);
  }
  if (!gardaTrece(rezultat)) {
    // achizitiile si cantitatile liniilor nu depind de tinta: pragul teoretic se ia din rezultatul de mai sus
    const minima = sumaMinima(intrare, rezultat, inBani(noua), inBani(c.totalLei.toFixed(2)));
    throw new EroareAjustare(
      `Sub achiziție: la ${ro(noua)} lei, ${rezultat.garda.liniiSubAchizitie.length} ${rezultat.garda.liniiSubAchizitie.length === 1 ? "linie ar ajunge" : "linii ar ajunge"} sub achiziția reală a contului.${minima ? ` Suma minimă posibilă: ${ro(minima)} lei.` : ""}`,
      minima ? { sumaMinimaLei: minima } : {},
    );
  }
  if (rezultat.totaluri.documentTotalLei !== noua) {
    const apropiata = sumaApropiata(intrare, rezultat.totaluri.documentTotalLei);
    if (apropiata && apropiata !== c.totalLei.toFixed(2)) {
      throw new EroareAjustare(`Suma de ${ro(noua)} lei nu se poate atinge la ban cu prețurile comenzii (prețuri fixe, rotunjiri). Cea mai apropiată sumă posibilă: ${ro(apropiata)} lei.`, { sumaApropiataLei: apropiata });
    }
    throw new EroareComanda(`Suma de ${ro(noua)} lei nu se poate atinge la ban: prețurile comenzii sunt fixe și nu se pot muta prin țintă.`, 409);
  }

  const totalNou = new Prisma.Decimal(noua);
  const totalNouEur = new Prisma.Decimal(rezultat.totaluri.documentCuTvaEur);
  return prisma.$transaction(async (tx) => {
    const ultima = await tx.comandaAjustarePret.findFirst({ where: { comandaId: c.id }, orderBy: { versiune: "desc" }, select: { versiune: true } });
    const ajustare = await tx.comandaAjustarePret.create({
      data: {
        comandaId: c.id,
        versiune: (ultima?.versiune ?? 0) + 1,
        totalVechiLei: c.totalLei,
        totalNouLei: totalNou,
        totalVechiCuTvaEur: c.totalCuTvaEur,
        totalNouCuTvaEur: totalNouEur,
        motiv: date.motiv,
        rezultatMotor: rezultat as unknown as Prisma.InputJsonValue,
        utilizatorId: u.id,
        numeUtilizatorLaMoment: u.nume,
      },
      select: selectAjustare,
    });
    // totalul si restul comenzii (restul = totalul nou minus incasarile confirmate)
    await tx.comanda.update({ where: { id: c.id }, data: { totalLei: totalNou, totalCuTvaEur: totalNouEur, restLei: totalNou.minus(incasari.incasatLei) } });
    await scrieIstoricComanda(tx, c.id, u, [{ tip: "pret", camp: "totalLei", inainte: c.totalLei.toFixed(2), dupa: totalNou.toFixed(2), mentiuni: date.motiv }]);
    return ajustare;
  });
}

ajustareRouter.post("/", async (req, res) => {
  const u = req.utilizator!;
  const date = schemaAjustare.parse(req.body);
  const id = String((req.params as { id?: string }).id ?? "");
  try {
    const ajustare = await ajusteazaPretul(id, date, u);
    res.json({ ajustare: ajustarePublica(ajustare), comanda: spreRand((await comandaVizibila(u, id))!) });
  } catch (e) {
    if (e instanceof EroareAjustare) {
      res.status(e.status).json({ eroare: e.message, ...e.extra });
      return;
    }
    if (e instanceof EroareComanda) {
      res.status(e.status).json({ eroare: e.message });
      return;
    }
    throw e;
  }
});
