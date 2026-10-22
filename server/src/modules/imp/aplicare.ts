import { randomUUID } from "node:crypto";
import type { Prisma, Utilizator } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { EroareImport } from "./analiza.js";
import type { Diferente, FisierStocat, Problema, ProdusImport, RandReferintaImport, Raport, TipReferinta } from "./tipuri.js";

const MARIME_LOT = 500;
const MODEL_REFERINTA: Record<TipReferinta, string> = {
  "variante-profil": "variantaProfil",
  "culori-finisaj-grosime": "culoareFinisajGrosime",
  "garantii-finisaj-grosime": "garantieFinisajGrosime",
  "liste-implicite-oferta": "listaImplicitaOferta",
  "trepte-desfasurata": "treaptaDesfasurata",
};

function loturi<T>(lista: T[], marime = MARIME_LOT): T[][] {
  const rezultat: T[][] = [];
  for (let i = 0; i < lista.length; i += marime) rezultat.push(lista.slice(i, i + marime));
  return rezultat;
}

type Tx = Prisma.TransactionClient;

function randJurnal(utilizator: Utilizator, entitate: string, entitateId: string, actiune: string, extra: Partial<{ camp: string; valoareInainte: string | null; valoareDupa: string | null }> = {}) {
  return { utilizatorId: utilizator.id, numeUtilizatorLaMoment: utilizator.nume, entitate, entitateId, actiune, ...extra };
}

function dateProdus(p: ProdusImport, ids: { compartimentId: string; grupId: string; familieId: string | null; categorieOfertaId: string }) {
  return {
    compartimentId: ids.compartimentId,
    grupId: ids.grupId,
    familieId: ids.familieId,
    codIntern: p.codIntern,
    codFurnizor: p.codFurnizor,
    varianta: p.varianta,
    finisaj: p.finisaj,
    grosime: p.grosime,
    optiune: p.optiune,
    denumire: p.denumire,
    um: p.um,
    moneda: p.moneda,
    categorieOfertaId: ids.categorieOfertaId,
    categorieBilka: p.categorieBilka,
    latimeTotalaM: p.latimeTotalaM,
    latimeTotalaMm: p.latimeTotalaMm,
    modulCm: p.modulCm,
    sistem: p.sistem,
    treapta: p.treapta,
    desfasurata: p.desfasurata,
    culoriDisponibile: p.culoriDisponibile,
    sursa: p.sursa,
    observatii: p.observatii,
    activ: p.activ,
  };
}

