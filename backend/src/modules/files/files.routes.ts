import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middleware/auth";
import { FilesRepository } from "./files.repository";
import { FilesService } from "./files.service";
import { FilesController } from "./files.controller";

const upload = multer({ storage: multer.memoryStorage() });
const repo = new FilesRepository();
const service = new FilesService(repo);
const controller = new FilesController(service);

export const filesRouter = Router();

filesRouter.use(authMiddleware);
filesRouter.post("/upload", upload.single("file"), controller.upload);
filesRouter.get("/", controller.list);
filesRouter.get("/search", controller.search);
