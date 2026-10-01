import "server-only";
import { MongoClient, type Db } from "mongodb";
import { env } from "./env";

const globalForMongo = globalThis as unknown as { mongo?: Promise<MongoClient>; indexed?: Promise<void> };

function client() {
  globalForMongo.mongo ??= new MongoClient(env.MONGODB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 }).connect();
  return globalForMongo.mongo;
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ username: 1 }, { unique: true, partialFilterExpression: { username: { $type: "string" } } }),
    db.collection("logs").createIndex({ userId: 1, id: 1 }, { unique: true }),
    db.collection("measurements").createIndex({ userId: 1, id: 1 }, { unique: true }),
    db.collection("measurements").createIndex({ userId: 1, metric: 1, date: -1 }),
    db.collection("logs").createIndex({ userId: 1, exerciseIds: 1, date: 1 }),
    db.collection("friendships").createIndex({ pair: 1 }, { unique: true }),
    db.collection("friendships").createIndex({ users: 1, status: 1 }),
    db.collection("notifications").createIndex({ userId: 1, createdAt: -1 }),
    db.collection("notifications").createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }),
    db.collection("push_subscriptions").createIndex({ endpoint: 1 }, { unique: true }),
    db.collection("push_subscriptions").createIndex({ userId: 1 }),
    db.collection("shares").createIndex({ to: 1, createdAt: -1 }),
    db.collection("request_logs").createIndex({ ts: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 14 }),
    db.collection("request_logs").createIndex({ status: 1, ts: -1 }),
    db.collection("user_days").createIndex({ userId: 1, day: 1 }, { unique: true }),
    db.collection("user_days").createIndex({ day: 1 }),
    db.collection("feedback").createIndex({ createdAt: -1 }),
    db.collection("announcements").createIndex({ active: 1, createdAt: -1 }),
    db.collection("password_resets").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("password_resets").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("profiles").createIndex({ userId: 1 }, { unique: true }),
    db.collection("programs").createIndex({ userId: 1, id: 1 }, { unique: true }),
    db.collection("custom_exercises").createIndex({ userId: 1, id: 1 }, { unique: true }),
    db.collection("exercises").createIndex({ id: 1 }, { unique: true }),
    db.collection("rate_limits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}

export async function getDb() {
  const db = (await client()).db(env.MONGODB_DB);
  globalForMongo.indexed ??= ensureIndexes(db);
  await globalForMongo.indexed;
  return db;
}
