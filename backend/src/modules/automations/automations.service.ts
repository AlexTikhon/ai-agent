import cron from "node-cron";
import { AutomationsRepository } from "./automations.repository";
import { AutomationScheduler } from "./automations.scheduler";

export class AutomationsService {
  constructor(
    private readonly repo: AutomationsRepository,
    private readonly scheduler: AutomationScheduler
  ) {}

  // Handles create logic.
  async create(userId: string, title: string, cronExpr: string, description?: string) {
    if (!cron.validate(cronExpr)) throw new Error("Invalid cron expression");
    const task = await this.repo.create(userId, title, cronExpr, description);
    this.scheduler.scheduleTask(task.id, userId, task.title, task.cronExpr);
    return task;
  }

  // Handles list logic.
  list(userId: string) {
    return this.repo.list(userId);
  }
}
