import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes";
import { notesRouter } from "../modules/notes/notes.routes";
import { chatRouter } from "../modules/chat/chat.routes";
import { automationsRouter } from "../modules/automations/automations.routes";
import { filesRouter } from "../modules/files/files.routes";
import { dashboardRouter } from "../modules/dashboard/dashboard.routes";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => res.json({ status: "ok" }));
apiRouter.use("/auth", authRouter);
apiRouter.use("/notes", notesRouter);
apiRouter.use("/chat", chatRouter);
apiRouter.use("/automations", automationsRouter);
apiRouter.use("/files", filesRouter);
apiRouter.use("/dashboard", dashboardRouter);
