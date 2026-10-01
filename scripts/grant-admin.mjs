import { MongoClient } from "mongodb";

const email = process.argv[2]?.trim().toLowerCase();
const role = process.argv[3] === "user" ? "user" : "admin";
if (!email) {
  console.error("Usage: npm run admin:grant -- you@example.com [user]");
  process.exit(1);
}
const client = await new MongoClient(process.env.MONGODB_URI).connect();
const res = await client.db(process.env.MONGODB_DB || "mikon").collection("users").updateOne({ email }, { $set: { role } });
console.log(res.matchedCount ? `${email} is now ${role}. Reload the app to see the change.` : `No user found with ${email}`);
await client.close();
