import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATABASE_BASE, validaDatabase } from '../src/game/database.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2] ? path.resolve(process.argv[2]) : null;
const database = file ? JSON.parse(fs.readFileSync(file, 'utf8')) : DATABASE_BASE;
const errori = validaDatabase(database);
if (errori.length) {
  console.error(`Database non valido (${file || 'catalogo modulare'}):`);
  errori.forEach((errore) => console.error(`- ${errore}`));
  process.exit(1);
}
console.log(`Database valido: ${database.nome} (${database.paesi.length} paesi, ${database.competizioni.length} competizioni, ${(database.club || []).length} club manuali, ${(database.giocatori || []).length} giocatori manuali).`);
