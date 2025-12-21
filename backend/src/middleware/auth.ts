import { Context, Next } from "hono";
import { AuthService } from "../services/authService.js";

const authService = new AuthService();

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.substring(7);
  const user = await authService.verifyToken(token);

  if (!user) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  // Attach user to context
  c.set("user", user);

  await next();
}

