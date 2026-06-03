import { Request, Response } from "express";
import { z } from "zod";
import { AuthService } from "./auth.service";

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

export class AuthController {
  // Handles constructor logic.
  constructor(private readonly service: AuthService) {}

  // Handles register logic.
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = registerSchema.parse(req.body);
      const payload = await this.service.register(body.email, body.name, body.password);
      res.status(201).json(payload);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  };

  // Handles login logic.
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = loginSchema.parse(req.body);
      const payload = await this.service.login(body.email, body.password);
      res.json(payload);
    } catch (error) {
      res.status(401).json({ message: (error as Error).message });
    }
  };

  // Handles refresh logic.
  refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = refreshSchema.parse(req.body);
      const payload = await this.service.refresh(body.refreshToken);
      res.json(payload);
    } catch (error) {
      res.status(401).json({ message: (error as Error).message });
    }
  };

  // Handles me logic.
  me = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const payload = await this.service.me(req.user.userId);
      res.json(payload);
    } catch (error) {
      res.status(404).json({ message: (error as Error).message });
    }
  };
}
