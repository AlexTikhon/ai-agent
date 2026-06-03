import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { AutomationsRepository } from "./automations.repository";
import { AutomationsService } from "./automations.service";
import { AutomationsController } from "./automations.controller";
import { AutomationScheduler } from "./automations.scheduler";
import { startAutomationWorker } from "./automations.queue";

const repo = new AutomationsRepository();
const scheduler = new AutomationScheduler(repo);
const service = new AutomationsService(repo, scheduler);
const controller = new AutomationsController(service);

startAutomationWorker(repo);
scheduler.bootstrap().catch((e) => console.error("Scheduler bootstrap failed", e));

export const automationsRouter = Router();

automationsRouter.use(authMiddleware);
automationsRouter.post("/", controller.create);
automationsRouter.get("/", controller.list);
