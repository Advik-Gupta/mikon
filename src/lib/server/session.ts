import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "mikon_session";

const key = (secret: string) => new TextEncoder().encode(secret);

export async function signSession(userId: string, secret: string, ttlDays: number) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ttlDays}d`)
    .sign(key(secret));
}

export async function verifySession(token: string | undefined, secret: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
