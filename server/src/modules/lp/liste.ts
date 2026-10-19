import type { Utilizator } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { EroareImport } from "../imp/analiza.js";

// istoric liniar: o lista arhivata nu redevine niciodata activa; revenirea la
// o lista veche = reimportul fisierelor ei ca versiune noua (ARH §13)
export async function activeazaLista(listaId: string, utilizator: Utilizator) {
  return prisma.$transaction(async (tx) => {
    const lista = await tx.listaPret.findUnique({ where: { id: listaId } });
    if (!lista) throw new EroareImport("Lista de preț nu există", 404);
    if (lista.status !== "SCHITA") throw new EroareImport(`Se poate activa doar o schiță (status: ${lista.status})`, 409);

    const acum = new Date();
    const activa = await tx.listaPret.findFirst({ where: { compartimentId: lista.compartimentId, status: "ACTIVA" } });
    if (activa) {
      await tx.listaPret.update({ where: { id: activa.id }, data: { status: "ARHIVATA", arhivataLa: acum } });
      await tx.jurnalIntrare.create({
        data: { utilizatorId: utilizator.id, numeUtilizatorLaMoment: utilizator.nume, entitate: "ListaPret", entitateId: activa.id, actiune: "arhivare", camp: "status", valoareInainte: "ACTIVA", valoareDupa: "ARHIVATA" },
      });
    }
    const noua = await tx.listaPret.update({ where: { id: lista.id }, data: { status: "ACTIVA", activataLa: acum } });
    await tx.jurnalIntrare.create({
      data: { utilizatorId: utilizator.id, numeUtilizatorLaMoment: utilizator.nume, entitate: "ListaPret", entitateId: lista.id, actiune: "activare", camp: "status", valoareInainte: "SCHITA", valoareDupa: "ACTIVA" },
    });
    return { noua, arhivata: activa };
  });
}

export async function anuleazaLista(listaId: string, utilizator: Utilizator) {
  const lista = await prisma.listaPret.findUnique({ where: { id: listaId } });
  if (!lista) throw new EroareImport("Lista de preț nu există", 404);
  if (lista.status !== "SCHITA") throw new EroareImport(`Se poate anula doar o schiță (status: ${lista.status})`, 409);
  const anulata = await prisma.listaPret.update({ where: { id: listaId }, data: { status: "ANULATA", anulataLa: new Date() } });
  await prisma.jurnalIntrare.create({
    data: { utilizatorId: utilizator.id, numeUtilizatorLaMoment: utilizator.nume, entitate: "ListaPret", entitateId: listaId, actiune: "anulare", camp: "status", valoareInainte: "SCHITA", valoareDupa: "ANULATA" },
  });
  return anulata;
}

// pretul de baza introdus manual (Stoc; corectii in lista activa): intra in
// lista ACTIVA a compartimentului; daca nu exista, se creeaza una "Preturi manuale"
export async function seteazaPretManual(produsId: string, pret: number, utilizator: Utilizator) {
  return prisma.$transaction(async (tx) => {
    const produs = await tx.produs.findUnique({ where: { id: produsId }, include: { compartiment: true } });
    if (!produs) throw new EroareImport("Produsul nu există", 404);

    let lista = await tx.listaPret.findFirst({ where: { compartimentId: produs.compartimentId, status: "ACTIVA" } });
    if (!lista) {
      lista = await tx.listaPret.create({
        data: {
          compartimentId: produs.compartimentId,
          denumire: "Prețuri manuale",
          valabilaDeLa: new Date(),
          sursa: "manual",
          status: "ACTIVA",
          activataLa: new Date(),
          creataDeId: utilizator.id,
        },
      });
      await tx.jurnalIntrare.create({
        data: { utilizatorId: utilizator.id, numeUtilizatorLaMoment: utilizator.nume, entitate: "ListaPret", entitateId: lista.id, actiune: "creare_manual", valoareDupa: "Prețuri manuale (activă)" },
      });
    }

    const existent = await tx.pretListaProdus.findUnique({ where: { listaPretId_produsId: { listaPretId: lista.id, produsId } } });
    const rand = existent
      ? await tx.pretListaProdus.update({ where: { id: existent.id }, data: { pret, observatie: "manual" } })
      : await tx.pretListaProdus.create({ data: { listaPretId: lista.id, produsId, pret, observatie: "manual" } });

    await tx.jurnalIntrare.create({
      data: {
        utilizatorId: utilizator.id,
        numeUtilizatorLaMoment: utilizator.nume,
        entitate: "Produs",
        entitateId: produsId,
        actiune: "pret_manual",
        camp: "pretBaza",
        valoareInainte: existent ? existent.pret.toString() : null,
        valoareDupa: String(pret),
      },
    });
    return { lista, pret: rand };
  });
}

export async function istoricPreturi(produsId: string) {
  const randuri = await prisma.pretListaProdus.findMany({
    where: { produsId },
    include: { listaPret: { select: { id: true, denumire: true, status: true, valabilaDeLa: true, activataLa: true } } },
    orderBy: { listaPret: { valabilaDeLa: "desc" } },
  });
  return randuri.map((r) => ({
    listaPretId: r.listaPretId,
    lista: r.listaPret.denumire,
    status: r.listaPret.status,
    valabilaDeLa: r.listaPret.valabilaDeLa,
    pret: r.pret.toNumber(),
    observatie: r.observatie,
  }));
}
