import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { ChatRepository } from "./chat.repository";
import { ChatService } from "./chat.service";
import { ChatController } from "./chat.controller";
import { registerChatWs } from "./chat.ws";

const repo = new ChatRepository();
const service = new ChatService(repo);
const controller = new ChatController(service);
registerChatWs(service);

export const chatRouter = Router();

chatRouter.use(authMiddleware);
chatRouter.get("/sessions", controller.listSessions);
chatRouter.get("/sessions/:sessionId/messages", controller.listMessages);
chatRouter.post("/messages", controller.sendMessage);
