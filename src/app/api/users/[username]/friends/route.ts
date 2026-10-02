import type { NextRequest } from "next/server";
import { handler, requireUser } from "@/lib/server/http";
import { canSee, cardsFor, findByUsername, friendIds, relation } from "@/lib/server/social";
import { DEFAULT_PRIVACY } from "@/lib/server/users";

type Ctx = { params: Promise<{ username: string }> };

export const GET = handler(async (req: NextRequest, { params }: Ctx) => {
  const me = await requireUser(req);
  const user = await findByUsername((await params).username.toLowerCase());
  const id = user._id.toHexString();
  const rel = await relation(me, id);
  if (!canSee({ ...DEFAULT_PRIVACY, ...user.privacy }.profile, rel)) return Response.json({ locked: true, friends: [] });
  const [theirs, mine] = await Promise.all([friendIds(id), friendIds(me)]);
  const cards = await cardsFor(theirs.slice(0, 300));
  const mutual = new Set(mine);
  return Response.json({
    locked: false,
    friends: theirs.flatMap((f) => {
      const c = cards.get(f);
      return c ? [{ ...c, mutual: mutual.has(f), self: f === me }] : [];
    }),
  });
});
