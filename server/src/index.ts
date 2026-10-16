import { creeazaApp } from "./app.js";
import { env } from "./env.js";

const app = creeazaApp();

app.listen(env.port, () => {
  console.log(`Server pornit pe portul ${env.port}`);
});
