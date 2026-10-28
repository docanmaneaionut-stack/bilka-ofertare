export { calculeazaOferta } from "./calcul.js";
export * from "./tipuri.js";
export {
  normalizeazaUm,
  mpDinPanotaj,
  mlDinPozitii,
  bucatiSipca,
  calculeazaInvelitoare,
  calculeazaSipca,
  calculeazaCantitati,
  verificaComandabil,
  avertizariDripstop,
  MP_MINIM_DRIPSTOP,
} from "./cantitati.js";
export { impacheteaza, numeModel, numarRal, finisajScurt, cheieInvelitoare, aceeasiCheie } from "./pachete.js";
export {
  achizitieLinie,
  totaluriAchizitie,
  calculeazaTinta,
  documentDinTinta,
  tvaDinNet,
  totalLeiDocument,
  achizitieRealaLaCursulDocumentului,
  verificaGarda,
  randVanzari,
  randVanzariColaborator,
  procentCaFactor,
} from "./preturi.js";
export { prezinta, pretFixNormalizat, gasesteTotalLista, repartizeazaRest } from "./prezentare.js";
export { calculeazaZonaB } from "./zonaB.js";
export { agregaLucrare, esteCompletare } from "./lucrare.js";
export { construiesteVarianta, liniiLegateDeInvelitoare } from "./varianta.js";
export type { Inlocuiri } from "./varianta.js";
export { preiaPreturi, renuntaLaPreluare, adaosuriPeRubrica } from "./preluare.js";
export { construiesteIntrare, coduriEtalon, latimeTotalaDinCatalog } from "./etalon.js";
export type { CatalogPentruEtalon, FisierEtalon, ProdusCatalogEtalon, IntrariEtalon, LinieEtalon, InvelitoareEtalon } from "./etalon.js";
export {
  Zecimal,
  z,
  rotunjeste,
  la2,
  la3,
  la4,
  cursAchizitie,
  eurInLei,
  leiInEur,
  cuTva,
  faraTva,
  desparteTva,
  factorTva,
  formateazaCantitate,
  esteUmCuZecimale,
  suma,
  FACTOR_CURS_ACHIZITIE,
} from "./zecimal.js";
export type { Suma } from "./zecimal.js";
