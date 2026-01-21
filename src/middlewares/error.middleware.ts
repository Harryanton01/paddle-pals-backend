import { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";

export const errorHandler = (err: Error, c: Context) => {
  console.error(`❌ Error: ${err.message}`);

  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  if ((err as any).code === 'P2002') {
    return c.json({ error: "Unique constraint failed (e.g. username already taken)" }, 409);
  }

  return c.json({ 
    error: "Internal Server Error",
    details: process.env.NODE_ENV === "development" ? err.message : undefined 
  }, 500);
};