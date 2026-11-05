// S20: corectie de date cu jurnal pentru comenzile din oferta mai vechi: contul alocat si
// clientul din oferta, comisionul copiat din oferta, avansul ca incasare propusa.
//
//   npm run date:comenzi                arata ce s-ar completa (nimic scris)
//   npm run date:comenzi -- --aplica    scrie, cu cate o intrare in jurnal pe camp
//
// Ruleaza pe baza din DATABASE_URL (cea de lucru). Idempotent.
import { config as incarcaEnv } from "dotenv";

incarcaEnv();
const { prisma } = await import("../src/db/prisma.js");
const { corecteazaComenzile } = await import("../src/modules/com/corectieComenzi.js");

const aplica = process.argv.includes("--aplica");
const admin = await prisma.utilizator.findFirst({ where: { rol: "ADMIN_GENERAL" }, orderBy: { createdAt: "asc" } });
const utilizator = admin ? { id: admin.id, nume: `${admin.nume} (corecție de date S20)` } : { id: null, nume: "sistem (corecție de date S20)" };

try {
  const r = await corecteazaComenzile({ utilizator, aplica });
  console.log(`Comenzi din ofertă verificate: ${r.verificate}. ${aplica ? "Completate acum" : "De completat (rulează cu --aplica)"}: cont alocat ${r.contAlocat} · client ${r.client} · comision ${r.comision} · avans propus ${r.avansPropus}.`);
} finally {
  await prisma.$disconnect();
}
