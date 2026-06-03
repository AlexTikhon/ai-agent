import { Request, Response } from "express";
import { z } from "zod";
import { AutomationsService } from "./automations.service";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  cronExpr: z.string().min(1)
});

export class AutomationsController {
  // Handles constructor logic.
  constructor(private readonly service: AutomationsService) {}

  // Handles create logic.
  create = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const body = createSchema.parse(req.body);
      const task = await this.service.create(
        req.user.userId,
        body.title,
        body.cronExpr,
        body.description
      );
      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  };

  // Handles list logic.
  list = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const data = await this.service.list(req.user.userId);
    res.json(data);
  };
}
