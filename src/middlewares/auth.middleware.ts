import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import { HTTPException } from "hono/http-exception";

type Env = {
  Variables: {
    user: {
      id: number;
      username: string;
    };
  };
};

export const protect = createMiddleware<Env>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader) {
    throw new HTTPException(401, {
      message: "Unauthorized: No token provided",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = await verify(
      token,
      process.env.JWT_SECRET || "fallback_secret",
      "HS256"
    );

    c.set("user", {
      id: Number(payload.id),
      username: String(payload.username),
    });

    await next();
  } catch (err) {
    throw new HTTPException(401, { message: "Unauthorized: Invalid token" });
  }
});
