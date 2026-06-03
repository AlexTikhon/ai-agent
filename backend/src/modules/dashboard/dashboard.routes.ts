import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { DashboardRepository } from "./dashboard.repository";
import { DashboardService } from "./dashboard.service";
import { DashboardController } from "./dashboard.controller";

const repo = new DashboardRepository();
const service = new DashboardService(repo);
const controller = new DashboardController(service);

export const dashboardRouter = Router();

dashboardRouter.use(authMiddleware);
dashboardRouter.get("/widgets", controller.widgets);
dashboardRouter.get("/layout", controller.getLayout);
dashboardRouter.put("/layout", controller.saveLayout);
