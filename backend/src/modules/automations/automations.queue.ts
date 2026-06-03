import { Queue, Worker, type ConnectionOptions } from "bullmq";
import { redis } from "../../lib/redis";
import { wsGateway } from "../../ws/gateway";
import { AutomationsRepository } from "./automations.repository";

const queueName = "automations";
const queueConnection = redis as unknown as ConnectionOptions;

export const automationsQueue = new Queue(queueName, {
  connection: queueConnection
});

// Handles startAutomationWorker logic.
export const startAutomationWorker = (repo: AutomationsRepository): Worker =>
  new Worker(
    queueName,
    async (job) => {
      const { taskId, userId, title } = job.data as { taskId: string; userId: string; title: string };
      await repo.markLastRun(taskId);
      wsGateway.sendToUser(userId, {
        type: "automation:executed",
        taskId,
        title,
        at: new Date().toISOString()
      });
    },
    { connection: queueConnection }
  );
