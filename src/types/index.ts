import { Context } from "hono";
import { z } from "zod";

export type AppEnv = {
  Variables: {
    user: {
      id: number;
      username: string;
    };
  };
};

export type ValidatedContext<
  T extends z.ZodTypeAny, 
  Target extends 'json' | 'query' | 'param' | 'form' = 'json'
> = Context<AppEnv, any, {
    out: { [K in Target]: z.infer<T> }
}>;