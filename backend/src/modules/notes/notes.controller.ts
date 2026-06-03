import { Request, Response } from "express";
import { z } from "zod";
import { NotesService } from "./notes.service";

const createNoteSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1)
});

const updateNoteSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1)
});

export class NotesController {
  // Handles constructor logic.
  constructor(private readonly service: NotesService) {}

  // Handles create logic.
  create = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const body = createNoteSchema.parse(req.body);
      const note = await this.service.create(req.user.userId, body.title, body.content);
      res.status(201).json(note);
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
    const notes = await this.service.list(req.user.userId);
    res.json(notes);
  };

  // Handles update logic.
  update = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const body = updateNoteSchema.parse(req.body);
      const note = await this.service.update(req.user.userId, req.params.id, body.title, body.content);
      res.json(note);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  };

  // Handles remove logic.
  remove = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      await this.service.remove(req.user.userId, req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ message: (error as Error).message });
    }
  };

  // Handles summarize logic.
  summarize = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const payload = await this.service.summarize(req.user.userId, req.params.id);
      res.json(payload);
    } catch (error) {
      res.status(404).json({ message: (error as Error).message });
    }
  };

  // Handles search logic.
  search = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const query = String(req.query.query || "").trim();
      const data = await this.service.semanticSearch(req.user.userId, query);
      res.json(data);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  };
}
