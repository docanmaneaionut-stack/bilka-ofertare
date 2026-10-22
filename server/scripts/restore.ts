import "dotenv/config";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { restaureaza, EroareRestaurare } from "../src/modules/adm/restaurare.js";

// Comanda tehnica: npm run restore -- <cale catre zip>
// Foloseste DATABASE_URL si DATE_DIR din mediu; baza trebuie sa fie goala,
// cu migrarile aplicate (npx prisma migrate deploy).
const caleZip = process.argv[2];
if (!caleZip) {
  console.error("Folosire: npm run restore -- <cale catre zip>");
  process.exit(1);
}

const prisma = new PrismaClient();
const dateDir = process.env.DATE_DIR ?? path.resolve(process.cwd(), "data");

try {
  const raport = await restaureaza(prisma, path.resolve(caleZip), dateDir);
  console.log(`Restaurat din export format ${raport.format} (soft ${raport.versiuneSoft}):`);
  for (const [t, n] of Object.entries(raport.numaratori)) console.log(`  ${t}: ${n}`);
  console.log(`  fisiere: ${raport.fisiere}`);
  for (const a of raport.avertizari) console.log(`  AVERTIZARE: ${a}`);
} catch (e) {
  if (e instanceof EroareRestaurare) console.error(`Refuzat: ${e.message}`);
  else console.error(e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
