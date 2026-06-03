declare module "node-cron" {
  export interface ScheduledTask {
    start(): void;
    stop(): void;
    destroy(): void;
  }

  export function schedule(expression: string, callback: () => void | Promise<void>): ScheduledTask;
  export function validate(expression: string): boolean;

  const cron: {
    schedule: typeof schedule;
    validate: typeof validate;
  };

  export default cron;
}
