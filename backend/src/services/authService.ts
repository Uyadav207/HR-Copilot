import { db } from "../database.js";
import { users } from "../models/user.js";
import { eq } from "drizzle-orm";
import { SignupInput, LoginInput } from "../schemas/auth.js";

// Simple password hashing using Bun's built-in crypto
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const hashed = await hashPassword(password);
  return hashed === hashedPassword;
}

// Simple JWT implementation (for production, use a proper JWT library)
function generateToken(userId: string, email: string): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    userId,
    email,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
  }));
  const signature = btoa(`${header}.${payload}.secret`); // In production, use a proper secret
  return `${header}.${payload}.${signature}`;
}

function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return {
      userId: payload.userId,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

export class AuthService {
  async signup(data: SignupInput) {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user
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

    // Generate token
    const token = generateToken(user.id, user.email);

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
    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isValid = await verifyPassword(data.password, user.password);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    // Generate token
    const token = generateToken(user.id, user.email);

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
    const decoded = verifyToken(token);
    if (!decoded) {
      return null;
    }

    // Verify user still exists
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

