import { ObjectId } from "mongodb";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError, UTApi } from "uploadthing/server";
import { env } from "@/lib/server/env";
import { rateLimit } from "@/lib/server/http";
import { SESSION_COOKIE, verifySession } from "@/lib/server/session";
import { users } from "@/lib/server/users";

const f = createUploadthing();

export const uploadRouter = {
  avatar: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const userId = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, env.JWT_SECRET);
      if (!userId) throw new UploadThingError("Not signed in");
      await rateLimit(`avatar:${userId}`, 12, 3600).catch(() => {
        throw new UploadThingError("Too many uploads, try again later");
      });
      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const col = await users();
      const _id = new ObjectId(metadata.userId);
      const prev = await col.findOne({ _id }, { projection: { avatarKey: 1 } });
      await col.updateOne({ _id }, { $set: { avatarUrl: file.ufsUrl, avatarKey: file.key } });
      if (prev?.avatarKey) await new UTApi().deleteFiles(prev.avatarKey).catch(() => null);
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
