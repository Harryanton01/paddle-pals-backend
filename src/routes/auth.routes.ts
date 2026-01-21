import { Hono } from "hono";
import * as authController from "../controllers/auth.controller";
import { protect } from "../middlewares/auth.middleware";
import { 
  validate, 
  registerSchema, 
  loginSchema 
} from "../middlewares/validate.middleware";

const auth = new Hono();

auth.post(
  "/register", 
  validate("json", registerSchema), 
  authController.register
);

auth.post(
  "/login", 
  validate("json", loginSchema), 
  authController.login
);

auth.get("/me", protect, authController.getMe);

auth.post("/logout", protect, authController.logout);

export default auth;