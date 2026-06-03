import { Request, Response } from "express";
import { DashboardService } from "./dashboard.service";

export class DashboardController {
  // Handles constructor logic.
  constructor(private readonly service: DashboardService) {}

  // Handles widgets logic.
  widgets = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const data = await this.service.widgets(req.user.userId);
    res.json(data);
  };

  // Handles getLayout logic.
  getLayout = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const layout = await this.service.getLayout(req.user.userId);
    res.json({ layout });
  };

  // Handles saveLayout logic.
  saveLayout = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const saved = await this.service.saveLayout(req.user.userId, req.body.layout);
    res.json(saved);
  };
}
