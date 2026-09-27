/**
 * Loads the exercise library into MongoDB. Safe to run repeatedly: entries are upserted by id.
 * Run: npm run db:seed
 */
import { readFile } from "node:fs/promises";
import { MongoClient } from "mongodb";

const { MONGODB_URI, MONGODB_DB } = process.env;
if (!MONGODB_URI || !MONGODB_DB) throw new Error("Set MONGODB_URI and MONGODB_DB in .env.local");

const { exercises } = JSON.parse(await readFile(new URL("./data/exercises.json", import.meta.url), "utf8"));
const client = await new MongoClient(MONGODB_URI).connect();
const col = client.db(MONGODB_DB).collection("exercises");

await col.createIndex({ id: 1 }, { unique: true });
const result = await col.bulkWrite(
  exercises.map((e) => ({ replaceOne: { filter: { id: e.id }, replacement: e, upsert: true } })),
  { ordered: false },
);
const ids = exercises.map((e) => e.id);
const removed = await col.deleteMany({ id: { $nin: ids } });

console.log(`exercises: ${exercises.length} total, ${result.upsertedCount} added, ${result.modifiedCount} updated, ${removed.deletedCount} removed`);
await client.close();
