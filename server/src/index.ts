import { creeazaApp } from "./app.js";
import { env } from "./env.js";
import { pornestePlanificatorCurs } from "./modules/curs/serviciu.js";

const app = creeazaApp();

app.listen(env.port, () => {
  console.log(`Server pornit pe portul ${env.port}`);
  // cursul BNR: la pornire si zilnic dupa 13:00 (FISA-OFERTARE 11.8)
  pornestePlanificatorCurs();
});
