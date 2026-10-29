import zlib from "node:zlib";

// Arhiva zip a unui fisier .xlsm, citita si rescrisa fara biblioteca (S16b,
// FORMULAR-BILKA-HARTA §7): intrarile care nu se modifica se copiaza octet cu
// octet (antetul local + datele comprimate + intrarea din directorul central,
// cu offset-urile recalculate); cele inlocuite se comprima din nou (deflate).
// Asa proiectul VBA (xl/vbaProject.bin), stilurile, sirurile partajate si tot
// restul raman identice cu sablonul - verificabil prin hash.

export interface IntrareZip {
  nume: string;
  metoda: number;
  flags: number;
  crc: number;
  marimeComprimata: number;
  marimeNecomprimata: number;
  // offsetul antetului local in arhiva originala si lungimea lui
  offsetLocal: number;
  // intrarea din directorul central, octet cu octet
  central: Buffer;
}

const SEMN_LOCAL = 0x04034b50;
const SEMN_CENTRAL = 0x02014b50;
const SEMN_EOCD = 0x06054b50;
const SEMN_DESCRIPTOR = 0x08074b50;

export class EroareZip extends Error {}

export function citesteIntrari(buf: Buffer): IntrareZip[] {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0 || buf.readUInt32LE(eocd) !== SEMN_EOCD) throw new EroareZip("Fișierul nu este o arhivă zip (lipsește directorul central)");
  const numar = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const intrari: IntrareZip[] = [];
  for (let i = 0; i < numar; i++) {
    if (buf.readUInt32LE(p) !== SEMN_CENTRAL) throw new EroareZip("Director central zip corupt");
    const nl = buf.readUInt16LE(p + 28);
    const el = buf.readUInt16LE(p + 30);
    const cl = buf.readUInt16LE(p + 32);
    const lungime = 46 + nl + el + cl;
    intrari.push({
      nume: buf.subarray(p + 46, p + 46 + nl).toString("utf8"),
      metoda: buf.readUInt16LE(p + 10),
      flags: buf.readUInt16LE(p + 8),
      crc: buf.readUInt32LE(p + 16),
      marimeComprimata: buf.readUInt32LE(p + 20),
      marimeNecomprimata: buf.readUInt32LE(p + 24),
      offsetLocal: buf.readUInt32LE(p + 42),
      central: Buffer.from(buf.subarray(p, p + lungime)),
    });
    p += lungime;
  }
  return intrari;
}

// lungimea antetului local (variabila: numele si campul extra pot diferi de cele din directorul central)
function lungimeAntetLocal(buf: Buffer, e: IntrareZip): number {
  if (buf.readUInt32LE(e.offsetLocal) !== SEMN_LOCAL) throw new EroareZip(`Antet local zip corupt la ${e.nume}`);
  return 30 + buf.readUInt16LE(e.offsetLocal + 26) + buf.readUInt16LE(e.offsetLocal + 28);
}

// datele comprimate ale unei intrari (fara antet, fara descriptor)
export function dateComprimate(buf: Buffer, e: IntrareZip): Buffer {
  const inceput = e.offsetLocal + lungimeAntetLocal(buf, e);
  return buf.subarray(inceput, inceput + e.marimeComprimata);
}

export function continutIntrare(buf: Buffer, e: IntrareZip): Buffer {
  const date = dateComprimate(buf, e);
  if (e.metoda === 0) return Buffer.from(date);
  if (e.metoda === 8) return zlib.inflateRawSync(date);
  throw new EroareZip(`Metodă de comprimare neacceptată (${e.metoda}) la ${e.nume}`);
}

export function gasesteIntrare(intrari: IntrareZip[], nume: string): IntrareZip | undefined {
  return intrari.find((e) => e.nume === nume);
}

// rescrie arhiva: aceeasi ordine a intrarilor; `inlocuiri` = continutul nou
// (necomprimat) al intrarilor modificate; restul se copiaza octet cu octet
export function rescrieZip(buf: Buffer, intrari: IntrareZip[], inlocuiri: Map<string, Buffer>): Buffer {
  const bucati: Buffer[] = [];
  const centrale: Buffer[] = [];
  let offset = 0;
  for (const e of intrari) {
    const nou = inlocuiri.get(e.nume);
    const lungimeLocal = lungimeAntetLocal(buf, e);
    const antetLocal = Buffer.from(buf.subarray(e.offsetLocal, e.offsetLocal + lungimeLocal));
    const central = Buffer.from(e.central);
    let date: Buffer;
    if (nou === undefined) {
      date = Buffer.from(dateComprimate(buf, e));
      // descriptorul de date (bitul 3), daca exista, se copiaza si el
      if (e.flags & 0x08) {
        const d = e.offsetLocal + lungimeLocal + e.marimeComprimata;
        const cuSemn = buf.readUInt32LE(d) === SEMN_DESCRIPTOR;
        date = Buffer.concat([date, buf.subarray(d, d + (cuSemn ? 16 : 12))]);
      }
    } else {
      // intrarea modificata: deflate, CRC si marimi noi, fara descriptor
      date = Buffer.from(zlib.deflateRawSync(nou, { level: 9 }));
      const crc = zlib.crc32(nou);
      antetLocal.writeUInt16LE(e.flags & ~0x08, 6);
      antetLocal.writeUInt16LE(8, 8);
      antetLocal.writeUInt32LE(crc, 14);
      antetLocal.writeUInt32LE(date.length, 18);
      antetLocal.writeUInt32LE(nou.length, 22);
      central.writeUInt16LE(e.flags & ~0x08, 8);
      central.writeUInt16LE(8, 10);
      central.writeUInt32LE(crc, 16);
      central.writeUInt32LE(date.length, 20);
      central.writeUInt32LE(nou.length, 24);
    }
    central.writeUInt32LE(offset, 42);
    bucati.push(antetLocal, date);
    offset += antetLocal.length + date.length;
    centrale.push(central);
  }
  const director = Buffer.concat(centrale);
  const eocdVechi = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const comentariu = buf.subarray(eocdVechi + 22, eocdVechi + 22 + buf.readUInt16LE(eocdVechi + 20));
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(SEMN_EOCD, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(intrari.length, 8);
  eocd.writeUInt16LE(intrari.length, 10);
  eocd.writeUInt32LE(director.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(comentariu.length, 20);
  return Buffer.concat([...bucati, director, eocd, comentariu]);
}
