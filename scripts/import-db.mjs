/**
 * Counterpart to export-db.mjs — loads the exported EJSON into the server's
 * local "nuvora" database, with ObjectId/Date fields correctly revived.
 * Skips ephemeral carts (guest sessions from dev don't belong in production).
 *
 *   node scripts/import-db.mjs
 */
import { MongoClient } from "mongodb";
import { EJSON } from "bson";
import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve } from "path";

const DIR = resolve(process.cwd(), ".db-export");
if (!existsSync(DIR)) {
  console.error("No .db-export directory found.");
  process.exit(1);
}

const SKIP = new Set(["carts"]);

const client = new MongoClient("mongodb://127.0.0.1:27017");
await client.connect();
const db = client.db("nuvora");

for (const file of readdirSync(DIR)) {
  if (!file.endsWith(".json")) continue;
  const name = file.replace(/\.json$/, "");
  if (SKIP.has(name)) {
    console.log(`  ${name}: skipped (ephemeral)`);
    continue;
  }

  const docs = EJSON.parse(readFileSync(resolve(DIR, file), "utf8"));

  await db.collection(name).deleteMany({});
  if (docs.length > 0) {
    await db.collection(name).insertMany(docs, { ordered: false });
  }
  console.log(`  ${name}: ${docs.length} docs imported`);
}

console.log("\nImport complete.");
await client.close();
