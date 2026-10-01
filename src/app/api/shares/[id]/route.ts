import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/server/db";
import { handler, HttpError, requireUser } from "@/lib/server/http";
import { cardsFor } from "@/lib/server/social";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (req: NextRequest, { params }: Ctx) => {
  const me = await requireUser(req);
  const { id } = await params;
  if (!ObjectId.isValid(id)) throw new HttpError(404, "Not found");
  const share = await (await getDb()).collection("shares").findOne({ _id: new ObjectId(id), $or: [{ to: me }, { from: me }] });
  if (!share) throw new HttpError(404, "Not found");
  const cards = await cardsFor([share.from]);
  return Response.json({ from: cards.get(share.from) ?? null, note: share.note, createdAt: share.createdAt, program: share.program });
});
