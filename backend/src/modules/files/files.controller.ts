import { Request, Response } from "express";
import { FilesService } from "./files.service";

export class FilesController {
  // Handles constructor logic.
  constructor(private readonly service: FilesService) {}

  // Handles upload logic.
  upload = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const file = req.file;
      if (!file) {
        res.status(400).json({ message: "File is required" });
        return;
      }
      if (file.mimetype !== "application/pdf") {
        res.status(400).json({ message: "Only PDF files are allowed" });
        return;
      }
      const saved = await this.service.uploadPdf(
        req.user.userId,
        file.originalname,
        file.mimetype,
        file.buffer
      );
      res.status(201).json(saved);
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
    const files = await this.service.list(req.user.userId);
    res.json(files);
  };

  // Handles search logic.
  search = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const query = String(req.query.query || "");
      const data = await this.service.searchSimilar(req.user.userId, query);
      res.json(data);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  };
}
