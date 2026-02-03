import { db } from "../database.js";
import { users } from "../models/user.js";
import { eq } from "drizzle-orm";
import { SignupInput, LoginInput } from "../schemas/auth.js";
import { settings } from "../config.js";
import { SignJWT, jwtVerify } from "jose";
import { logger } from "../utils/logger.js";

const JWT_ALG = "HS256";

/** Hash password with bcrypt (Bun built-in). */
async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10,
  });
}

/** Verify password. Supports both bcrypt (new) and legacy SHA-256 hashes for migration. */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // New bcrypt hashes start with $2
  if (storedHash.startsWith("$2")) {
    return Bun.password.verify(password, storedHash, "bcrypt");
  }
  // Legacy SHA-256 (no salt) - verify and caller can rehash on next login
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === storedHash;
}

function getJwtSecret(): Uint8Array {
  const secret = settings.jwtSecret;
  if (!secret || secret === "change-me-in-production") {
    logger.warn("AuthService", "Using default JWT_SECRET; set JWT_SECRET in production.");
  }
  return new TextEncoder().encode(secret);
}

function generateToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + settings.jwtExpiresInSeconds)
    .sign(getJwtSecret());
}

async function verifyToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const userId = payload.userId as string;
    const email = payload.email as string;
    if (!userId || !email) return null;
    return { userId, email };
  } catch {
    return null;
  }
}

export class AuthService {
  async signup(data: SignupInput) {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error("User with this email already exists");
    }

    const hashedPassword = await hashPassword(data.password);

    const [user] = await db
      .insert(users)
      .values({
        name: data.name,
        email: data.email,
        password: hashedPassword,
        company: data.company,
        whyUsingPlatform: data.whyUsingPlatform || null,
      })
      .returning();

    const token = await generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company,
        whyUsingPlatform: user.whyUsingPlatform,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  async login(data: LoginInput) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isValid = await verifyPassword(data.password, user.password);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    // Optional: upgrade legacy SHA-256 hash to bcrypt on next login
    if (!user.password.startsWith("$2")) {
      const newHash = await hashPassword(data.password);
      await db.update(users).set({ password: newHash }).where(eq(users.id, user.id));
    }

    const token = await generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company,
        whyUsingPlatform: user.whyUsingPlatform,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  async verifyToken(token: string) {
    const decoded = await verifyToken(token);
    if (!decoded) {
      return null;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      company: user.company,
      whyUsingPlatform: user.whyUsingPlatform,
    };
  }
}