export async function confirmaImport(params: { propunereId: string; denumire: string; valabilaDeLa: Date; utilizator: Utilizator }) {
  const { propunereId, denumire, valabilaDeLa, utilizator } = params;
  const propunere = await prisma.importPropunere.findUnique({ where: { id: propunereId }, include: { compartiment: true } });
  if (!propunere) throw new EroareImport("Propunerea de import nu există", 404);
  if (propunere.status !== "PROPUSA") throw new EroareImport(`Propunerea nu mai e deschisă (status ${propunere.status})`, 409);
  const erori = propunere.erori as unknown as Problema[];
  if (erori.length > 0) throw new EroareImport(`Importul are ${erori.length} erori; se corectează CSV-urile și se reîncarcă`, 409);

  const diferente = propunere.diferente as unknown as Diferente;
  const raport = propunere.raport as unknown as Raport;
  const randuri = propunere.randuri as unknown as { produse: ProdusImport[]; referinte: { tip: TipReferinta; randuri: RandReferintaImport[] }[]; restaurat?: boolean };
  if (randuri.restaurat) throw new EroareImport("Propunerea provine dintr-o restaurare și nu mai are rândurile citite; reîncarcă fișierele și analizează din nou", 409);
  const compartimentId = propunere.compartimentId;
  const furnizor = propunere.compartiment.denumire;

  return prisma.$transaction(
    async (tx) => {
      const jurnal: ReturnType<typeof randJurnal>[] = [];
      let listaPretId: string | null = null;

      if (propunere.areProduse) {
        // 1. grupuri si familii (existente + noi)
        const grupuri = new Map((await tx.grup.findMany({ where: { compartimentId } })).map((g) => [g.denumire, g]));
        for (const denumireGrup of diferente.grupuriNoi) {
          if (grupuri.has(denumireGrup)) continue;
          const g = await tx.grup.create({ data: { compartimentId, denumire: denumireGrup, ordine: grupuri.size + 1 } });
          grupuri.set(denumireGrup, g);
          jurnal.push(randJurnal(utilizator, "Grup", g.id, "import_creare", { valoareDupa: denumireGrup }));
        }
        const familii = new Map(
          (await tx.familie.findMany({ where: { grup: { compartimentId } }, include: { grup: true } })).map((f) => [`${f.grup.denumire}|${f.denumire}`, f]),
        );
        for (const { grup, familie } of diferente.familiiNoi) {
          const k = `${grup}|${familie}`;
          if (familii.has(k)) continue;
          const g = grupuri.get(grup);
          if (!g) throw new EroareImport(`Grupul „${grup}” lipsește pentru familia „${familie}”`);
          const f = await tx.familie.create({ data: { grupId: g.id, denumire: familie, ordine: 0 } });
          familii.set(k, { ...f, grup: g });
          jurnal.push(randJurnal(utilizator, "Familie", f.id, "import_creare", { valoareDupa: `${grup} / ${familie}` }));
        }
        const rubrici = new Map((await tx.categorieOferta.findMany()).map((c) => [c.denumire, c.id]));
        const idsPentru = (p: ProdusImport) => {
          const g = grupuri.get(p.grup);
          const categorieOfertaId = rubrici.get(p.categorieOferta);
          if (!g || !categorieOfertaId) throw new EroareImport(`Grup sau rubrică lipsă la „${p.denumire}”`);
          const fam = p.familie ? familii.get(`${p.grup}|${p.familie}`) : null;
          return { compartimentId, grupId: g.id, familieId: fam?.id ?? null, categorieOfertaId };
        };

        const dupaCodIntern = new Map(randuri.produse.map((p) => [p.codIntern, p]));
        const produsIdDupaCodIntern = new Map<string, string>();

        // 2. produse noi, in loturi
        const noi = diferente.produse.noi.map((n) => dupaCodIntern.get(n.codIntern)!).filter(Boolean);
        const noiCuId = noi.map((p) => ({ id: randomUUID(), ...dateProdus(p, idsPentru(p)) }));
        for (const lot of loturi(noiCuId)) await tx.produs.createMany({ data: lot });
        for (const p of noiCuId) {
          produsIdDupaCodIntern.set(p.codIntern, p.id);
          jurnal.push(randJurnal(utilizator, "Produs", p.id, "import_creare", { valoareDupa: p.denumire }));
        }

        // 3. redenumiri: acelasi produs, denumire si cod intern noi, istoricul ramane
        for (const r of diferente.produse.redenumiri) {
          const nou = dupaCodIntern.get(r.codInternNou)!;
          await tx.produs.update({ where: { id: r.produsId }, data: { ...dateProdus(nou, idsPentru(nou)) } });
          produsIdDupaCodIntern.set(r.codInternNou, r.produsId);
          jurnal.push(randJurnal(utilizator, "Produs", r.produsId, "import_redenumire", { camp: "denumire", valoareInainte: r.denumireVeche, valoareDupa: r.denumireNoua }));
          jurnal.push(randJurnal(utilizator, "Produs", r.produsId, "import_redenumire", { camp: "codIntern", valoareInainte: r.codInternVechi, valoareDupa: r.codInternNou }));
          for (const c of r.campuri) jurnal.push(randJurnal(utilizator, "Produs", r.produsId, "import_modificare", { camp: c.camp, valoareInainte: c.inainte, valoareDupa: c.dupa }));
        }

        // 4. modificate (campuri) si reaparute
        const reaparuteIds = new Set(diferente.produse.reaparute.map((r) => r.produsId));
        for (const m of diferente.produse.modificate) {
          const nou = dupaCodIntern.get(m.codIntern)!;
          await tx.produs.update({ where: { id: m.produsId }, data: dateProdus(nou, idsPentru(nou)) });
          for (const c of m.campuri) jurnal.push(randJurnal(utilizator, "Produs", m.produsId, "import_modificare", { camp: c.camp, valoareInainte: c.inainte, valoareDupa: c.dupa }));
        }
        for (const r of diferente.produse.reaparute) {
          const nou = dupaCodIntern.get(r.codIntern)!;
          await tx.produs.update({ where: { id: r.produsId }, data: dateProdus(nou, idsPentru(nou)) });
          jurnal.push(randJurnal(utilizator, "Produs", r.produsId, "import_reaparut", { camp: "activ", valoareInainte: "false", valoareDupa: "true" }));
        }
        void reaparuteIds;

        // 5. disparute -> inactive (nu se sterge nimic)
        for (const d of diferente.produse.disparute) {
          await tx.produs.update({ where: { id: d.produsId }, data: { activ: false } });
          jurnal.push(randJurnal(utilizator, "Produs", d.produsId, "import_disparut", { camp: "activ", valoareInainte: "true", valoareDupa: "false" }));
        }

        // 6. versiunea de preturi (schita) cu toate randurile
        const existente = await tx.produs.findMany({ where: { compartimentId }, select: { id: true, codIntern: true } });
        for (const e of existente) if (!produsIdDupaCodIntern.has(e.codIntern)) produsIdDupaCodIntern.set(e.codIntern, e.id);
        const fisiere = propunere.fisiere as unknown as FisierStocat[];
        const lista = await tx.listaPret.create({
          data: {
            compartimentId,
            denumire,
            valabilaDeLa,
            sursa: fisiere.map((f) => f.nume).join(", "),
            status: "SCHITA",
            creataDeId: utilizator.id,
            fisiere: fisiere as unknown as Prisma.InputJsonValue,
            raport: raport as unknown as Prisma.InputJsonValue,
          },
        });
        listaPretId = lista.id;
        const preturi = randuri.produse.map((p) => {
          const produsId = produsIdDupaCodIntern.get(p.codIntern);
          if (!produsId) throw new EroareImport(`Produs fără id la preț: ${p.codIntern}`);
          return { listaPretId: lista.id, produsId, pret: p.pret };
        });
        for (const lot of loturi(preturi)) await tx.pretListaProdus.createMany({ data: lot });
        jurnal.push(randJurnal(utilizator, "ListaPret", lista.id, "import_confirmare", { valoareDupa: `${denumire}: ${preturi.length} prețuri, ${noiCuId.length} produse noi` }));
      }

      // 7. tabelele de referinta
      for (const { tip, randuri: randuriRef } of randuri.referinte) {
        const dif = diferente.referinte[tip];
        if (!dif) continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const model = (tx as any)[MODEL_REFERINTA[tip]];
        const dupaCheie = new Map(randuriRef.map((r) => [r.cheie, r]));
        for (const a of dif.aparute) {
          const rand = await model.create({ data: { furnizor, activ: true, ...a.valori } });
          jurnal.push(randJurnal(utilizator, tip, rand.id, "import_creare", { valoareDupa: a.cheie }));
        }
        for (const m of dif.modificate) {
          const r = dupaCheie.get(m.cheie)!;
          await model.update({ where: { id: m.id }, data: { ...r.valori } });
          for (const c of m.campuri) jurnal.push(randJurnal(utilizator, tip, m.id, "import_modificare", { camp: c.camp, valoareInainte: c.inainte, valoareDupa: c.dupa }));
        }
        for (const r of dif.reaparute) {
          await model.update({ where: { id: r.id }, data: { activ: true } });
          jurnal.push(randJurnal(utilizator, tip, r.id, "import_reaparut", { camp: "activ", valoareInainte: "false", valoareDupa: "true" }));
        }
        for (const d of dif.disparute) {
          await model.update({ where: { id: d.id }, data: { activ: false } });
          jurnal.push(randJurnal(utilizator, tip, d.id, "import_disparut", { camp: "activ", valoareInainte: "true", valoareDupa: "false" }));
        }
      }

      for (const lot of loturi(jurnal)) await tx.jurnalIntrare.createMany({ data: lot });

      return tx.importPropunere.update({
        where: { id: propunere.id },
        data: { status: "CONFIRMATA", confirmataLa: new Date(), listaPretId },
      });
    },
    { timeout: 180_000, maxWait: 15_000 },
  );
}
