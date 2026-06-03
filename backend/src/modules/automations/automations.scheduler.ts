import cron, { ScheduledTask } from "node-cron";
import { automationsQueue } from "./automations.queue";
import { AutomationsRepository } from "./automations.repository";

const runningJobs = new Map<string, ScheduledTask>();

export class AutomationScheduler {
  // Handles constructor logic.
  constructor(private readonly repo: AutomationsRepository) {}

  // Handles bootstrap logic.
  async bootstrap() {
    const tasks = await this.repo.listAllEnabled();
    for (const task of tasks) {
      this.scheduleTask(task.id, task.userId, task.title, task.cronExpr);
    }
  }

  // Handles scheduleTask logic.
  scheduleTask(taskId: string, userId: string, title: string, cronExpr: string) {
    const existing = runningJobs.get(taskId);
    if (existing) existing.stop();

    const job = cron.schedule(cronExpr, async () => {
      await automationsQueue.add(`task-${taskId}-${Date.now()}`, { taskId, userId, title });
    });

    runningJobs.set(taskId, job);
  }
}
