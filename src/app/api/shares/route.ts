import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDb } from "@/lib/server/db";
import { assertSameOrigin, handler, HttpError, ID, rateLimit, readJson, requireUser } from "@/lib/server/http";
import { friendIds, notify } from "@/lib/server/social";
import { findUser } from "@/lib/server/users";

export const POST = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const me = await requireUser(req);
  await rateLimit(`share:${me}`, 30, 3600);
  const { programId, to, note } = await readJson(
    req,
    z.object({ programId: z.string().regex(ID), to: z.array(z.string().regex(/^[a-f0-9]{24}$/)).min(1).max(50), note: z.string().trim().max(280).default("") }),
  );
  const db = await getDb();
  const [doc, friends, actor] = await Promise.all([db.collection("programs").findOne({ userId: me, id: programId }), friendIds(me), findUser(me)]);
  if (!doc || !actor) throw new HttpError(404, "Program not found");
  const recipients = to.filter((id) => friends.includes(id));
  if (!recipients.length) throw new HttpError(400, "You can only share with friends");
  const program = { ...doc.data, activeFrom: null, visibility: "private" };
  const shares = recipients.map((id) => ({ _id: new ObjectId(), from: me, to: id, program, note, createdAt: new Date() }));
  await db.collection("shares").insertMany(shares);
  await Promise.all(
    shares.map((s) =>
      notify(s.to, actor, "program_shared", {
        title: `${actor.name} shared a program with you`,
        body: note || `"${program.name}". Take a look and save a copy if you like it.`,
        url: `/shared/${s._id.toHexString()}`,
      }),
    ),
  );
  return Response.json({ sent: recipients.length });
});
