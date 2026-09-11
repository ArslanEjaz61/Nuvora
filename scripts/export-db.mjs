/**
 * Portable DB migration helper (no mongodump/mongorestore needed).
 * Dumps every non-empty collection in the local "nuvora" DB to canonical
 * EJSON files, so ObjectId/Date fields survive the round-trip intact.
 *
 *   node scripts/export-db.mjs
 */
import { MongoClient } from "mongodb";
import { EJSON } from "bson";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const OUT = resolve(process.cwd(), ".db-export");
mkdirSync(OUT, { recursive: true });

const client = new MongoClient("mongodb://127.0.0.1:27017");
await client.connect();
const db = client.db("nuvora");

const collections = await db.listCollections().toArray();
let total = 0;

for (const { name } of collections) {
  const docs = await db.collection(name).find({}).toArray();
  if (docs.length === 0) continue;
  writeFileSync(resolve(OUT, `${name}.json`), EJSON.stringify(docs));
  console.log(`  ${name}: ${docs.length} docs`);
  total += docs.length;
}

console.log(`\nExported ${total} documents to .db-export/`);
await client.close();
