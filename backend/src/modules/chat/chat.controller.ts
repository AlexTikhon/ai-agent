import { Request, Response } from "express";
import { z } from "zod";
import { ChatService } from "./chat.service";

const sendMessageSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1)
});

export class ChatController {
  // Handles constructor logic.
  constructor(private readonly service: ChatService) {}

  // Handles listSessions logic.
  listSessions = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const data = await this.service.listSessions(req.user.userId);
    res.json(data);
  };

  // Handles listMessages logic.
  listMessages = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const data = await this.service.listSessionMessages(req.user.userId, req.params.sessionId);
    res.json(data);
  };

  // Handles sendMessage logic.
  sendMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const body = sendMessageSchema.parse(req.body);
      const reply = await this.service.sendMessage(req.user.userId, body.sessionId, body.message);
      res.status(201).json({ reply });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  };
}
