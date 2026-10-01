import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "mikon_session";

const key = (secret: string) => new TextEncoder().encode(secret);

export type Role = "user" | "admin";

export async function signSession(userId: string, secret: string, ttlDays: number, role: Role = "user") {
  return new SignJWT({ role })
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

export async function sessionIssuedAt(token: string | undefined, secret: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"] });
    return typeof payload.iat === "number" ? payload.iat : null;
  } catch {
    return null;
  }
}

export async function sessionClaims(token: string | undefined, secret: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    return { sub: payload.sub, role: (payload.role === "admin" ? "admin" : "user") as Role, iat: payload.iat ?? 0 };
  } catch {
    return null;
  }
}
export const REF_COOKIE = "mikon_ref";
export const KNOWN_COOKIE = "mikon_known";
