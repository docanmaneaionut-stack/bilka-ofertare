// S17d: aduce campul `activ` al produselor la CSV-urile din docs/import/Bilka, ca
// corectie de date cu jurnal (nimic sters, nicio versiune noua de preturi).
//
//   npm run date:activ                 arata ce s-ar schimba (nimic scris)
//   npm run date:activ -- --aplica     dezactiveaza produsele marcate inactive in CSV, cu jurnal
//
// Ruleaza pe baza din DATABASE_URL (cea de lucru). Produsele active in CSV dar inactive in
// baza se raporteaza doar.
import { config as incarcaEnv } from "dotenv";

incarcaEnv();
const { prisma } = await import("../src/db/prisma.js");
const { sincronizeazaActiv } = await import("../src/modules/imp/sincronizareActiv.js");

const aplica = process.argv.includes("--aplica");
const admin = await prisma.utilizator.findFirst({ where: { rol: "ADMIN_GENERAL" }, orderBy: { createdAt: "asc" } });
const utilizator = admin ? { id: admin.id, nume: `${admin.nume} (sincronizare CSV)` } : { id: null, nume: "sistem (sincronizare CSV)" };

try {
  const r = await sincronizeazaActiv({ utilizator, aplica });
  console.log(`Fișiere: ${r.fisiere.length}; produse în CSV: ${r.produseInCsv}; inactive în CSV: ${r.inactiveInCsv}.`);
  console.log(`${aplica ? "Dezactivate acum" : "De dezactivat (rulează cu --aplica)"}: ${r.dezactivate.length}`);
  for (const p of r.dezactivate) console.log(`  - ${p.codFurnizor ?? p.codIntern} · ${p.denumire}`);
  if (r.deActivatInCsv.length > 0) {
    console.log(`Active în CSV, dar inactive în bază (doar raportate): ${r.deActivatInCsv.length}`);
    for (const p of r.deActivatInCsv) console.log(`  - ${p.codFurnizor ?? p.codIntern} · ${p.denumire}`);
  }
  if (r.necunoscute.length > 0) console.log(`Inactive în CSV, inexistente în bază: ${r.necunoscute.length}`);
} finally {
  await prisma.$disconnect();
}
