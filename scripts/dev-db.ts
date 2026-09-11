/**
 * Local-only MongoDB. Boots an on-disk instance via mongodb-memory-server so
 * development needs no MongoDB install, and keeps data in .mongo-data between
 * runs. Production points MONGODB_URI at Atlas instead.
 *
 *   npm run db
 */
import { mkdirSync } from "fs";
import { resolve } from "path";
import { MongoMemoryServer } from "mongodb-memory-server";

const DB_PATH = resolve(process.cwd(), ".mongo-data");
const PORT = 27017;

async function main() {
  mkdirSync(DB_PATH, { recursive: true });

  const server = await MongoMemoryServer.create({
    instance: {
      port: PORT,
      dbPath: DB_PATH,
      storageEngine: "wiredTiger",
      dbName: "nuvora",
    },
  });

  console.log(`\n  MongoDB running at ${server.getUri("nuvora")}`);
  console.log(`  Data directory: ${DB_PATH}`);
  console.log("  Leave this running, then start the app with `npm run dev`.\n");

  const shutdown = async () => {
    await server.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("Failed to start local MongoDB:", error);
  process.exit(1);
});
