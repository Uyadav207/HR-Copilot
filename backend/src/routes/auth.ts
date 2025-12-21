import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { AuthService } from "../services/authService.js";
import { SignupSchema, LoginSchema } from "../schemas/auth.js";

const auth = new Hono();
const authService = new AuthService();

auth.post("/auth/signup", zValidator("json", SignupSchema), async (c) => {
  try {
    const data = c.req.valid("json");
    console.log("📝 Signup request received:", { 
      email: data.email, 
      name: data.name,
      company: data.company,
      whyUsingPlatform: data.whyUsingPlatform ? "provided" : "not provided"
    });
    const result = await authService.signup(data);
    console.log("✅ Signup successful for:", data.email);
    return c.json({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        company: result.user.company,
        why_using_platform: result.user.whyUsingPlatform,
        created_at: result.user.createdAt,
      },
      token: result.token,
    }, 201);
  } catch (error: any) {
    console.error("❌ Signup error:", error);
    const errorMessage = error.message || "Failed to sign up";
    return c.json({ 
      error: errorMessage
    }, 400);
  }
});

auth.post("/auth/login", zValidator("json", LoginSchema), async (c) => {
  try {
    const data = c.req.valid("json");
    const result = await authService.login(data);
    return c.json({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        company: result.user.company,
        why_using_platform: result.user.whyUsingPlatform,
        created_at: result.user.createdAt,
      },
      token: result.token,
    });
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to login" }, 401);
  }
});

auth.get("/auth/me", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.substring(7);
    const user = await authService.verifyToken(token);

    if (!user) {
      return c.json({ error: "Invalid or expired token" }, 401);
    }

    return c.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company,
        why_using_platform: user.whyUsingPlatform,
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to verify token" }, 401);
  }
});

export default auth;

