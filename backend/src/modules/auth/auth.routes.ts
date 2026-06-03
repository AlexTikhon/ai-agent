import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { loginRateLimiter, registerRateLimiter } from "../../middleware/rateLimit";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";

const repo = new AuthRepository();
const service = new AuthService(repo);
const controller = new AuthController(service);

export const authRouter = Router();

authRouter.post("/register", registerRateLimiter, controller.register);
authRouter.post("/login", loginRateLimiter, controller.login);
authRouter.post("/refresh", controller.refresh);
authRouter.get("/me", authMiddleware, controller.me);
