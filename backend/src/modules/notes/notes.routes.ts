import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { NotesRepository } from "./notes.repository";
import { NotesService } from "./notes.service";
import { NotesController } from "./notes.controller";

const repo = new NotesRepository();
const service = new NotesService(repo);
const controller = new NotesController(service);

export const notesRouter = Router();

notesRouter.use(authMiddleware);
notesRouter.post("/", controller.create);
notesRouter.get("/", controller.list);
notesRouter.get("/search", controller.search);
notesRouter.patch("/:id", controller.update);
notesRouter.delete("/:id", controller.remove);
notesRouter.post("/:id/summarize", controller.summarize);
